export const money = (n: number, opts: { cents?: boolean } = {}) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })}`;

export const number = (n: number) => n.toLocaleString('en-US');

/** 217590 -> "217,590" (people counts stay exact so they match the sentences around them). */
export const people = (n: number) => `${number(Math.round(n))} people`;

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function daysLeftLabel(days: number | null, status?: string): string {
  if (status && status !== 'available_for_funding') return '';
  if (days === null) return 'No deadline';
  if (days <= 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

export function shortDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'Yesterday' : `${d} days ago`;
  return shortDate(iso);
}

export const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft',
    submitted: 'In review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    available_for_funding: 'Funding',
    goal_reached: 'Goal reached',
    distribution_preparation: 'Preparing ads',
    promoting: 'Promoting',
    completed: 'Completed',
    rejected: 'Not approved',
    cancelled: 'Cancelled',
    refund_pending: 'Refund pending',
    failed: 'Failed',
  };
  return map[status] ?? status;
};
