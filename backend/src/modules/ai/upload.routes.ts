import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { badRequest, notFound, parse, wrap } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { requireAuth } from '../../middleware/auth.js';

type Upload = { id: string; mime: string; data: string; ownerId: string };

const MAX_BYTES = 3 * 1024 * 1024;
const allowed = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadsRouter = Router();

const uploadSchema = z.object({ dataUri: z.string().min(30) });

uploadsRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const { dataUri } = parse(uploadSchema, req.body);
    const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
    if (!m) throw badRequest('Send the image as a base64 data URI.');
    const [, mime, data] = m;
    if (!allowed.includes(mime)) throw badRequest('Use a JPG, PNG or WebP image.');
    if (Buffer.byteLength(data, 'base64') > MAX_BYTES) throw badRequest('That image is over 3 MB. Choose a smaller one.');
    const id = newId('img');
    await db.put<Upload>('uploads', { id, mime, data, ownerId: req.user!.id });
    res.status(201).json({ url: `/api/v1/uploads/${id}` });
  }),
);

uploadsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const up = await db.get<Upload>('uploads', String(req.params.id));
    if (!up) throw notFound('Image not found.');
    res.setHeader('Content-Type', up.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(up.data, 'base64'));
  }),
);
