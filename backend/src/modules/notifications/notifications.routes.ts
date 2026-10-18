import { Router } from 'express';
import { z } from 'zod';
import { parse, wrap } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { listFor, markRead } from './notifications.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  wrap(async (req, res) => {
    const items = await listFor(req.user!.id);
    res.json({ items, unread: items.filter((n) => !n.readAt).length });
  }),
);

const readSchema = z.object({ ids: z.array(z.string()).optional() });

notificationsRouter.post(
  '/read',
  wrap(async (req, res) => {
    const { ids } = parse(readSchema, req.body ?? {});
    const changed = await markRead(req.user!.id, ids);
    res.json({ changed });
  }),
);
