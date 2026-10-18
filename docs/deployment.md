# Deployment

## 1. Database (Supabase, optional but recommended)
Create a free project, then copy the **connection string** (Project Settings, Database, Connection string, URI).
The API creates its one table (`docs`) on first start, so no manual SQL is needed.
Without `DATABASE_URL` the API keeps data in memory and resets when it restarts.

## 2. API (Render)
New, Blueprint, pick this repository. Render reads `render.yaml`. Set `DATABASE_URL` when asked.
After it deploys, `https://<name>.onrender.com/health` should return `{"status":"ok"}`.
The free plan sleeps after ~15 minutes idle; the first request wakes it (about 30 seconds).

## 3. Android build (Expo EAS)
```
cd mobile
npm install -g eas-cli
eas login
eas build:configure        # first time only
# put the Render URL in mobile/eas.json (EXPO_PUBLIC_API_URL)
eas build -p android --profile preview
```
The build finishes with a download link for the `.apk`.

## Demo account
`demo@campaign.app` / `demo1234` (seeded on first start).
