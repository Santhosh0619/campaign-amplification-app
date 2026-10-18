import { env } from '../config/env.js';
import { MemoryStore, PgStore, type DocStore } from './store.js';

let current: DocStore | null = null;

export function getStore(): DocStore {
  if (!current) current = env.databaseUrl ? new PgStore(env.databaseUrl) : new MemoryStore();
  return current;
}

/** Tests inject a fresh store so each suite starts clean. */
export function setStore(store: DocStore) {
  current = store;
}

export const db = new Proxy({} as DocStore, {
  get: (_t, prop) => (getStore() as unknown as Record<string | symbol, unknown>)[prop],
});
