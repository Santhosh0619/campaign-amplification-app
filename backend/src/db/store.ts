import pg from 'pg';

export type Collection =
  | 'users'
  | 'campaigns'
  | 'contributions'
  | 'notifications'
  | 'reports'
  | 'comments'
  | 'feedback'
  | 'reactions'
  | 'saved'
  | 'uploads';

export interface DocStore {
  init(): Promise<void>;
  get<T>(col: Collection, id: string): Promise<T | undefined>;
  list<T>(col: Collection): Promise<T[]>;
  put<T extends { id: string }>(col: Collection, doc: T): Promise<T>;
  remove(col: Collection, id: string): Promise<void>;
  count(col: Collection): Promise<number>;
}

/** In-memory store used for local development and tests. Data resets when the process restarts. */
export class MemoryStore implements DocStore {
  private data = new Map<Collection, Map<string, unknown>>();

  async init() {}

  private bucket(col: Collection) {
    let b = this.data.get(col);
    if (!b) {
      b = new Map();
      this.data.set(col, b);
    }
    return b;
  }

  async get<T>(col: Collection, id: string) {
    const v = this.bucket(col).get(id);
    return v === undefined ? undefined : (structuredClone(v) as T);
  }

  async list<T>(col: Collection) {
    return [...this.bucket(col).values()].map((v) => structuredClone(v) as T);
  }

  async put<T extends { id: string }>(col: Collection, doc: T) {
    this.bucket(col).set(doc.id, structuredClone(doc));
    return doc;
  }

  async remove(col: Collection, id: string) {
    this.bucket(col).delete(id);
  }

  async count(col: Collection) {
    return this.bucket(col).size;
  }
}

/** Postgres-backed store (Supabase). One generic JSONB table keeps the prototype schema simple. */
export class PgStore implements DocStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
  }

  async init() {
    await this.pool.query(`
      create table if not exists docs (
        collection text not null,
        id text not null,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (collection, id)
      );
      create index if not exists docs_collection_idx on docs (collection);
    `);
  }

  async get<T>(col: Collection, id: string) {
    const r = await this.pool.query('select data from docs where collection = $1 and id = $2', [col, id]);
    return r.rows[0]?.data as T | undefined;
  }

  async list<T>(col: Collection) {
    const r = await this.pool.query('select data from docs where collection = $1', [col]);
    return r.rows.map((row) => row.data as T);
  }

  async put<T extends { id: string }>(col: Collection, doc: T) {
    await this.pool.query(
      `insert into docs (collection, id, data) values ($1, $2, $3)
       on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
      [col, doc.id, JSON.stringify(doc)],
    );
    return doc;
  }

  async remove(col: Collection, id: string) {
    await this.pool.query('delete from docs where collection = $1 and id = $2', [col, id]);
  }

  async count(col: Collection) {
    const r = await this.pool.query('select count(*)::int as n from docs where collection = $1', [col]);
    return r.rows[0].n as number;
  }
}
