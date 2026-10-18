import { Router } from 'express';
import { z } from 'zod';
import { quote } from '../../config/rules.js';
import { db } from '../../db/index.js';
import { forbidden, notFound, parse, wrap } from '../../lib/errors.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import type { Campaign, Contribution } from '../../types/domain.js';
import { findCampaign } from '../campaigns/campaign.service.js';
import { toCard } from '../campaigns/campaign.view.js';
import { assertCanBack, newContribution, settle } from './contributions.service.js';

export const contributionsRouter = Router();

const quoteSchema = z.object({ campaignId: z.string().min(1), amount: z.number().positive() });

contributionsRouter.post(
  '/quote',
  wrap(async (req, res) => {
    const { campaignId, amount } = parse(quoteSchema, req.body);
    const c = await findCampaign(campaignId);
    assertCanBack(c, amount);
    res.json({ quote: quote(amount), campaign: toCard(c) });
  }),
);

const createSchema = z.object({
  campaignId: z.string().min(1),
  amount: z.number().positive(),
  showFirstName: z.boolean().default(false),
  guestEmail: z.string().trim().email('Enter a valid email for your receipt.').optional(),
});

contributionsRouter.post(
  '/',
  optionalAuth,
  wrap(async (req, res) => {
    const input = parse(createSchema, req.body);
    const c = await findCampaign(input.campaignId);
    assertCanBack(c, input.amount);
    const q = quote(input.amount);
    const user = req.user;
    const contribution = newContribution({
      campaignId: c.id,
      userId: user?.id ?? null,
      guestEmail: user ? undefined : input.guestEmail,
      displayName: user && input.showFirstName ? user.name.split(' ')[0] : undefined,
      amount: q.amount,
      fee: q.fee,
      total: q.total,
      estimatedReach: q.estimatedReach,
      showFirstName: Boolean(user && input.showFirstName),
    });
    await db.put('contributions', contribution);
    res.status(201).json({ contribution, quote: q });
  }),
);

contributionsRouter.get(
  '/mine',
  requireAuth,
  wrap(async (req, res) => {
    const mine = (await db.list<Contribution>('contributions'))
      .filter((c) => c.userId === req.user!.id && c.status !== 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const campaigns = new Map((await db.list<Campaign>('campaigns')).map((c) => [c.id, c]));
    res.json({
      items: mine.map((c) => ({ ...c, campaign: campaigns.get(c.campaignId) ? toCard(campaigns.get(c.campaignId)!) : null })),
    });
  }),
);

/** Public list of people who chose to be named, plus how many stayed private. */
contributionsRouter.get(
  '/campaign/:id/backers',
  wrap(async (req, res) => {
    const c = await findCampaign(String(req.params.id));
    const ok = (await db.list<Contribution>('contributions')).filter((x) => x.campaignId === c.id && x.status === 'succeeded');
    const named = ok.filter((x) => x.showFirstName && x.displayName).map((x) => x.displayName!);
    res.json({ named: [...new Set(named)].slice(0, 12), privateCount: ok.length - named.length, total: ok.length });
  }),
);

async function ownedContribution(id: string, userId?: string) {
  const c = await db.get<Contribution>('contributions', id);
  if (!c) throw notFound('Payment not found.');
  if (c.userId && c.userId !== userId) throw forbidden('This payment belongs to another account.');
  return c;
}

contributionsRouter.get(
  '/:id',
  optionalAuth,
  wrap(async (req, res) => {
    const contribution = await ownedContribution(String(req.params.id), req.user?.id);
    const campaign = await findCampaign(contribution.campaignId);
    res.json({ contribution, campaign: toCard(campaign) });
  }),
);

const simulateSchema = z.object({ outcome: z.enum(['success', 'fail', 'cancel', 'pending']) });

/** Dummy payment provider: the app's demo checkout picks the outcome. */
contributionsRouter.post(
  '/:id/simulate',
  optionalAuth,
  wrap(async (req, res) => {
    const contribution = await ownedContribution(String(req.params.id), req.user?.id);
    const { outcome } = parse(simulateSchema, req.body);
    const result = await settle(contribution, outcome);
    const campaign = await findCampaign(result.campaignId);
    res.json({ contribution: result, campaign: toCard(campaign) });
  }),
);
