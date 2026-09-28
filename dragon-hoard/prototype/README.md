# Dragon Hoard: Prototype 0.1 (browser)

A throwaway test build of one treasure chamber. It exists to answer one
question from the design doc (section 111):

> Is searching through a treasure hoard in first person actually fun?

It is **not** the real game. The real game is planned in Unity. This build
runs in any browser (desktop or phone) so the core loop can be felt quickly.
Keep what works, then rebuild it properly in Unity.

## Run it

ES modules need a web server (opening `index.html` as a file won't work).

```bash
cd dragon-hoard/prototype
python3 -m http.server 8000
# open http://localhost:8000
```

Any static server works (VS Code "Live Server", `npx serve`, etc.).
Three.js is vendored in `vendor/`, so no install step and no internet
connection are needed (fonts fall back to system fonts when offline).

## Controls

| | Mouse & keyboard | Touch |
|---|---|---|
| Move | `W A S D`, `Shift` sprint | left thumb |
| Look | mouse (click the game to capture it) | right thumb |
| Take into your bag (instant) | press `E` or left click | tap **Take** |
| Toss aside | `F`, `Space` or right click (hold) | hold **Toss** |

Walk back into the lit tunnel behind the start point to return to camp.

## What's in it (design doc section → how it's done here)

| Design doc | Prototype 0.1 |
|---|---|
| 103 All items | **The whole hoard is pickable items.** There's no fake hill: every coin heap, cup, sword and shield you see can be taken or tossed. About 33,000 are on the surface at once and about 340,000 are in the chamber. |
| 104 Columns of layers | The pile is a 129×129 grid of 0.5 m columns, each a stack of 0.2 m layers of 3–4 items: clumped, stacked, varied in size, and grouped into patches (coin drifts, weapon piles, cups and plates). Only the top layer exists as objects. The rest is a seed per column. |
| 105 Visible top layer | Drawn with GPU instancing (about 23 batches, ~33k items). Taking an item leaves a gap that stays. A spot only drops to the next layer once everything on it is gone. Nothing refills or slides in. |
| 106 Loose items | Tossed items are stored with their positions and saved. |
| 3 World is the progress bar | The pile visibly lowers as you clear it, and eventually uncovers the original mosaic floor. |
| 30–32 Space + weight, stacking | Space is a hard limit. Weight can be exceeded (slower and louder). Coins from coin heaps stack in a purse (25 coins per space). |
| 24 Intuitive value | 1 coin = 1g. Items have intrinsic values. Deeper items are worth more. |
| 23 Return to camp | Everything auto-sells with a summary by category. |
| 33, 41–43 Merchant | Bags (Explorer → Reinforced → Hauler), Nimble Gloves (faster tossing), Shovel (toss 1 → 2 → 3 → 5 → 8 items at once), Strength, Boots, Appraisal Glasses. The Bag of Holding (1,000,000g) is shown as an aspiration. |
| 42 Appraisal | Without the glasses you only see rough guesses, and gems might be worthless glass. |
| 6 Buried specials | **Tome of the Reaching Hand**: a blue corner pokes out of a slope near the entrance. Aim at it and toss aside the treasure around it to free it. Taking it teaches Telekinesis at once (design doc 47). |
| 39 Giant objects | The Golden Colossus: its hand and crown poke out of the great mound. Too big to take, but it gets uncovered as you clear the pile. |
| 77–79 Disturbance | Actions make noise. At 40% you hear breathing, and at 70% the hoard trembles. At 100% the dragon wakes and you have 28 seconds to reach camp. |
| 88–91 Death | Fire, then "a new relic hunter arrives". Your pack stays where you fell and can be recovered. Gold, gear and dig progress are kept. |
| 110 Saving | Saves continuously while you play, and when the page is closed: gold, upgrades, which items are gone, tossed items, and mid-expedition your bag and position. **Continue** puts you back exactly where you were. |

**Deliberately left out** (design doc 112–114): multiple chambers, the
procedural den, the dragon as a physical creature, carts and wagons, Mage and
Skill Points, sets, quests and the Codex.

## Playtest checklist

Play 20–30 minutes from a fresh save. Afterwards, answer honestly:

1. In the first minute, did the pile feel impossibly big?
2. Was it satisfying to toss treasure aside to reach something underneath?
3. Did you ever stand over a full bag and have to choose what to leave behind?
4. Did the first bag upgrade feel like a real jump in power?
5. Did you notice the pile shrinking after a few trips?
6. Did the disturbance bar make you nervous, or just annoyed?
7. Did finding the tome feel like a big moment? Did Telekinesis change how you played?
8. When did you get bored, and what were you doing at that moment?

Question 8 is the most important one. It shows what to fix first.

## Tuning

Every gameplay number is in `src/config.js` (bags, upgrade costs, toss speed,
layer thickness and items per layer, coin space, disturbance rates, escape time). Item values and spawn
weights are in the `CATALOG` at the top of `src/items.js`. All of them are
placeholders.

Playtest shortcuts:
- Open the page with `#rich` at the end of the URL to start with 100,000g extra.
- **Start a new den** on the camp screen erases the save.
- `window.__hoard` in the browser console exposes the live game state.
  `window.__hoard.sim(5)` advances the game 5 seconds without drawing
  (for automated tests on slow machines).

## Code map (for the Unity port)

| File | Job | Likely Unity equivalent |
|---|---|---|
| `src/config.js` | All tuning numbers | ScriptableObjects (`BagDefinition`, `UpgradeDefinition`, `DigSettings`) |
| `src/hoard.js` | Column grid: layers left per column, shadow surface, save | `HoardGrid` holding plain arrays, split into chunks for streaming |
| `src/treasure.js` | Rolls each column's top layer, instanced drawing, picking, take/toss, sliding, loose items | `HoardRenderer` using `Graphics.RenderMeshInstanced` + an `ItemPicker` |
| `src/items.js` | Item catalog and shapes, special one-off objects | `TreasureDefinition` ScriptableObjects, prefabs for specials |
| `src/inventory.js` | Space/weight bag, coin purse | Plain C# `Inventory` class |
| `src/main.js` | Player, targeting, dig/take, disturbance, camp flow | `PlayerController`, `Interactor`, `DisturbanceSystem`, `ExpeditionManager` |
| `src/ui.js` | HUD and camp screens | UI Toolkit or uGUI |
| `src/cave.js` | Chamber dressing and lights | An authored scene (the chamber template) |
| `src/fx.js` | Coins that spill when treasure slides | A particle system |
| `src/audio.js` | Synthesised sounds | Real audio clips |
