import { db } from '../../db/index.js';
import { rules, round2 } from '../../config/rules.js';
import { badRequest } from '../../lib/errors.js';
import { newId, nowIso, receiptNumber } from '../../lib/ids.js';
import type { Campaign, Contribution, Report } from '../../types/domain.js';
import { notify } from '../notifications/notifications.service.js';
import { assertTransition } from '../campaigns/campaign.lifecycle.js';

export type Outcome = 'success' | 'fail' | 'cancel' | 'pending';

export function assertCanBack(c: Campaign, amount: number) {
  if (c.status !== 'available_for_funding') {
    throw badRequest('This campaign is not open for backing right now.');
  }
  if (c.fundingEndsAt && new Date(c.fundingEndsAt).getTime() < Date.now()) {
    throw badRequest('The funding window for this campaign has ended.');
  }
  if (!Number.isFinite(amount) || amount < rules.minContribution) throw badRequest(`The minimum contribution is $${rules.minContribution}.`);
  if (amount > rules.maxContribution) throw badRequest(`The maximum contribution is $${rules.maxContribution.toLocaleString('en-US')}.`);
}

export const newContribution = (input: {
  campaignId: string;
  userId: string | null;
  guestEmail?: string;
  displayName?: string;
  amount: number;
  fee: number;
  total: number;
  estimatedReach: number;
  showFirstName: boolean;
}): Contribution => {
  const now = nowIso();
  return { id: newId('con'), status: 'pending', receiptNo: receiptNumber(), createdAt: now, updatedAt: now, ...input };
};

const failureReasons: Record<string, string> = {
  fail: 'The card was declined by the demo payment provider.',
};

/** Simulated payment provider outcome. Only a pending contribution can change state. */
export async function settle(contribution: Contribution, outcome: Outcome): Promise<Contribution> {
  if (contribution.status !== 'pending') {
    throw badRequest(`This payment is already ${contribution.status.replace(/_/g, ' ')}.`);
  }
  if (outcome === 'pending') return contribution;

  if (outcome === 'cancel' || outcome === 'fail') {
    const next: Contribution = {
      ...contribution,
      status: outcome === 'cancel' ? 'cancelled' : 'failed',
      failureReason: failureReasons[outcome],
      updatedAt: nowIso(),
    };
    await db.put('contributions', next);
    if (contribution.userId && outcome === 'fail') {
      await notify({
        userId: contribution.userId,
        category: 'backing',
        type: 'contribution_failed',
        title: 'Payment did not go through',
        body: 'Nothing was charged. You can try again with another card.',
        campaignId: contribution.campaignId,
      });
    }
    return next;
  }

  const campaign = await db.get<Campaign>('campaigns', contribution.campaignId);
  if (!campaign || campaign.status !== 'available_for_funding') {
    const next: Contribution = { ...contribution, status: 'rejected', failureReason: 'The campaign stopped accepting contributions.', updatedAt: nowIso() };
    await db.put('contributions', next);
    return next;
  }

  const before = campaign.raisedAmount;
  const raised = round2(before + contribution.amount);
  let updated: Campaign = { ...campaign, raisedAmount: raised, backersCount: campaign.backersCount + 1, updatedAt: nowIso() };
  const goalReached = raised >= campaign.goalAmount;
  if (goalReached) {
    assertTransition(updated.status, 'goal_reached');
    updated = { ...updated, status: 'goal_reached' };
  }
  await db.put('campaigns', updated);

  const done: Contribution = { ...contribution, status: 'succeeded', updatedAt: nowIso() };
  await db.put('contributions', done);

  if (contribution.userId) {
    await notify({
      userId: contribution.userId,
      category: 'backing',
      type: 'contribution_succeeded',
      title: 'Contribution received',
      body: `Your $${contribution.amount} toward "${campaign.title}" went through. Receipt ${contribution.receiptNo}.`,
      campaignId: campaign.id,
    });
  }
  await milestones(campaign, updated, before);
  return done;
}

const marks = [0.25, 0.5, 0.75, 1];

async function milestones(prev: Campaign, next: Campaign, before: number) {
  for (const m of marks) {
    const line = prev.goalAmount * m;
    if (before < line && next.raisedAmount >= line) {
      const pct = Math.round(m * 100);
      const activation = m === rules.activationThresholdRate;
      const report: Report = {
        id: newId('rpt'),
        campaignId: prev.id,
        kind: 'milestone',
        title: m === 1 ? 'Funding goal reached' : `${pct}% funded`,
        body: activation
          ? 'The activation threshold has been reached, so contributions can now be used for ad delivery once the campaign is prepared.'
          : m === 1
            ? 'The funding goal has been reached. Ads start only after distribution is prepared.'
            : `The campaign has passed ${pct}% of its goal.`,
        createdAt: nowIso(),
      };
      await db.put('reports', report);
      await notify({
        userId: prev.creatorId,
        category: 'funding',
        type: `milestone_${pct}`,
        title: m === 1 ? 'Funding goal reached' : `${pct}% of your goal is funded`,
        body: `"${prev.title}" is now $${next.raisedAmount.toLocaleString('en-US')} of $${prev.goalAmount.toLocaleString('en-US')}.`,
        campaignId: prev.id,
      });
    }
  }
}
