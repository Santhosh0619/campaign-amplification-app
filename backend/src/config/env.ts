import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  // Demo mode exposes the "advance campaign state" endpoint that stands in for the reviewer panel.
  // Optional. When absent, AI drafting answers with a clear "not linked" error.
  geminiApiKey: (process.env.GEMINI_API_KEY ?? '').replace(/^.*:\s*/, '').replace(/\s+/g, '').trim(),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-flash-latest',
  demoMode: (process.env.DEMO_MODE ?? 'true') === 'true',
};
