import { estimateReach, rules } from '../../config/rules.js';
import type { Campaign } from '../../types/domain.js';

const DAY = 86_400_000;

export function daysLeft(c: Pick<Campaign, 'fundingEndsAt' | 'fundingWindow'>, now = Date.now()): number | null {
  if (c.fundingWindow === 'evergreen' || !c.fundingEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(c.fundingEndsAt).getTime() - now) / DAY));
}

export const percentFunded = (c: Pick<Campaign, 'raisedAmount' | 'goalAmount'>) =>
  c.goalAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;

export function toCard(c: Campaign) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    creatorName: c.creatorName,
    shortDescription: c.shortDescription,
    cover: c.cover,
    status: c.status,
    raisedAmount: c.raisedAmount,
    goalAmount: c.goalAmount,
    percentFunded: percentFunded(c),
    daysLeft: daysLeft(c),
    estimatedReachAtGoal: estimateReach(c.goalAmount),
    backersCount: c.backersCount,
    featured: c.featured,
    isDemo: c.isDemo,
    submittedAt: c.submittedAt ?? null,
  };
}

export function toDetail(c: Campaign, viewerId?: string) {
  return {
    ...toCard(c),
    story: c.story,
    whyBackersCare: c.whyBackersCare,
    sources: c.sources.filter((s) => s.url.trim()),
    ad: c.ad,
    targetAudience: c.targetAudience,
    whyItMatters: c.whyItMatters,
    platforms: c.platforms,
    storySummary: c.storySummary,
    review: { reviewedAt: c.review.reviewedAt ?? null, trust: c.review.trust ?? null },
    publishedAt: c.publishedAt ?? null,
    fundingEndsAt: c.fundingEndsAt ?? null,
    fundingWindow: c.fundingWindow,
    isOwner: viewerId === c.creatorId,
    activation: {
      thresholdRate: rules.activationThresholdRate,
      thresholdAmount: Math.round(c.goalAmount * rules.activationThresholdRate),
      reached: c.raisedAmount >= c.goalAmount * rules.activationThresholdRate,
    },
    canBack: c.status === 'available_for_funding',
  };
}

/** Everything the creator needs to edit and manage their own campaign. */
export function toOwnerView(c: Campaign) {
  const { creatorId: _creatorId, ...rest } = c;
  return { ...toDetail(c, c.creatorId), draft: rest, reviewNotes: c.review };
}
