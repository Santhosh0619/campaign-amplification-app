-- Run once in the Supabase SQL editor (the server also runs this on boot via PgStore.init()).
create table if not exists docs (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists docs_collection_idx on docs (collection);
