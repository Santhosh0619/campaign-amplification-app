import { Router } from 'express';
import { z } from 'zod';
import { parse, wrap } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { draftFromAnswers, draftFromPrompt } from '../../providers/ai.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const draftSchema = z.object({
  prompt: z.string().trim().min(40, 'Describe your campaign in a few sentences (at least 40 characters).').max(3000),
  withCover: z.boolean().optional(),
});

/** Demo mode: builds an editable draft from the creator's description. The funding goal is never set here. */
aiRouter.post(
  '/draft',
  wrap(async (req, res) => {
    const { prompt, withCover } = parse(draftSchema, req.body);
    const draft = draftFromPrompt(prompt);
    res.json({
      demo: true,
      draft,
      cover: withCover ? { generated: true, alt: `Generated cover for ${draft.title}` } : null,
    });
  }),
);

/** Demo cover: the app renders a typographic poster for generated covers, so no image bytes are needed. */
aiRouter.post(
  '/cover',
  wrap(async (req, res) => {
    const { title } = parse(z.object({ title: z.string().max(60).default('') }), req.body ?? {});
    res.json({ demo: true, cover: { generated: true, alt: title ? `Generated cover for ${title}` : 'Generated cover' } });
  }),
);

const voiceSchema = z.object({
  about: z.string().trim().min(10, 'Tell us a little about the message.').max(1500),
  audience: z.string().trim().max(800).default(''),
  why: z.string().trim().max(1500).default(''),
  evidence: z.string().trim().max(1500).default(''),
});

/** Demo mode: turns the guided interview answers into an editable draft. Nothing is published or submitted. */
aiRouter.post(
  '/voice-draft',
  wrap(async (req, res) => {
    const answers = parse(voiceSchema, req.body);
    res.json({ demo: true, draft: draftFromAnswers(answers) });
  }),
);
