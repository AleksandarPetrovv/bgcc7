# BGCC7

the site for BGCC7, the seventh Bulgarian Community Cup: a 3v3, open rank osu! tournament for players from Bulgaria.

it handles sign-ups, qualifier lobbies, qualifier results and seeding, teams, the double elimination bracket, mappools, pick'ems, stats and streams. staff run everything from `/admin`.

**how seeding, teams and match results are calculated:** [docs/seeding.md](docs/seeding.md)

## stack

Next.js (App Router), TypeScript, Postgres with Drizzle, Auth.js with osu! login, Tailwind CSS. match data comes from the osu! API v2.

## run it locally

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

you need a Postgres database (put its url in `DATABASE_URL`) and your own osu! OAuth app (`AUTH_OSU_ID`, `AUTH_OSU_SECRET`) and an `AUTH_SECRET`. `pnpm db:seed` loads test data from the previous cup so pages aren't empty.

## where things live

- `src/app` pages, one folder per route, admin under `src/app/admin`
- `src/lib/qualifiers.ts` qualifier seeding
- `src/lib/scoreboard.ts` match results from mp links
- `src/db` database schema and queries
- `drizzle` migrations
