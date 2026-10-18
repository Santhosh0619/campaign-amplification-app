import { Router } from 'express';
import { z } from 'zod';
import { categories } from '../../config/rules.js';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { badRequest, forbidden, notFound, parse, wrap } from '../../lib/errors.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import type { Campaign, Feedback, Reaction, Saved } from '../../types/domain.js';
import { demoAdvance, EDITABLE, submitCampaign, type DemoAction } from './campaign.lifecycle.js';
import { draftSchema, submitProblems, submitSchema } from './campaign.schema.js';
import { blankCampaign, findCampaign, findOwned, isPublic, listPublic, mergeDraft, uniqueSlug } from './campaign.service.js';
import { toCard, toDetail, toOwnerView } from './campaign.view.js';
import { socialRouter, viewerKey } from './social.routes.js';

export const campaignRouter = Router();

const listSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(300).optional(),
  sort: z.enum(['recommended', 'newest', 'mostFunded', 'endingSoon']).optional(),
  minPercent: z.coerce.number().min(0).max(100).optional(),
  endingSoon: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

campaignRouter.get(
  '/',
  wrap(async (req, res) => {
    const q = parse(listSchema, req.query);
    const result = await listPublic({
      q: q.q,
      categories: q.category ? q.category.split(',').filter(Boolean) : undefined,
      sort: q.sort,
      minPercent: q.minPercent,
      endingSoon: q.endingSoon === 'true',
      page: q.page,
      limit: q.limit,
    });
    res.json({ ...result, items: result.items.map(toCard) });
  }),
);

campaignRouter.get(
  '/featured',
  wrap(async (_req, res) => {
    const all = (await db.list<Campaign>('campaigns')).filter((c) => c.status === 'available_for_funding');
    const featured = all.filter((c) => c.featured).sort((a, b) => b.raisedAmount - a.raisedAmount);
    res.json({ items: featured.slice(0, 5).map(toCard) });
  }),
);

campaignRouter.get(
  '/categories',
  wrap(async (_req, res) => {
    const all = (await db.list<Campaign>('campaigns')).filter(isPublic);
    const counts = new Map<string, number>();
    for (const c of all) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    res.json({ items: categories.map((name) => ({ name, count: counts.get(name) ?? 0 })) });
  }),
);

campaignRouter.get(
  '/mine',
  requireAuth,
  wrap(async (req, res) => {
    const mine = (await db.list<Campaign>('campaigns'))
      .filter((c) => c.creatorId === req.user!.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ items: mine.map(toOwnerView) });
  }),
);

campaignRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const input = parse(draftSchema, req.body ?? {});
    const created = mergeDraft(blankCampaign(req.user!), input);
    created.slug = await uniqueSlug(created.title || 'untitled', created.id);
    await db.put('campaigns', created);
    res.status(201).json({ campaign: toOwnerView(created) });
  }),
);

campaignRouter.get(
  '/:id',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await findCampaign(String(req.params.id));
    const viewer = req.user;
    const owner = viewer?.id === c.creatorId;
    if (!isPublic(c) && !owner) throw notFound('Campaign not found.');

    const key = viewerKey(req);
    const [reactions, feedback, saved] = await Promise.all([
      db.list<Reaction>('reactions'),
      db.list<Feedback>('feedback'),
      viewer ? db.list<Saved>('saved') : Promise.resolve([] as Saved[]),
    ]);
    const mineReaction = reactions.find((r) => r.campaignId === c.id && r.userKey === key)?.value ?? null;
    const feedbackGiven: Record<string, string> = {};
    for (const f of feedback.filter((f) => f.campaignId === c.id && f.userKey === key)) feedbackGiven[f.kind] = f.value;

    res.json({
      campaign: owner ? toOwnerView(c) : toDetail(c, viewer?.id),
      viewer: {
        saved: saved.some((s) => s.campaignId === c.id && s.userId === viewer?.id),
        reaction: mineReaction,
        feedback: feedbackGiven,
      },
      reactions: {
        up: reactions.filter((r) => r.campaignId === c.id && r.value === 'up').length,
        down: reactions.filter((r) => r.campaignId === c.id && r.value === 'down').length,
      },
    });
  }),
);

campaignRouter.patch(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const c = await findOwned(String(req.params.id), req.user!);
    if (!EDITABLE.includes(c.status)) {
      throw forbidden('This campaign is already submitted. Editing a campaign in review or live is not allowed here.');
    }
    const input = parse(draftSchema, req.body);
    const next = mergeDraft(c, input);
    next.slug = await uniqueSlug(next.title || 'untitled', next.id);
    await db.put('campaigns', next);
    res.json({ campaign: toOwnerView(next), savedAt: next.updatedAt });
  }),
);

campaignRouter.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const c = await findOwned(String(req.params.id), req.user!);
    if (c.status !== 'draft') throw forbidden('Only drafts can be deleted.');
    await db.remove('campaigns', c.id);
    res.json({ ok: true });
  }),
);

campaignRouter.post(
  '/:id/submit',
  requireAuth,
  wrap(async (req, res) => {
    const c = await findOwned(String(req.params.id), req.user!);
    if (!EDITABLE.includes(c.status)) throw badRequest('This campaign has already been submitted.');
    parse(submitSchema, req.body);
    const problems = submitProblems(c);
    if (Object.keys(problems).length > 0) throw badRequest('Finish the highlighted items before submitting.', problems);
    const next = await submitCampaign(c);
    res.json({ campaign: toOwnerView(next) });
  }),
);

const advanceSchema = z.object({ action: z.enum(['next', 'approve', 'request_changes', 'reject']).default('next') });

/** Demo tooling: stands in for the reviewer panel. Only the creator can move their own campaign. */
campaignRouter.post(
  '/:id/demo-advance',
  requireAuth,
  wrap(async (req, res) => {
    if (!env.demoMode) throw notFound();
    const c = await findOwned(String(req.params.id), req.user!);
    const { action } = parse(advanceSchema, req.body ?? {});
    const next = await demoAdvance(c, action as DemoAction);
    res.json({ campaign: toOwnerView(next) });
  }),
);

campaignRouter.use('/:id', socialRouter);

