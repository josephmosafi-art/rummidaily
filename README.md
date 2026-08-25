# RummiDaily v7 — proof-first puzzle engine

This version changes the architecture rather than merely changing the board.

## The publishing rule

A puzzle is now considered eligible only when:

1. The completed hidden solution exists first.
2. The visible starting table is legal.
3. The rack is not already a legal meld.
4. The hidden solution uses every tile exactly once.
5. Every hidden-solution meld is legal.
6. An independent exact-cover solver finds a solution without reading the hidden solution.

If any of those fail, the puzzle is rejected.

## Why the hidden solution exists

The generator should work backwards:

`completed legal board → choose rack → construct legal starting board → independently solve → publish`

That prevents the mistake where a visually interesting board is accidentally impossible.

## Difficulty

Proof of solvability and proof of difficulty are different things.

v7 records structural metrics such as:
- rack tiles to place,
- initial melds disrupted,
- table tiles that change partners,
- independent solution count.

But the displayed difficulty is still provisional. The real calibration will come from playtest solve times.

Target product times:
- Easy: 30–90 sec
- Medium: 2–4 min
- Hard: 4–7 min
- Expert: 7–10 min maximum

## Hints

Hints are now derived from the stored solution structure rather than manually
written for each puzzle. They remain progressive and never expose the full
solution immediately.

## Mobile

The compact iPhone layout, timer, tap-to-move and splitting controls remain.


## v8 quality-of-life change

When a normal numbered tile is moved into an existing same-colour run,
RummiDaily now automatically inserts it in numerical order.

Example:

Blue `3 4 5 6` + dragged blue `2` becomes:

`2 3 4 5 6`

rather than:

`3 4 5 6 2`

This applies to both drag/drop and tap-to-move because both use the same placement engine.
Sets are not auto-sorted, and jokers keep manual placement because their represented value may be ambiguous.


## v9 layout fix

Repeatedly splitting melds no longer expands the overall page.

Changes:
- The table is now a bounded layout surface.
- Melds reflow into a responsive grid inside the felt.
- Overflow stays inside the table rather than widening the browser page.
- Empty and tiny melds occupy less space.
- Mobile keeps the same one-screen outer layout; if a very dense position needs more room, only the felt table itself scrolls.


## v10 visual hints

Hints are no longer cryptic text clues.

Each puzzle can store visual hint actions:

1. `split` — pulses the exact scissors gap the player should consider splitting.
2. `highlight` — highlights the relevant tiles on the board.
3. `groups` — visually boxes tiles that should be thought about together.

The hint still does not move tiles automatically. It points the player toward
the structural idea while leaving the actual manipulation and solve to them.

For future generated puzzles, visual hint metadata should be produced from the
stored verified solution during the build step.

## v11 visual layout fix

The v9 grid packing rule was too aggressive and made all melds line up across the top of the table.

v11 restores a physical-table feel:
- melds keep their natural width;
- groups wrap naturally onto multiple rows;
- the outer page never grows horizontally;
- only the felt area scrolls vertically if the player creates an unusually large number of melds;
- empty work areas are small and visually subdued.
