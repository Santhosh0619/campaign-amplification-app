import { db } from '../../db/index.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { newId, nowIso, slugify } from '../../lib/ids.js';
import { PUBLIC_STATUSES, type Campaign, type User } from '../../types/domain.js';
import type { DraftInput } from './campaign.schema.js';
import { daysLeft, percentFunded } from './campaign.view.js';

export function blankCampaign(user: User): Campaign {
  const now = nowIso();
  return {
    id: newId('cmp'),
    slug: '',
    creatorId: user.id,
    status: 'draft',
    title: '',
    category: '',
    creatorName: user.name,
    shortDescription: '',
    story: [],
    whyBackersCare: '',
    sources: [],
    cover: {},
    ad: { useOwn: false, headline: '', primaryText: '' },
    goalAmount: 0,
    fundingWindow: 30,
    targetAudience: '',
    whyItMatters: '',
    platforms: ['Facebook'],
    storySummary: { about: '', whoFor: '', whyMatters: '', sameForBackers: true },
    raisedAmount: 0,
    backersCount: 0,
    featured: false,
    isDemo: false,
    review: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function findCampaign(idOrSlug: string): Promise<Campaign> {
  const direct = await db.get<Campaign>('campaigns', idOrSlug);
  if (direct) return direct;
  const all = await db.list<Campaign>('campaigns');
  const bySlug = all.find((c) => c.slug === idOrSlug);
  if (!bySlug) throw notFound('Campaign not found.');
  return bySlug;
}

export async function findOwned(idOrSlug: string, user: User): Promise<Campaign> {
  const c = await findCampaign(idOrSlug);
  if (c.creatorId !== user.id) throw forbidden('Only the creator can change this campaign.');
  return c;
}

export const isPublic = (c: Campaign) => PUBLIC_STATUSES.includes(c.status);

export async function uniqueSlug(title: string, ownId: string): Promise<string> {
  const base = slugify(title) || 'campaign';
  const all = await db.list<Campaign>('campaigns');
  const taken = new Set(all.filter((c) => c.id !== ownId).map((c) => c.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function mergeDraft(c: Campaign, input: DraftInput): Campaign {
  const next: Campaign = { ...c, updatedAt: nowIso() };
  if (input.title !== undefined) next.title = input.title;
  if (input.category !== undefined) next.category = input.category;
  if (input.creatorName !== undefined) next.creatorName = input.creatorName;
  if (input.shortDescription !== undefined) next.shortDescription = input.shortDescription;
  if (input.story !== undefined) next.story = input.story;
  if (input.whyBackersCare !== undefined) next.whyBackersCare = input.whyBackersCare;
  if (input.sources !== undefined) next.sources = input.sources;
  if (input.cover !== undefined) next.cover = input.cover;
  if (input.ad !== undefined) next.ad = { ...input.ad, image: input.ad.image };
  if (input.goalAmount !== undefined) next.goalAmount = input.goalAmount ?? 0;
  if (input.fundingWindow !== undefined) next.fundingWindow = input.fundingWindow;
  if (input.targetAudience !== undefined) next.targetAudience = input.targetAudience;
  if (input.whyItMatters !== undefined) next.whyItMatters = input.whyItMatters;
  if (input.platforms !== undefined) next.platforms = input.platforms;
  if (input.storySummary !== undefined) next.storySummary = input.storySummary;
  return next;
}

export type ListQuery = {
  q?: string;
  categories?: string[];
  sort?: 'recommended' | 'newest' | 'mostFunded' | 'endingSoon';
  minPercent?: number;
  endingSoon?: boolean;
  page?: number;
  limit?: number;
};

export async function listPublic(query: ListQuery) {
  const now = Date.now();
  let items = (await db.list<Campaign>('campaigns')).filter(isPublic);

  const q = query.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((c) => [c.title, c.shortDescription, c.creatorName, c.category].some((f) => f.toLowerCase().includes(q)));
  }
  if (query.categories?.length) items = items.filter((c) => query.categories!.includes(c.category));
  if (query.minPercent) items = items.filter((c) => percentFunded(c) >= query.minPercent!);
  if (query.endingSoon) items = items.filter((c) => (daysLeft(c, now) ?? Infinity) <= 14 && c.status === 'available_for_funding');

  const byNewest = (a: Campaign, b: Campaign) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
  switch (query.sort) {
    case 'newest':
      items.sort(byNewest);
      break;
    case 'mostFunded':
      items.sort((a, b) => b.raisedAmount - a.raisedAmount);
      break;
    case 'endingSoon':
      items.sort((a, b) => (daysLeft(a, now) ?? 9999) - (daysLeft(b, now) ?? 9999));
      break;
    default:
      // Recommended: open campaigns first, featured on top, then closest to goal.
      items.sort((a, b) => {
        const open = Number(b.status === 'available_for_funding') - Number(a.status === 'available_for_funding');
        if (open) return open;
        const feat = Number(b.featured) - Number(a.featured);
        return feat || percentFunded(b) - percentFunded(a);
      });
  }

  const limit = Math.min(Math.max(query.limit ?? 10, 1), 30);
  const page = Math.max(query.page ?? 1, 1);
  const total = items.length;
  const slice = items.slice((page - 1) * limit, page * limit);
  return { items: slice, total, page, hasMore: page * limit < total };
}
