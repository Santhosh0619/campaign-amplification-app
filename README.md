# Campaign Amplification

A mobile-first app where people write a message, get it reviewed, and let backers
pool money to run ads that carry the message beyond the creator's own network.
Contributions pay for reach, not for the cause behind the message.

## Layout

| Folder     | What lives there                                  |
| ---------- | ------------------------------------------------- |
| `mobile/`  | React Native (Expo, TypeScript) app               |
| `backend/` | Node + Express + TypeScript API, Postgres (Supabase) |
| `docs/`    | Architecture notes, API list, design decisions    |

## Workflow

One branch per feature (`feat/<area>-<thing>`), tested, merged into `main`, then deleted.
