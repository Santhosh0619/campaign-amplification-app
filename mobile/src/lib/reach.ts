import type { AppConfig, Quote } from '@/types/api';

/** Mirrors the backend rules so quotes update instantly while typing. The server remains the authority. */
export const FALLBACK_CONFIG: AppConfig = {
  categories: [
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
  ],
  adPlatforms: ['Facebook', 'Instagram', 'YouTube', 'Reddit', 'LinkedIn', 'X', 'TikTok', 'Pinterest'],
  reachPerDollar: 27,
  platformFeeRate: 0.2,
  processingRate: 0.029,
  processingFixed: 0.3,
  activationThresholdRate: 0.25,
  minGoal: 100,
  presets: [5, 10, 25, 50, 100],
  fundingWindows: [14, 30, 45, 60, 'evergreen'],
  reviewHours: 24,
  demoMode: true,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateReach(amount: number, cfg: AppConfig = FALLBACK_CONFIG) {
  return Math.round(amount * cfg.reachPerDollar);
}

export function localQuote(amount: number, cfg: AppConfig = FALLBACK_CONFIG): Quote {
  const fee = round2(amount * cfg.processingRate + cfg.processingFixed);
  return {
    amount: round2(amount),
    fee,
    total: round2(amount + fee),
    estimatedReach: estimateReach(amount, cfg),
    adShare: round2(amount * (1 - cfg.platformFeeRate)),
    platformShare: round2(amount * cfg.platformFeeRate),
  };
}
