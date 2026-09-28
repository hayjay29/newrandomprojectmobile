# Repository guide

This repo holds two separate projects:

- **Dragon Hoard** (`dragon-hoard/`) — the main active project. A first-person
  incremental treasure-excavation game, planned in Unity 6 + URP.
- **DRIFT** (`index.html`, `game.js`, `style.css` at the root) — an earlier,
  finished mobile-browser asteroids game. Leave it alone unless asked.

## Dragon Hoard

`dragon-hoard/DESIGN.md` is the **source of truth** for the game's design.
Read it before doing any Dragon Hoard work. Key rules from it:

- Don't casually redesign major systems; explain why when proposing a change.
- Label suggestions as CURRENT DESIGN, OPTIONAL IDEA, or RECOMMENDED CHANGE.
- The developer is a beginner solo dev using AI heavily: favor achievable
  implementations, flag scope risks honestly, and propose cheap illusions for
  anything too ambitious.
- Keep first person, stylized (non-AAA) visuals, and strong incremental power.
- Not an organizer game, not a combat RPG, no GPS/map guidance to the main relic.
- Keep code modular. Separate prototype requirements from full-game ones.
- Current phase: **Prototype 0.1** (one chamber) — see sections 111–112 and 123.
  Don't build procedural generation, dragon AI, or other later systems yet.

`dragon-hoard/prototype/` is a browser test build of Prototype 0.1 (Three.js,
vendored, no build step). It is a fast way to test the core loop before the
Unity build, not the real game. See its README for how to run it, the
playtest checklist, and how each file maps to a future Unity script. Tuning
numbers live in `src/config.js`.

If a design decision changes, update `DESIGN.md` in the same change.
