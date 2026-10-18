import { createApp } from './app.js';
import { env } from './config/env.js';
import { getStore } from './db/index.js';
import { seedIfEmpty } from './db/seed.js';

async function main() {
  await getStore().init();
  await seedIfEmpty();
  createApp().listen(env.port, () => {
    console.log(`API listening on :${env.port} (${env.databaseUrl ? 'postgres' : 'in-memory'} store)`);
  });
}

main().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
