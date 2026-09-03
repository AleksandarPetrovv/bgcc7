# how seeding and results work

this is the plain explanation of every calculation the BGCC7 site does on its own, written so anyone can check our numbers without asking us. all of it runs from the code in this repo, and nobody's seed or result is ever changed by hand.

## who gets in

there's no skill filter. no BWS, no rank cap, no rank floor. the only reasons someone can't play are:

- their osu! country isn't Bulgaria (the sign-up page checks this)
- they failed the screening done by the osu! account support team
- they didn't make the qualifier cut (below)

staff can't approve or deny people on their own judgement. a denial always comes with a written reason.

## qualifier seeding

code: `src/lib/qualifiers.ts` (`rankQualifiers`), data loaded in `src/db/qualifiers.ts`.

1. scores are pulled straight from the qualifier mp links (`src/app/admin/qualifiers/actions.ts`). only maps from the qualifier pool count, and only maps that finished (aborted maps are skipped).
2. every player has one score per map. if a map somehow got played twice by the same player, the higher score is kept.
3. for each map, we take everyone's score on it and work out the average and the standard deviation (population standard deviation, all players who played the map).
4. each player's score on that map becomes a z-score: `z = (score - average) / standard deviation`.
5. the z-score becomes a percentile using the normal distribution: `percentile = Φ(z)`, a number between 0 and 1. if every score on a map is identical, everyone gets 0.5.
6. a player's seeding value is the sum of their percentiles over every map in the pool. a map you didn't play adds 0.
7. highest sum is seed 1. if two players have the exact same sum, the one with the higher average score is ahead.

the top `qualifyCount` players (24 for BGCC7) qualify. the full table with every score and every mp link is public at `/qualifiers/scores`, and the seed order is at `/qualifiers/seeding`.

## making the teams

code: `generateTeams` in `src/app/admin/teams/actions.ts`.

with `n` teams (8 for BGCC7), the qualified players are split in snake order:

- team 1: seeds 1, 2n, 2n + 1 → 1, 16, 17
- team 2: seeds 2, 2n - 1, 2n + 2 → 2, 15, 18
- team k: seeds k, 2n + 1 - k, 2n + k

the team seed is the seed of its first player. the admin panel has no way to change a seed by hand. players can only be moved between teams for substitutions the osu! team has signed off on.

## bracket seeding

the quarterfinals are filled from team seeds: 1 v 8, 4 v 5, 2 v 7, 3 v 6. after that, winners and losers move on by themselves (`advance` in `src/db/bracket.ts`, the paths are in `FEED` in `src/lib/pickems.ts`).

## match results

code: `buildScoreboard` in `src/lib/scoreboard.ts`.

every bracket match is read from its mp links:

- a map counts if it's in that stage's mappool and it finished.
- maps that aren't in the pool are warmups and don't count.
- if the same map is played twice in a row, only the second one counts (the first counts as replayed).
- each map is won by the team with the higher total score (team vs, scorev2).
- first team to reach the stage's first-to wins the match, and the result is saved automatically.
- players who sat in the lobby with 0 points (usually referees) are hidden, unless they scored on another map in the same match.

if a score is missing or wrong (a disconnect, a broken mp), staff can enter or fix it in the admin panel. every such change:

- is shown publicly in the match popup as "edited by staff"
- is written to the admin log with who did it and when
- recounts the map winners and the match score from scratch

qualifier scores entered by hand are marked the same way on `/qualifiers/scores`.

## reproducing it

everything above only needs the mp links, which are all public on the site. give the same mp links to the functions named above and you'll get the same seeds, teams and results.
