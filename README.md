# Campaign Amplification

A mobile-first app where people write a message, get it reviewed, and let backers pool money to run ads that
carry the message beyond the creator's own network. A contribution pays for **reach**, not for the cause.

Built with React Native (Expo, TypeScript) and a Node/Express API. Payments, AI drafting and ad delivery are
simulated and labelled as demo in the app.

## What is in the app
- **Home / Explore**: featured campaigns, search, category chips, sort and filters, loading / empty / error states.
- **Campaign page**: editorial story, visible sources, use of funds, ad preview, review and trust, reports, feedback, comments, sticky funding bar.
- **Back a campaign**: amount and live reach estimate, fees and totals, acknowledgement, simulated checkout (approved / pending / declined / cancelled), receipt.
- **Create**: five steps (Basics, Story, Visuals, Reach, Submit) with autosave, validation, previews, funding goal on the last step, submit and status timeline. Demo AI can draft the steps from a description.
- **Creator dashboard**: status tabs, management screen, analytics (estimated vs measured), updates, demo reviewer tools.
- **Activity**: notification centre with filters and unread state. **Profile**: impact, contributions, saved, public profile, settings, help.

## Layout
| Folder | What lives there |
| --- | --- |
| `mobile/` | Expo Router app (`app/` routes, `src/` features, components, theme, api) |
| `backend/` | Express API with a small document store (memory or Postgres), tests |
| `docs/` | Architecture, deployment and demo notes |

## Run it locally
```
cd backend && npm install && npm run dev        # http://localhost:4000
cd mobile  && npm install && npx expo start      # press a for Android, w for a web preview
```
Demo account: `demo@campaign.app` / `demo1234`.

## Workflow
One branch per feature, tested, merged into `main`, then deleted. See `docs/deployment.md` for hosting and the Android build.
