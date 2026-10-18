import { db } from '../../db/index.js';
import { estimateReach, rules } from '../../config/rules.js';
import { badRequest } from '../../lib/errors.js';
import { newId, nowIso } from '../../lib/ids.js';
import type { Campaign, CampaignStatus, Report, TrustReview } from '../../types/domain.js';
import { notify } from '../notifications/notifications.service.js';

const DAY = 86_400_000;

/** Allowed lifecycle transitions. The server is the only place state changes happen. */
const transitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'changes_requested', 'rejected', 'cancelled'],
  changes_requested: ['submitted', 'cancelled'],
  approved: ['available_for_funding', 'cancelled'],
  available_for_funding: ['goal_reached', 'distribution_preparation', 'failed', 'refund_pending', 'cancelled'],
  goal_reached: ['distribution_preparation'],
  distribution_preparation: ['promoting', 'failed'],
  promoting: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
  refund_pending: ['failed'],
  failed: [],
};

export const canTransition = (from: CampaignStatus, to: CampaignStatus) => transitions[from].includes(to);

export function assertTransition(from: CampaignStatus, to: CampaignStatus) {
  if (!canTransition(from, to)) throw badRequest(`A campaign in "${from.replace(/_/g, ' ')}" cannot move to "${to.replace(/_/g, ' ')}".`);
}

export const EDITABLE: CampaignStatus[] = ['draft', 'changes_requested'];

async function addReport(r: Omit<Report, 'id' | 'createdAt'>) {
  const report: Report = { id: newId('rpt'), createdAt: nowIso(), ...r };
  await db.put('reports', report);
  return report;
}

export function demoTrustReview(c: Campaign): TrustReview {
  const base = 70 + (c.title.length % 15);
  return {
    demo: true,
    score: base,
    label: base >= 80 ? 'Good trust' : 'Moderate trust',
    factCheck: { score: base + 2, note: 'Sources were opened and the main claims were matched to them.' },
    communication: { score: null, note: 'Not scored yet. This assessment appears once review is complete.' },
    sharedReality: { score: base - 3, note: 'Framing is balanced and invites readers from different views.' },
  };
}

type Move = { to: CampaignStatus; patch?: Partial<Campaign> };

async function apply(c: Campaign, move: Move): Promise<Campaign> {
  assertTransition(c.status, move.to);
  const next: Campaign = { ...c, ...move.patch, status: move.to, updatedAt: nowIso() };
  await db.put('campaigns', next);
  return next;
}

export async function submitCampaign(c: Campaign): Promise<Campaign> {
  const next = await apply(c, { to: 'submitted', patch: { submittedAt: nowIso(), review: { ...c.review, changeRequest: undefined } } });
  await notify({
    userId: c.creatorId,
    category: 'campaigns',
    type: 'submission_received',
    title: 'Submission received',
    body: `"${c.title}" is in the review queue. Review usually takes about ${rules.reviewHours} hours.`,
    campaignId: c.id,
  });
  return next;
}

export type DemoAction = 'next' | 'approve' | 'request_changes' | 'reject';

/**
 * Stands in for the reviewer panel and ad operations (out of scope for the prototype).
 * Moves a campaign one step along the lifecycle and emits the matching notifications and reports.
 */
export async function demoAdvance(c: Campaign, action: DemoAction): Promise<Campaign> {
  const note = (type: string, title: string, body: string, category: 'campaigns' | 'funding' | 'reports' = 'campaigns') =>
    notify({ userId: c.creatorId, category, type, title, body, campaignId: c.id });

  if (c.status === 'submitted') {
    if (action === 'request_changes') {
      const next = await apply(c, {
        to: 'changes_requested',
        patch: { review: { ...c.review, reviewedAt: nowIso(), changeRequest: 'Please add a second source for the main statistic and shorten the headline.' } },
      });
      await note('changes_requested', 'Changes requested', `A reviewer left notes on "${c.title}". Update it and resubmit.`);
      return next;
    }
    if (action === 'reject') {
      const next = await apply(c, {
        to: 'rejected',
        patch: { review: { ...c.review, reviewedAt: nowIso(), rejectionReason: 'The claims could not be matched to the sources provided.' } },
      });
      await note('rejected', 'Campaign not approved', `"${c.title}" did not pass review. See the reviewer's reason.`);
      return next;
    }
    const approved = await apply(c, { to: 'approved', patch: { review: { ...c.review, reviewedAt: nowIso(), trust: demoTrustReview(c), notes: 'Approved in demo review.' } } });
    await note('approved', 'Campaign approved', `"${c.title}" passed review.`);
    return approved;
  }

  if (c.status === 'approved') {
    const days = c.fundingWindow === 'evergreen' ? undefined : c.fundingWindow;
    const next = await apply(c, {
      to: 'available_for_funding',
      patch: { publishedAt: nowIso(), fundingEndsAt: days ? new Date(Date.now() + days * DAY).toISOString() : undefined },
    });
    await note('available_for_backing', 'Open for backing', `"${c.title}" is now public and can receive contributions.`, 'funding');
    return next;
  }

  if (c.status === 'available_for_funding') {
    // Demo shortcut: pretend the remaining backers arrived so the later stages can be shown.
    const next = await apply(c, { to: 'goal_reached', patch: { raisedAmount: Math.max(c.raisedAmount, c.goalAmount), backersCount: Math.max(c.backersCount, 12) } });
    await note('goal_reached', 'Funding goal reached', `"${c.title}" reached its goal. Ads are not live yet; distribution still has to be prepared.`, 'funding');
    return next;
  }

  if (c.status === 'goal_reached') {
    const next = await apply(c, { to: 'distribution_preparation' });
    await note('distribution_preparation', 'Preparing distribution', 'Reviewers are setting up ads on the chosen platforms.', 'funding');
    return next;
  }

  if (c.status === 'distribution_preparation') {
    const next = await apply(c, { to: 'promoting' });
    await addReport({
      campaignId: c.id,
      kind: 'progress',
      title: 'Promotion has started',
      body: 'Ads are live. Delivery numbers below are early readings and will change.',
      metrics: metricsFor(next, 0.35, 'estimated'),
    });
    await note('promotion_started', 'Promotion has begun', `Ads for "${c.title}" are now running.`, 'reports');
    return next;
  }

  if (c.status === 'promoting') {
    const next = await apply(c, { to: 'completed' });
    await addReport({
      campaignId: c.id,
      kind: 'final',
      title: 'Final distribution report',
      body: 'The campaign has finished. These are the measured delivery results from the ad platforms (demo figures).',
      metrics: { ...metricsFor(next, 1, 'measured'), perceptionShiftPct: 31 },
    });
    await note('final_report', 'Final report is ready', `The distribution report for "${c.title}" is available.`, 'reports');
    return next;
  }

  throw badRequest(`Nothing to advance from "${c.status.replace(/_/g, ' ')}".`);
}

export function metricsFor(c: Campaign, progress: number, kind: 'estimated' | 'measured') {
  const spend = Math.round(c.raisedAmount * (1 - rules.platformFeeRate) * progress);
  const reach = Math.round(estimateReach(spend));
  const impressions = Math.round(reach * 1.7);
  return {
    fundsRaised: c.raisedAmount,
    adSpend: spend,
    impressions,
    reach,
    reachKind: kind,
    clicks: Math.round(impressions * 0.021),
  };
}
