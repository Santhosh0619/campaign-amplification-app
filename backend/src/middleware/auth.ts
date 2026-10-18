import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { unauthorized } from '../lib/errors.js';
import type { User } from '../types/domain.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const signToken = (userId: string) => jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '30d' });

async function resolveUser(req: Request): Promise<User | undefined> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as { sub: string };
    return await db.get<User>('users', payload.sub);
  } catch {
    return undefined;
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await resolveUser(req);
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) return next(unauthorized());
  req.user = user;
  next();
}
