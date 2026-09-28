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
| Take / pull free | `E` or left click (hold) | hold **Take** |
| Dig | `F`, `Space` or right click (hold) | hold **Dig** |
| Keep or drop coins while digging | `C` | **Coins** |

Walk back into the lit tunnel behind the start point to return to camp.

## What's in it (design doc section → how it's done here)

| Design doc | Prototype 0.1 |
|---|---|
| 104 Bulk hoard layer | A 129×129 heightfield mound. Digging lowers it. |
| 105 Surface instances | ~5,000 instanced coins that ride the surface. |
| 106 Interactive objects | ~700 items placed *inside* the mound volume. Hidden until digging exposes them, and they fall when the pile under them is removed. |
| 7 Hoard reacts | Treasure slides into holes when a slope gets steeper than the angle of repose. Coins spray and tumble while digging. |
| 3 World is the progress bar | The pile visibly lowers. Deep digging turns the gold older and darker, and eventually uncovers the original mosaic floor. |
| 30–32 Space + weight, stacking | Space is a hard limit. Weight can be exceeded (slower and louder). Coins stack in a purse (25 coins per space). |
| 24 Intuitive value | 1 coin = 1g. Items have intrinsic values. Deeper items are worth more. |
| 23 Return to camp | Everything auto-sells with a summary by category. |
| 33, 41–43 Merchant | Bags (Explorer → Reinforced → Hauler), Nimble Gloves, Digging Tool, Strength, Boots, Appraisal Glasses. The Bag of Holding (1,000,000g) is shown as an aspiration. |
| 42 Appraisal | Without the glasses you only see rough guesses, and gems might be worthless glass. |
| 6 Buried specials | **Tome of the Reaching Hand**: a blue corner pokes out of a slope near the entrance. Dig around it to free it. Taking it teaches Telekinesis at once (design doc 47). |
| 39 Giant objects | The Golden Colossus: its hand and crown poke out of the great mound. Too big to take, but it gets uncovered as you dig. |
| 77–79 Disturbance | Actions make noise. At 40% you hear breathing, and at 70% the hoard trembles. At 100% the dragon wakes and you have 28 seconds to reach camp. |
| 88–91 Death | Fire, then "a new relic hunter arrives". Your pack stays where you fell and can be recovered. Gold, gear and dig progress are kept. |
| 110 Saving | Saves at camp: gold, upgrades, the heightfield (not individual coins) and remaining items. |

**Deliberately left out** (design doc 112–114): multiple chambers, the
procedural den, the dragon as a physical creature, carts and wagons, Mage and
Skill Points, sets, quests and the Codex.

## Playtest checklist

Play 20–30 minutes from a fresh save. Afterwards, answer honestly:

1. In the first minute, did the pile feel impossibly big?
2. Was it satisfying to see a half-buried thing and dig it out?
3. Did you ever stand over a full bag and have to choose what to leave behind?
4. Did the first bag upgrade feel like a real jump in power?
5. Did you notice the pile shrinking after a few trips?
6. Did the disturbance bar make you nervous, or just annoyed?
7. Did finding the tome feel like a big moment? Did Telekinesis change how you played?
8. When did you get bored, and what were you doing at that moment?

Question 8 is the most important one. It shows what to fix first.

## Tuning

Every gameplay number is in `src/config.js` (bags, upgrade costs, dig speed,
coin value per space, disturbance rates, escape time). Item values and spawn
weights are in the `CATALOG` at the top of `src/items.js`. All of them are
placeholders.

Playtest shortcuts:
- Open the page with `#rich` at the end of the URL to start with 100,000g extra.
- **Start a new den** on the camp screen erases the save.
- `window.__hoard` in the browser console exposes the live game state.

## Code map (for the Unity port)

| File | Job | Likely Unity equivalent |
|---|---|---|
| `src/config.js` | All tuning numbers | ScriptableObjects (`BagDefinition`, `UpgradeDefinition`, `DigSettings`) |
| `src/hoard.js` | Heightfield mound, dig, slide, save | `HoardChunk` + a mesh built from a height array (split into chunks per design doc 108) |
| `src/items.js` | Item catalog, placement, bury/fall/reveal | `TreasureDefinition` ScriptableObjects + a pooled `TreasureItem` MonoBehaviour |
| `src/inventory.js` | Space/weight bag, coin purse | Plain C# `Inventory` class |
| `src/main.js` | Player, targeting, dig/take, disturbance, camp flow | `PlayerController`, `Interactor`, `DisturbanceSystem`, `ExpeditionManager` |
| `src/ui.js` | HUD and camp screens | UI Toolkit or uGUI |
| `src/cave.js` | Chamber dressing and lights | An authored scene (the chamber template) |
| `src/fx.js` | Temporary coin physics | Pooled rigidbodies or a particle system |
| `src/audio.js` | Synthesised sounds | Real audio clips |
