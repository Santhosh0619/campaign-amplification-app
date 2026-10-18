import { Router } from 'express';
import { z } from 'zod';
import { estimateReach } from '../../config/rules.js';
import { db } from '../../db/index.js';
import { notFound, parse, wrap } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import type { Campaign, Contribution, Report, User } from '../../types/domain.js';
import { toCard } from '../campaigns/campaign.view.js';

export const meRouter = Router();
export const publicProfileRouter = Router();

const DAY = 86_400_000;

function rangeStart(range: string): number {
  const now = new Date();
  switch (range) {
    case '30':
      return Date.now() - 30 * DAY;
    case '90':
      return Date.now() - 90 * DAY;
    case '365':
      return Date.now() - 365 * DAY;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    default:
      return 0;
  }
}

async function impactFor(userId: string, range: string) {
  const since = rangeStart(range);
  const campaigns = new Map((await db.list<Campaign>('campaigns')).map((c) => [c.id, c]));
  const reports = await db.list<Report>('reports');
  const backed = (await db.list<Contribution>('contributions')).filter(
    (c) => c.userId === userId && c.status === 'succeeded' && new Date(c.createdAt).getTime() >= since,
  );

  const totalContributed = backed.reduce((s, c) => s + c.amount, 0);
  const estimatedReach = backed.reduce((s, c) => s + estimateReach(c.amount), 0);

  let actions = 0;
  const shifts: number[] = [];
  for (const c of backed) {
    const camp = campaigns.get(c.campaignId);
    const final = reports.find((r) => r.campaignId === c.campaignId && r.kind === 'final');
    if (camp && final?.metrics && camp.raisedAmount > 0) {
      actions += Math.round((c.amount / camp.raisedAmount) * final.metrics.clicks);
      if (final.metrics.perceptionShiftPct != null) shifts.push(final.metrics.perceptionShiftPct);
    }
  }
  const mine = [...campaigns.values()].filter((c) => c.creatorId === userId);
  return {
    range,
    backed: {
      count: new Set(backed.map((c) => c.campaignId)).size,
      contributions: backed.length,
      totalContributed,
      estimatedReach,
      actions,
      perceptionShiftPct: shifts.length ? Math.round(shifts.reduce((a, b) => a + b, 0) / shifts.length) : null,
      campaigns: [...new Set(backed.map((c) => c.campaignId))].map((id) => campaigns.get(id)).filter(Boolean).map((c) => toCard(c!)),
    },
    created: {
      count: mine.length,
      raised: mine.reduce((s, c) => s + c.raisedAmount, 0),
      estimatedReach: mine.reduce((s, c) => s + estimateReach(c.raisedAmount), 0),
    },
  };
}

meRouter.use(requireAuth);

meRouter.get(
  '/impact',
  wrap(async (req, res) => {
    const range = String(req.query.range ?? 'all');
    res.json(await impactFor(req.user!.id, ['all', '30', '90', '365', 'month'].includes(range) ? range : 'all'));
  }),
);

meRouter.get(
  '/saved',
  wrap(async (req, res) => {
    const saved = (await db.list<{ id: string; campaignId: string; userId: string; createdAt: string }>('saved')).filter(
      (s) => s.userId === req.user!.id,
    );
    const campaigns = await Promise.all(saved.map((s) => db.get<Campaign>('campaigns', s.campaignId)));
    res.json({ items: campaigns.filter((c): c is Campaign => Boolean(c)).map(toCard) });
  }),
);

const profileSchema = z.object({
  visibility: z.enum(['public', 'unlisted', 'private']),
  displayName: z.string().trim().max(60),
  bio: z.string().max(500),
  location: z.string().trim().max(80),
  show: z.object({
    totalReach: z.boolean(),
    moneyRaised: z.boolean(),
    amplified: z.boolean(),
    contributed: z.boolean(),
    avgTrust: z.boolean(),
  }),
  hideCreated: z.boolean(),
  hideBacked: z.boolean(),
});

meRouter.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ profile: req.user!.publicProfile, slug: req.user!.slug });
  }),
);

meRouter.put(
  '/profile',
  wrap(async (req, res) => {
    const input = parse(profileSchema, req.body);
    // Links are stripped from the bio, as on the reference site.
    const bio = input.bio.replace(/https?:\/\/\S+/gi, '').trim();
    const user: User = { ...req.user!, publicProfile: { ...input, bio, displayName: input.displayName || req.user!.name } };
    await db.put('users', user);
    res.json({ profile: user.publicProfile, slug: user.slug });
  }),
);

publicProfileRouter.get(
  '/:slug',
  wrap(async (req, res) => {
    const user = (await db.list<User>('users')).find((u) => u.slug === req.params.slug);
    if (!user || user.publicProfile.visibility === 'private') throw notFound('This profile is private or does not exist.');
    const p = user.publicProfile;
    const impact = await impactFor(user.id, 'all');
    const campaigns = (await db.list<Campaign>('campaigns')).filter((c) => c.creatorId === user.id && c.status !== 'draft' && ['available_for_funding', 'goal_reached', 'distribution_preparation', 'promoting', 'completed'].includes(c.status));
    res.json({
      name: p.displayName || user.name,
      bio: p.bio,
      location: p.location,
      joinedAt: user.joinedAt,
      unlisted: p.visibility === 'unlisted',
      stats: {
        ...(p.show.totalReach ? { totalReach: impact.created.estimatedReach + impact.backed.estimatedReach } : {}),
        ...(p.show.moneyRaised ? { moneyRaised: impact.created.raised } : {}),
        ...(p.show.amplified ? { amplifiedCampaigns: impact.created.count } : {}),
        ...(p.show.contributed ? { contributed: impact.backed.totalContributed } : {}),
      },
      created: p.hideCreated ? [] : campaigns.map(toCard),
      backed: p.hideBacked ? [] : impact.backed.campaigns,
    });
  }),
);
