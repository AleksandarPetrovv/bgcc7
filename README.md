# BGCC7 demo

design-only mock of the BGCC7 tournament site. no backend, no auth, no database: every page renders static BGCC6 data from `src/data/*.json` so the layout can be judged with real names, maps and scores.

stack follows `stack.txt` where it matters for UI: Next.js App Router, TypeScript, pnpm, Tailwind CSS, shadcn/ui and Recharts.

## run

```bash
pnpm install
pnpm dev
```

then open http://localhost:3000.

## pages

- `/` home, timeline, entry points
- `/info`, `/info/condensed` rules
- `/register` team registration
- `/qualifiers`, `/qualifiers/scores`, `/qualifiers/seeding`
- `/teams`, `/teams/[id]`, `/teams/players`, `/teams/manage`
- `/schedule`, `/schedule/bracket`
- `/mappool`
- `/pickems`
- `/stats`
- `/streams`, `/streams/vods`, `/streams/overlays`
- `/staff`, `/staff/sponsors`
- `/admin`

## design

- palette: ink `#0d0f0e`, paper `#f4f3ee`, rose `#e0242f`, balkan green `#0fa06a`
- type: Unbounded (wordmark), Archivo black italic (headings), Barlow Condensed (numbers)
- signatures: tricolor speed-stripe mark, barcode, and a Bulgarian shevitsa cross-stitch motif used as ribbons and markers
