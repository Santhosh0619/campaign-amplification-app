import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { adPlatforms, categories, rules } from './config/rules.js';
import { errorMiddleware, notFound } from './lib/errors.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { uploadsRouter } from './modules/ai/upload.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { campaignRouter } from './modules/campaigns/campaign.routes.js';
import { contributionsRouter } from './modules/contributions/contributions.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { meRouter, publicProfileRouter } from './modules/profile/profile.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '6mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campaign-backend', demoMode: env.demoMode });
  });

  const api = express.Router();
  api.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => env.nodeEnv === 'test' }));

  // Static config the app needs so rules live in one place.
  api.get('/config', (_req, res) => {
    res.json({
      categories,
      adPlatforms,
      reachPerDollar: rules.reachPerDollar,
      platformFeeRate: rules.platformFeeRate,
      processingRate: rules.processingRate,
      processingFixed: rules.processingFixed,
      activationThresholdRate: rules.activationThresholdRate,
      minGoal: rules.minGoal,
      presets: rules.presets,
      fundingWindows: [...rules.fundingWindows, 'evergreen'],
      reviewHours: rules.reviewHours,
      demoMode: env.demoMode,
    });
  });

  api.use('/auth', authRouter);
  api.use('/campaigns', campaignRouter);
  api.use('/contributions', contributionsRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/me', meRouter);
  api.use('/u', publicProfileRouter);
  api.use('/uploads', uploadsRouter);
  api.use('/ai', aiRouter);
  app.use('/api/v1', api);

  app.use((_req, _res, next) => next(notFound('That route does not exist.')));
  app.use(errorMiddleware);
  return app;
}
