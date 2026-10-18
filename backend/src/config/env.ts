import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  // Demo mode exposes the "advance campaign state" endpoint that stands in for the reviewer panel.
  demoMode: (process.env.DEMO_MODE ?? 'true') === 'true',
};
