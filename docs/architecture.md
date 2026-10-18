# Architecture (short)

- `mobile/` — Expo Router app. Server data via TanStack Query, local state via Zustand.
- `backend/` — Express API, modules per domain (`src/modules/*`: routes, controller, service, schema).
  Providers (`src/providers`) hide payment, AI, speech and ad delivery behind interfaces so the demo
  can use simulated implementations.
- Campaign lifecycle is enforced on the server (draft → submitted → approved → funding → promoting → completed).
