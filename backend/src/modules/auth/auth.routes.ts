import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { parse, wrap } from '../../lib/errors.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { notify } from '../notifications/notifications.service.js';
import { createUser, toPublicUser, verifyLogin } from './auth.service.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(60),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const prefsSchema = z.object({
  campaigns: z.boolean(),
  funding: z.boolean(),
  backing: z.boolean(),
  reports: z.boolean(),
  account: z.boolean(),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  notificationPrefs: prefsSchema.optional(),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  wrap(async (req, res) => {
    const input = parse(registerSchema, req.body);
    const user = await createUser(input);
    await notify({ userId: user.id, category: 'account', type: 'account_created', title: 'Account created', body: 'Welcome. Your account can back campaigns, create them and follow their progress.' });
    res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
  }),
);

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const input = parse(loginSchema, req.body);
    const user = await verifyLogin(input.email, input.password);
    res.json({ token: signToken(user.id), user: toPublicUser(user) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ user: toPublicUser(req.user!) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const input = parse(updateMeSchema, req.body);
    const user = { ...req.user! };
    if (input.name) user.name = input.name;
    if (input.notificationPrefs) user.notificationPrefs = input.notificationPrefs;
    await db.put('users', user);
    if (input.name && input.name !== req.user!.name) {
      await notify({ userId: user.id, category: 'account', type: 'account_name_changed', title: 'Account details changed', body: 'Your display name was updated. If this was not you, sign out and sign in again.' });
    }
    res.json({ user: toPublicUser(user) });
  }),
);
