import { db } from '../../db/index.js';
import { newId, nowIso } from '../../lib/ids.js';
import type { Campaign, Contribution, Notification, NotificationCategory, User } from '../../types/domain.js';

type NotifyInput = {
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  campaignId?: string;
};

/**
 * Creates an in-app notification unless the user turned that category off.
 * Account notices always go through. A repeated (user, type, campaign) event is stored once.
 */
export async function notify(input: NotifyInput): Promise<Notification | null> {
  const user = await db.get<User>('users', input.userId);
  if (!user) return null;
  if (input.category !== 'account' && user.notificationPrefs[input.category] === false) return null;

  const existing = (await db.list<Notification>('notifications')).find(
    (n) => n.userId === input.userId && n.type === input.type && n.campaignId === input.campaignId && input.type !== 'contribution_succeeded' && input.type !== 'new_backer',
  );
  if (existing) return existing;

  const note: Notification = { id: newId('ntf'), readAt: null, createdAt: nowIso(), ...input };
  await db.put('notifications', note);
  return note;
}

export async function listFor(userId: string): Promise<Notification[]> {
  const all = await db.list<Notification>('notifications');
  return all.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markRead(userId: string, ids?: string[]): Promise<number> {
  const mine = await listFor(userId);
  let changed = 0;
  for (const n of mine) {
    if (n.readAt) continue;
    if (ids && !ids.includes(n.id)) continue;
    await db.put('notifications', { ...n, readAt: nowIso() });
    changed += 1;
  }
  return changed;
}

const DAY = 86_400_000;

/**
 * Creates "deadline approaching" notices (once per campaign) for creators and backers
 * of open campaigns that end within three days. Computed when notifications are opened.
 */
export async function syncDeadlineNotices(userId: string) {
  const campaigns = await db.list<Campaign>('campaigns');
  const backedIds = new Set((await db.list<Contribution>('contributions')).filter((c) => c.userId === userId && c.status === 'succeeded').map((c) => c.campaignId));
  for (const c of campaigns) {
    if (c.status !== 'available_for_funding' || !c.fundingEndsAt) continue;
    if (c.creatorId !== userId && !backedIds.has(c.id)) continue;
    const left = Math.ceil((new Date(c.fundingEndsAt).getTime() - Date.now()) / DAY);
    if (left > 3 || left < 0) continue;
    await notify({
      userId,
      category: 'funding',
      type: 'deadline_approaching',
      title: left <= 1 ? 'Funding ends soon' : `${left} days left`,
      body: `The funding window for "${c.title}" closes ${left <= 1 ? 'within a day' : `in ${left} days`}.`,
      campaignId: c.id,
    });
  }
}
