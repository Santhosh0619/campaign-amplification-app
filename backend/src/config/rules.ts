// Single source of truth for the demo's money and reach assumptions.
// Every figure shown in the app is derived from these and labelled as an estimate.
export const rules = {
  reachPerDollar: 27,
  platformFeeRate: 0.2,
  processingRate: 0.029,
  processingFixed: 0.3,
  activationThresholdRate: 0.25,
  minGoal: 100,
  presets: [5, 10, 25, 50, 100],
  minContribution: 1,
  maxContribution: 5000,
  fundingWindows: [14, 30, 45, 60] as const,
  reviewHours: 24,
} as const;

export const categories = [
  'Art',
  'Civic',
  'Community',
  'Consumer',
  'Economic Policy',
  'Education',
  'Environment',
  'Food & Beverage',
  'Geopolitical',
  'Health',
  'Journalism',
  'Local Business',
  'Music',
  'News',
  'Non-profit',
  'Politics',
  'Public Policy',
  'Safety',
  'Science',
  'Sports',
  'Technology',
  'Other',
] as const;

export const adPlatforms = ['Facebook', 'Instagram', 'YouTube', 'Reddit', 'LinkedIn', 'X', 'TikTok', 'Pinterest'] as const;

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const estimateReach = (amount: number) => Math.round(amount * rules.reachPerDollar);

export function quote(amount: number) {
  const fee = round2(amount * rules.processingRate + rules.processingFixed);
  return {
    amount: round2(amount),
    fee,
    total: round2(amount + fee),
    estimatedReach: estimateReach(amount),
    adShare: round2(amount * (1 - rules.platformFeeRate)),
    platformShare: round2(amount * rules.platformFeeRate),
  };
}
