import { Router, type Request } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { badRequest, parse, wrap } from '../../lib/errors.js';
import { newId, nowIso } from '../../lib/ids.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import type { Campaign, Comment, Feedback, Reaction, Report, Saved } from '../../types/domain.js';
import { notify } from '../notifications/notifications.service.js';
import { findCampaign, isPublic } from './campaign.service.js';

export const socialRouter = Router({ mergeParams: true });

/** Signed-in users are keyed by id; guests by a device id header so one device counts once. */
export function viewerKey(req: Request): string {
  if (req.user) return `u:${req.user.id}`;
  const device = String(req.headers['x-device-id'] ?? '').slice(0, 64);
  return `d:${device || req.ip || 'anon'}`;
}

async function publicCampaign(req: Request) {
  const c = await findCampaign(String((req.params as { id: string }).id));
  if (!isPublic(c)) throw badRequest('This campaign is not open for feedback yet.');
  return c;
}

const reactionSchema = z.object({ value: z.enum(['up', 'down']).nullable() });

socialRouter.post(
  '/reaction',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const { value } = parse(reactionSchema, req.body);
    const key = viewerKey(req);
    const id = `rea_${c.id}_${key}`;
    if (value === null) await db.remove('reactions', id);
    else await db.put<Reaction>('reactions', { id, campaignId: c.id, userKey: key, value });
    const all = (await db.list<Reaction>('reactions')).filter((r) => r.campaignId === c.id);
    res.json({ reaction: value, up: all.filter((r) => r.value === 'up').length, down: all.filter((r) => r.value === 'down').length });
  }),
);

const feedbackSchema = z.object({
  kind: z.enum(['visuals', 'mind_changed', 'credible']),
  value: z.enum(['no', 'somewhat', 'yes']),
});

socialRouter.post(
  '/feedback',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const input = parse(feedbackSchema, req.body);
    const key = viewerKey(req);
    await db.put<Feedback>('feedback', { id: `fbk_${c.id}_${key}_${input.kind}`, campaignId: c.id, userKey: key, ...input });
    res.json({ ok: true, ...input });
  }),
);

socialRouter.post(
  '/save',
  requireAuth,
  wrap(async (req, res) => {
    const c = await findCampaign(String((req.params as { id: string }).id));
    const id = `sav_${c.id}_${req.user!.id}`;
    const existing = await db.get<Saved>('saved', id);
    if (existing) await db.remove('saved', id);
    else await db.put<Saved>('saved', { id, campaignId: c.id, userId: req.user!.id, createdAt: nowIso() });
    res.json({ saved: !existing });
  }),
);

socialRouter.get(
  '/comments',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const key = viewerKey(req);
    const me = req.user?.id;
    const items = (await db.list<Comment>('comments'))
      .filter((x) => x.campaignId === c.id && (x.reportedBy?.length ?? 0) < 3)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(({ reportedBy, ...x }) => ({ ...x, parentId: x.parentId ?? null, mine: x.userId === me, reportedByMe: (reportedBy ?? []).includes(key) }));
    res.json({ items });
  }),
);

const commentSchema = z.object({
  body: z.string().trim().min(2, 'Write a little more.').max(600, 'Keep comments under 600 characters.'),
  parentId: z.string().optional(),
});

socialRouter.post(
  '/comments',
  requireAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const { body, parentId } = parse(commentSchema, req.body);
    if (parentId) {
      const parent = await db.get<Comment>('comments', parentId);
      if (!parent || parent.campaignId !== c.id) throw badRequest('The comment you are replying to no longer exists.');
    }
    const comment: Comment = {
      id: newId('com'),
      campaignId: c.id,
      userId: req.user!.id,
      authorName: req.user!.name,
      body,
      parentId: parentId ?? null,
      reportedBy: [],
      createdAt: nowIso(),
    };
    await db.put('comments', comment);
    const full = await db.get<Campaign>('campaigns', c.id);
    if (full && full.creatorId !== req.user!.id) {
      await notify({ userId: full.creatorId, category: 'reports', type: 'new_comments', title: 'New comments on your campaign', body: `People are talking about "${full.title}".`, campaignId: full.id });
    }
    res.status(201).json({ comment });
  }),
);

socialRouter.get(
  '/reports',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await findCampaign(String((req.params as { id: string }).id));
    const owner = req.user?.id === c.creatorId;
    if (!isPublic(c) && !owner) throw badRequest('Reports are available once a campaign is live.');
    const items = (await db.list<Report>('reports'))
      .filter((r) => r.campaignId === c.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ items });
  }),
);

socialRouter.post(
  '/comments/:commentId/report',
  optionalAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const comment = await db.get<Comment>('comments', String(req.params.commentId));
    if (!comment || comment.campaignId !== c.id) throw badRequest('That comment no longer exists.');
    const key = viewerKey(req);
    const reportedBy = [...new Set([...(comment.reportedBy ?? []), key])];
    await db.put('comments', { ...comment, reportedBy });
    res.json({ reported: true });
  }),
);

socialRouter.delete(
  '/comments/:commentId',
  requireAuth,
  wrap(async (req, res) => {
    const c = await publicCampaign(req);
    const comment = await db.get<Comment>('comments', String(req.params.commentId));
    if (!comment || comment.campaignId !== c.id) throw badRequest('That comment no longer exists.');
    if (comment.userId !== req.user!.id) throw badRequest('You can only delete your own comments.');
    await db.remove('comments', comment.id);
    res.json({ ok: true });
  }),
);
