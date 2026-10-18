# Backend

Express + TypeScript API. Data is stored through a small document store: in memory for local work and tests,
Postgres (Supabase) when `DATABASE_URL` is set.

```
npm install
npm run dev        # http://localhost:4000
npm test           # integration tests (in-memory store)
npm run build && npm start
```

Modules live in `src/modules/<domain>` (routes, service, schema). Rules for money and reach are in `src/config/rules.ts`.
Payment, AI and ad delivery are simulated behind providers and labelled as demo in the app.
