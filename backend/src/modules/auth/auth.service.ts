import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { newId, nowIso, slugify } from '../../lib/ids.js';
import type { User } from '../../types/domain.js';

export const defaultPrefs = (): User['notificationPrefs'] => ({
  campaigns: true,
  funding: true,
  backing: true,
  reports: true,
  account: true,
});

export const defaultProfile = (name: string): User['publicProfile'] => ({
  visibility: 'public',
  displayName: name,
  bio: '',
  location: '',
  show: { totalReach: true, moneyRaised: true, amplified: true, contributed: true, avgTrust: false },
  hideCreated: false,
  hideBacked: false,
});

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'slug' | 'joinedAt' | 'notificationPrefs'>;

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  slug: u.slug,
  joinedAt: u.joinedAt,
  notificationPrefs: u.notificationPrefs,
});

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'member';
  const users = await db.list<User>('users');
  const taken = new Set(users.map((u) => u.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createUser(input: { name: string; email: string; password: string }): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const existing = (await db.list<User>('users')).find((u) => u.email === email);
  if (existing) throw conflict('An account with this email already exists. Try signing in.');
  const user: User = {
    id: newId('usr'),
    email,
    passwordHash: await bcrypt.hash(input.password, 8),
    name: input.name.trim(),
    slug: await uniqueSlug(input.name),
    joinedAt: nowIso(),
    notificationPrefs: defaultPrefs(),
    publicProfile: defaultProfile(input.name.trim()),
  };
  await db.put('users', user);
  return user;
}

export async function verifyLogin(emailRaw: string, password: string): Promise<User> {
  const email = emailRaw.trim().toLowerCase();
  const user = (await db.list<User>('users')).find((u) => u.email === email);
  // Same message for unknown email and wrong password so accounts cannot be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Email or password is incorrect.');
  }
  return user;
}
