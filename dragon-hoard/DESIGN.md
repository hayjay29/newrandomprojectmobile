# DRAGON HOARD — Complete Current Game Design / Source of Truth

This document describes the current design for Dragon Hoard.

Treat everything here as the current working foundation.

**IMPORTANT:**

- This is not all permanently locked.
- Some exact numbers, names, prices, pacing values, and content quantities are placeholders.
- Do not redesign major systems without explaining why.
- Preserve the core identity.
- When suggesting changes, distinguish between:
  - CURRENT DESIGN
  - OPTIONAL IDEA
  - RECOMMENDED CHANGE
- The developer is a beginner solo developer using AI heavily.
- Scope realism matters.
- The game should feel commercially attractive without requiring AAA graphics or engineering.

---

## 1. One-Sentence Pitch

Dragon Hoard is a first-person incremental treasure-hunting game where you enter an enormous living dragon's den, excavate mountains of treasure, sell your haul, become dramatically more powerful, and search the labyrinthine hoard for one legendary relic.

---

## 2. Core Fantasy

The player is a relic hunter.

Outside an enormous ancient dragon den is a small expedition camp.

For centuries, the dragon has accumulated treasure from:

- kingdoms
- armies
- temples
- merchants
- adventurers
- royal vaults
- ancient ruins
- magical civilizations

The hoard is so enormous that it has effectively become the terrain.

The original floor and architecture are buried beneath:

- coins
- weapons
- armor
- statues
- furniture
- goblets
- jewelry
- chests
- books
- relics
- pottery
- bones
- magical objects
- junk

The player has been hired to recover one specific legendary relic buried somewhere inside this impossible hoard.

The game is NOT primarily about organizing treasure.

The player is:

- searching
- excavating
- stealing
- hauling
- exploring
- uncovering
- becoming more efficient

The central feeling should be:

**Beginning:**
> "How am I ever going to search all of this?"

**Middle:**
> "What else is buried in here?"

**Late:**
> "I can't believe how powerful I've become."

**Finale:**
> "I found it. Now get me out of here."

---

## 3. Core Design Pillars

### Pillar 1 — Visibly Overwhelming

The player must immediately see absurd quantities of treasure.

The opening impression should be:

> "I have to search through THAT?"

The hoard must feel physically enormous.

### Pillar 2 — Incremental Power

The player starts extremely weak.

Early:

- one object at a time
- tiny carrying capacity
- frequent trips
- slow hauling
- weak identification
- limited exploration

Late:

- huge bags
- carts and wagons
- telekinesis
- mass treasure movement
- powerful appraisal
- Featherweight magic
- relic detection
- faster excavation
- giant-object extraction

The same actions should become dramatically easier over time.

### Pillar 3 — The World Is the Progress Bar

The cave physically changes.

A giant treasure mound that originally fills a chamber gradually becomes:

- lower
- thinner
- exposed
- excavated

Eventually the player may reveal:

- floors
- murals
- old throne rooms
- buried doors
- stairways
- ruined temples
- mechanisms
- skeletons
- hidden chambers

The player should SEE their progress in the environment.

### Pillar 4 — Discovery

The player should constantly wonder:

> "What is underneath this?"

Normal treasure hides:

- valuable items
- set pieces
- quest items
- spellbooks
- giant treasures
- secret routes
- unusual relics
- the main legendary relic

### Pillar 5 — Greed vs Safety

The dragon is alive.

The player frequently faces:

> "Should I leave now with what I have, or risk taking more?"

The dragon is not the main combat enemy.

It is expedition pressure.

---

## 4. Camera

FIRST PERSON.

Do not design around third-person gameplay.

Reasons:

- treasure feels larger
- searching feels tactile
- easier beginner scope
- no full player-character animation requirement
- better immersion
- better for spotting partially buried objects
- easier to fake hoard scale

The player may occasionally see:

- hands
- gloves
- lantern
- tool
- shovel/pry tool
- wagon handle
- magic effect

Keep first-person animations simple.

---

## 5. Core Game Loop

The fundamental loop is:

Enter den
→ explore
→ search treasure
→ excavate
→ uncover objects
→ decide what is worth taking
→ fill bag/cart/wagon
→ manage dragon risk
→ return to camp
→ ordinary treasure automatically sells
→ complete quests/sets/special discoveries
→ buy equipment
→ buy Skill Points
→ upgrade abilities
→ prepare
→ enter again
→ go deeper

Repeat until the legendary relic is found.

---

## 6. Moment-to-Moment Treasure Interaction

The basic interaction loop is:

Look
→ identify
→ free object
→ judge value
→ pick up / haul
→ expose what is beneath it
→ repeat

Examples:

**Loose object:**

- aim
- interact
- item goes into bag

**Partially buried object:**

- grab/pull
- surrounding treasure shifts slightly
- object comes free
- collect it

**Large object:**

- cannot fit in bag
- carry, drag, strap, cart, wagon, Featherweight, or Telekinesis

**Buried special object:**

- player sees only part of it

Examples:

- blue book corner
- strange sword hilt
- crown
- gem
- crest
- chest lid
- statue hand
- magical glow

The player clears around it until it is revealed.

---

## 7. The Hoard Should React

Treasure should feel physical without simulating millions of rigidbodies.

Nearby interactions can cause:

- coins sliding
- small objects tumbling
- loose treasure settling
- gaps opening
- mound surfaces lowering

Dragon movement can cause much larger shifts.

---

## 8. World Structure

The game uses ONE enormous connected dragon den.

NOT traditional levels.

The den contains:

- major chambers
- tunnels
- ancient architecture
- buried halls
- vertical spaces
- shortcuts
- treasure-blocked routes
- loops
- hidden pockets
- giant caverns

The player gradually pushes deeper into the same world.

---

## 9. Procedural World Rule

The den is:

**Procedural between new games.**
**Persistent within one save.**

Each NEW GAME generates:

- chamber arrangement
- connections
- treasure mound locations
- large blockers
- set-piece locations
- spellbooks
- quest items
- rare valuables
- main relic region/location
- secret areas

Once generated, it remains fixed for that save.

Nothing randomly reshuffles every session.

If the player clears a route, it stays cleared.

If they leave a wagon somewhere, it stays there.

If they excavate a chamber, it remains excavated.

---

## 10. Procedural Generation Style

Do NOT use ugly fully-random voxel caves.

Use:

**Authored chamber templates arranged procedurally.**

The generator creates a controlled spatial graph.

Players recognize chamber types but cannot memorize an exact route between playthroughs.

---

## 11. Depth Structure

The cave should naturally feel deeper and richer over time.

Possible broad invisible regions:

**Entrance Zone**

- newer treasure
- common loot
- easier navigation
- low dragon presence
- small treasures

**Outer Hoard**

- larger chambers
- more branching
- better loot
- early sets
- early spellbook possibilities

**Middle Hoard**

- larger treasure piles
- heavy extraction
- stronger shortcuts
- richer goods
- more danger

**Deep Hoard**

- royal wealth
- ancient treasure
- magical valuables
- larger blockers
- stronger dragon presence

**Inner Hoard**

- oldest treasure
- huge valuables
- rare relics
- highest danger
- valid main relic locations

Do not label these as LEVEL 1 / LEVEL 2 / LEVEL 3.

The player should simply feel:

> "I'm getting deeper."

---

## 12. Cave Branching

Most major route decisions should present roughly 2–3 possibilities.

Routes can differ through:

- safety
- wealth
- width
- verticality
- dragon danger
- treasure blockage
- hauling compatibility

Example:

**Route A:**

- narrow
- safer
- wagon impossible

**Route B:**

- wide
- rich
- dangerous

**Route C:**

- currently blocked by treasure collapse

---

## 13. Loops and Shortcuts

Loops are important.

Example:

A → B → C → D → reconnect near A

Opening a shortcut can dramatically improve hauling efficiency.

Exploration therefore has value even if the chamber itself is not extremely rich.

---

## 14. Chamber Design Rule

Every major chamber should ideally have:

1. visual identity
2. treasure identity
3. gameplay problem

---

## 15. Chamber Types

Current examples:

### Coin Basin

Huge quantity of loose coins and small valuables.

Strength:

- easy money
- satisfying mass collection

Weakness:

- low value per object

### Buried Armory

Weapons, armor, shields, helmets.

Strength:

- sets
- valuable metal objects

Problem:

- heavy
- noisy
- inefficient bag use

### Royal Vault

Crowns, jewelry, ceremonial items, statues.

Strength:

- high-value treasure

Problem:

- large/heavy objects

### Gem Grotto

Scattered valuable gemstones.

Strength:

- excellent value-to-weight

Problem:

- difficult to visually identify without appraisal skills

### Lost Expedition Chamber

Old adventurer remains and gear.

Possible finds:

- tools
- quest items
- journals
- spellbooks
- strange equipment
- maps

Less focused on raw money.

### Ancient Reliquary

Very old treasure.

Potential:

- spellbooks
- rare relics
- legendary set pieces
- unique valuables

### Hoard Collapse

Treasure has avalanche-piled into a route.

Gameplay:

- massive excavation
- uncover passage
- unstable treasure
- loud collapses

### Dragon Nest Edge

Close to dragon territory.

Reward:

- very valuable treasure

Risk:

- much higher dragon danger

---

## 16. Hybrid Chambers

Chamber properties can mix.

Examples:

- Royal Armory
- Collapsed Gem Vault
- Ancient Coin Temple
- Lost Expedition in Royal Ruins

This creates variety without requiring hundreds of unique chamber types.

---

## 17. Chamber Completion

Do NOT require the player to empty every chamber.

Use roughly three completion concepts:

**Passage Cleared**

Enough treasure removed to physically move through.

**Searched**

Important parts of the room exposed and most meaningful discoveries accessible.

**Fully Excavated**

Most/all treasure removed.

Full excavation should be optional.

---

## 18. Full Excavation Reward

Fully excavating a room can reveal the original buried location beneath the treasure.

Examples:

- throne room
- temple
- royal hall
- old library
- ruins
- hidden door
- mural
- inscription
- mechanism
- secret chamber

This makes 100% clearing meaningful beyond money.

---

## 19. Map

The player can have a map/minimap for navigation.

BUT IMPORTANT:

The map must NOT guide the player toward the main relic.

It should mainly record what the player has already discovered.

Possible information:

- discovered chambers
- chamber connections
- shortcuts
- camp
- blocked passages
- abandoned wagon
- previous hunter death
- player-created markers
- marked giant valuables

The player should be able to feel LOST.

That is intentional.

---

## 20. Main Relic Search

There is ONE main legendary target relic.

The game does NOT provide:

- clue-chain GPS
- automatic story breadcrumbs pointing to the correct chamber
- map guidance
- "go here" objectives
- precise relic markers

The player should explore and search a substantial amount of the den.

Being lost is part of the fantasy.

---

## 21. Relic Detection

The primary intentional relic-location aid comes from a learned ability.

The player does NOT start with it.

Later they unlock:

**Relic Sense / Relic Detection**

A temporary active ability that can detect the relic if it is within range.

It should NOT be:

- permanent
- spammable
- exact GPS
- constant directional arrow

Early versions might only return:

- No resonance
- Faint
- Strong

Later upgrades may improve:

- range
- active duration
- cooldown
- signal clarity
- ability to penetrate walls/treasure
- directional information

Even at high levels, the player should still need to physically search.

---

## 22. Camp

A small expedition camp exists outside the den.

It is the hub for:

- selling
- buying
- skills
- sets
- quests
- preparation
- resting

Do NOT turn it into a city-builder.

Current main camp roles:

1. Merchant
2. Mage
3. Collector

---

## 23. Return-to-Camp Flow

Returning should be quick and satisfying.

Ordinary treasure automatically sells.

Example summary:

```
Coins ............... 438g
Weapons & Armor ... 1,260g
Jewelry ............. 870g
Misc ................ 190g

TOTAL ............. 2,758g
```

Special items are highlighted separately:

- spellbooks
- set pieces
- quest items
- unique finds

Then:

- spend or save
- choose upgrades
- check requests
- prepare loadout
- return to den

An experienced player should be able to return and head back out quickly.

---

## 24. Economy Philosophy

Very important:

**1 gold coin = 1 gold.**

Do not invent a strange merchant markdown system just to slow progression.

Treasure should have intuitive intrinsic value.

Value depends roughly on:

- item type
- material
- size
- weight
- gems
- ornamentation
- rarity
- historical importance

Example conceptually:

1 Gold Coin = 1g

A ring might be worth more.

A jeweled goblet much more.

A giant golden statue dramatically more.

---

## 25. Economic Scale

The game should embrace large incremental numbers.

Rough progression:

- Early: tens/hundreds
- Mid: thousands
- Deep: tens/hundreds of thousands
- Inner: millions

The same object does NOT magically become worth more later.

The player finds increasingly valuable treasure deeper inside.

---

## 26. Expensive Upgrades

The developer is comfortable with absurd-looking prices.

Possible scale:

100 → 1,000 → 10,000 → 100,000 → 1,000,000 → 10,000,000+

Exact values are NOT locked.

The principle:

Huge prices are good if the player can see a believable path toward them.

A player might see:

**BAG OF HOLDING — 1,000,000g**

while currently owning:

**47g**

That should create aspiration.

---

## 27. Pacing Philosophy

Incremental does NOT mean cheap or easy.

Desired feeling:

- not too easy
- not instant
- not impossible
- not repetitive grind

Rough upgrade pacing:

- Small upgrade: 1–2 decent expeditions
- Strong upgrade: several expeditions
- Major breakthrough: meaningful saving / focused progression
- Huge aspirational unlock: possibly hours

The player should usually feel:

> "I'm a few expeditions away from something I really want."

---

## 28. Big Upgrade Rule

Expensive upgrades should provide meaningful power.

Avoid:

5,000,000g → +3% walk speed

Prefer:

5,000,000g → Mass Telekinesis

Major upgrades should change how the player plays.

---

## 29. Treasure Value vs Logistics

High value should often have logistical cost.

Example:

**Huge Gold Statue**

- very valuable
- enormous
- heavy
- loud
- difficult route

**Tiny legendary jewel:**

- extremely valuable
- very light

These tiny jackpots should exist, but be relatively rare so they feel incredible.

---

## 30. Inventory System

Avoid inventory Tetris.

Normal inventory tracks:

**SPACE** and **WEIGHT**

Every normal item has both.

Possible tradeoffs:

- bulky but light
- compact but heavy
- efficient
- inefficient

---

## 31. Weight Overload

Weight should not necessarily hard-stop the player.

Allow overloading.

Example:

```
Weight: 42 / 30kg
OVERLOADED
```

Penalties may include:

- slower movement
- more stamina drain
- weaker sprint
- louder movement
- slower climbing

This allows greed.

Space is the firmer inventory limit.

---

## 32. Stackable Treasure

Small objects should automatically stack.

Examples:

- coins
- small gems
- rings

Do NOT create inventory spam like 400 separate coin slots.

---

## 33. Bag Progression

Possible bag progression:

- Tiny Pouch
- Explorer Pack
- Reinforced Pack
- Wide Satchel
- Hauler Pack
- Bag of Holding

Different bags can emphasize:

- space
- weight
- movement
- packing efficiency

Do not make every bag merely +5 slots.

---

## 34. Bag of Holding

Late-game aspirational upgrade.

Massively improves normal-item carrying.

However:

It should NOT completely eliminate giant-object hauling.

Oversized objects should remain physical.

---

## 35. Large Objects

Objects can become:

**TOO LARGE FOR BAG**

Possible handling:

- carry
- drag
- straps
- sled
- cart
- wagon
- pulley
- Telekinesis
- Featherweight

---

## 36. Hauling Progression

Physical hauling is a separate progression layer.

Possible ladder:

- hands
- dragging
- straps
- sled
- hand cart
- wheelbarrow
- treasure wagon
- reinforced wagon
- magic-assisted hauling

These should physically exist.

The player:

- brings wagon in
- parks it
- fills it
- sees it load
- takes it back

---

## 37. Wagon Greed

Example:

```
Wagon Cargo: 46,000g
Capacity: 82%
Dragon disturbance: rising
```

Player choice:

> Leave now?

or

> Fill that last 18%?

This is a core greed moment.

---

## 38. Routes and Hauling

Not every route supports every haul.

Examples:

- narrow tunnel — no wagon
- stairs — cart difficult
- wide hall — excellent wagon route
- steep slope — heavy hauling difficult
- rubble — route blocked

The player can deliberately excavate wide hauling corridors.

A "treasure highway" can become a long-term infrastructure goal.

---

## 39. Giant Extraction Projects

Some objects can be too large even for normal wagons.

Examples:

- golden throne
- giant statue
- huge chest
- ceremonial bell
- massive jeweled door
- enormous idol

These become projects.

May require:

- clearing surrounding treasure
- straps
- pulley
- hoist
- Featherweight
- Telekinesis
- route preparation

The player might discover a 250,000g statue at hour 5 and finally extract it at hour 9.

That is desirable.

---

## 40. Abandoned Hauls

If danger appears, the player can abandon:

- wagon
- cart
- statue
- haul

It remains where it was left.

The map can remember it.

Example:

```
Abandoned Wagon
Estimated Cargo: 63,200g
```

Now that becomes a future recovery objective.

---

## 41. Support Equipment

Keep this category focused.

Every tool should help:

- REACH treasure
- IDENTIFY treasure
- MOVE treasure
- SURVIVE dragon danger

Possible tools:

- Lantern
- Appraisal Glasses
- Rope
- Climbing gear
- Pry tool
- Straps
- Harness
- Marking chalk
- Pulley
- Hoist
- Protective gloves
- Survey tools

Avoid survival clutter such as:

- hunger
- thirst
- 15 rope types
- constant repairs
- weapon durability
- excessive crafting ingredients

The player is a treasure hunter, not a camping simulator.

---

## 42. Loadout Choices

Early game equipment may force tradeoffs.

Example eyewear:

**Appraisal Glasses**

- better treasure evaluation

**Dragon-Sense Lens**

- better danger awareness

**Surveyor Goggles**

- better exploration information

Later equipment can combine functionality.

---

## 43. Merchant

Merchant sells practical expedition equipment.

Categories can include:

**Carrying**

- bags

**Hauling**

- carts
- wagons
- sleds

**Tools**

- ropes
- pry tools
- straps
- lanterns
- hoists

**Identification**

- glasses
- lenses

**Special**

- high-tier rare equipment

Merchant automatically handles ordinary loot sale on return.

---

## 44. Mage

The Mage handles Skill Points and spell progression.

Core loop:

Recover treasure
→ receive gold
→ buy Skill Points from Mage
→ spend SP in skill tree

SP becomes progressively expensive in gold.

---

## 45. Core Skill Tree

Current rough branches:

### Strength

Possible effects:

- carry weight
- heavy-object efficiency
- loaded movement
- giant-object handling
- wagon pulling

### Stamina

Possible:

- max stamina
- recovery
- sprint efficiency
- heavy-carry drain reduction
- Second Wind

### Movement

Possible:

- walking speed
- sprint
- loaded movement
- climbing
- rough terrain
- faster movement through cleared areas

### Handling

Possible:

- pickup speed
- pull speed
- packing efficiency
- loading speed
- quiet handling
- rapid collection

### Awareness / Appraisal

Possible:

- value estimate
- weight information
- set recognition
- quest recognition
- valuable-object glint
- advanced appraisal

---

## 46. Skill Point Structure

Different skills cost different SP.

Rough possible node costs:

1 SP, 2 SP, 3 SP, 5 SP, 8 SP, 12 SP

Exact values TBD.

More powerful nodes can require multiple prerequisites.

Example:

A + B → unlock C

The developer specifically likes prerequisite combinations.

---

## 47. Spellbook Rule

The Mage does NOT simply sell all magic.

Spellbooks must be physically found inside the hoard.

Finding a spellbook:

1. immediately unlocks the base spell
2. opens its upgrade branch at the Mage

This makes spellbooks major discoveries.

---

## 48. Telekinesis

Base:

- pull one small object from short distance

Possible upgrades:

- range
- weight
- hold object
- control
- multi-pull
- quiet telekinesis
- heavy telekinesis
- mass pull

Possible capstone:

**Treasure Vortex**

Pull many loose treasure objects toward the player.

Do not make it instantly delete entire rooms.

---

## 49. Detection / Appraisal Magic

Possible base:

- brief pulse revealing unusually valuable treasure

Possible upgrades:

- range
- rare-object detection
- set detection
- quest detection
- magical-item detection
- buried-object penetration

Relic detection should be handled carefully as described in the Relic Detection section.

---

## 50. Featherweight

Base:

- temporarily reduce the weight of one object

Upgrades:

- stronger effect
- longer duration
- larger objects
- multiple objects
- wagon use
- lower disturbance

Capstone:

**Mass Featherweight**

---

## 51. Silence / Concealment

Base:

- temporarily reduce noise

Upgrades:

- longer duration
- quieter movement
- quieter pickups
- quieter dragging
- quieter wagon
- quiet telekinesis
- faster disturbance decay

Possible capstone:

**Veil**

Short window of dramatically reduced disturbance generation.

This is essentially a greed-enabling spell.

---

## 52. Recall / Extraction Magic

Late-game branch.

Base:

- send one small object directly to camp

Upgrades:

- more weight
- larger objects
- batches
- shorter cooldown
- wagon interaction

Possible capstone:

**Recall Cache**

IMPORTANT:
Do not unlock this too early or make it so strong that bags/wagons become irrelevant.

---

## 53. Hoard Sense

Exploration magic.

Base:

- detect unusual empty space or structure beneath nearby treasure

Possible upgrades:

- larger radius
- buried doorway detection
- secret voids
- old structure outlines
- ancient strata detection

Possible capstone:

**Deep Survey**

---

## 54. Optional Magic Ideas

Not fully locked:

- Stabilize treasure piles
- Dragon Sense
- Mark/Anchor
- defensive disturbance magic

Avoid turning the game into combat magic.

No need for fireballs/lightning as a core design.

---

## 55. Power Curve

Desired capability arc:

one object
→ handful
→ bagful
→ cartful
→ wagonful
→ whole treasure sections

---

## 56. Very Early Game

Player can:

- pick one item at a time
- carry little
- move slowly when loaded
- identify obvious valuables
- drag objects poorly
- return frequently

The hoard should feel impossible.

---

## 57. Early Game

Player gains:

- better bag
- stamina
- carry weight
- faster interaction
- basic appraisal
- simple hauling equipment
- first spellbook

---

## 58. Mid Game

Player begins using:

- Telekinesis
- multi-object handling
- cart/wagon
- stronger appraisal
- Featherweight
- better movement
- longer expeditions

Old rooms should already feel dramatically easier.

---

## 59. Late Game

Player can:

- collect clusters
- move massive treasure
- detect buried valuables
- use large wagons
- move giant items magically
- excavate old rooms rapidly
- carry huge amounts

---

## 60. Endgame

Possible absurd abilities:

- Treasure Vortex
- Greater Bag of Holding
- Master Appraisal
- Mass Featherweight
- Recall Cache
- advanced relic detection

Still avoid making the player press one button and erase an entire chamber.

---

## 61. Collector

Collector handles:

- treasure sets
- special requests
- quests
- rare recovery rewards
- Codex

---

## 62. Sets

Sets are predefined collections.

Example:

**ASHEN KNIGHT**

- Helm
- Sword
- Shield
- Breastplate

First piece discovered:

```
SET DISCOVERED
Ashen Knight
1 / 4
```

Missing pieces appear as silhouettes in Codex.

---

## 63. Set Sizes

Possible range:

- 2-piece: quick wins
- 3–4 piece: common standard
- 5–6 piece: longer-term
- Legendary: large multi-piece collections

Possible full game target: approximately 20–30 sets

NOT locked.

---

## 64. Set Extraction Variety

Different pieces may be physically different.

Example:

- Ring: tiny
- Helmet: normal inventory
- Sword: awkward
- Shield: heavy
- Giant ceremonial armor/statue: physical extraction

This makes completion more interesting than collecting identical pickups.

---

## 65. Set Completion

Completed sets go to Collector permanently.

Player receives:

- major gold payout
- possibly special reward

Possible extras:

- free SP
- equipment unlock
- Merchant stock
- spellbook
- passive
- quest
- rare information

Not every set needs a unique mechanical reward.

---

## 66. Codex

Completed sets are recorded in a Codex.

Possible information:

- set name
- pieces
- missing silhouettes
- description
- value
- Collector reward
- short lore
- completion status
- where pieces were found

This preserves collection progress without physically cluttering camp with hundreds of objects.

---

## 67. Quest Philosophy

Quests should reinforce the hoard gameplay.

Avoid generic fetch quests where only the object name changes.

Good quests should change HOW the player approaches the den.

---

## 68. Quest Types

- **Specific Recovery** — Find one named item.
- **Heavy Extraction** — Recover a giant object.
- **Category Hunt** — Recover several objects from a certain civilization/type.
- **Set Quest** — Complete a collection.
- **Discovery Quest** — Begins AFTER finding something strange.
- **Chain Quest** — One discovery leads to another.
- **Risk Quest** — Valuable item located in dangerous dragon territory.
- **Mystery Item** — Player finds unusual object before knowing its significance.

---

## 69. Quest Generation Safety

Never generate impossible quests.

Quest system must guarantee:

- item exists
- item is reachable
- item is not permanently destroyed
- required abilities are achievable
- chamber placement makes sense

---

## 70. Quest Rewards

Quests should pay VERY WELL.

Potential rewards:

- large gold
- gear
- free SP
- SP discount
- Merchant unlock
- special bag/cart
- spellbook
- passive
- Codex entry
- map information

Rough active quest count: 3–5 meaningful quests

Not 30 errands.

---

## 71. Treasure Generation

Treasure is divided conceptually into:

**Common procedural treasure**

Reusable families with variations.

Examples:

- coins
- goblets
- bowls
- rings
- swords
- helmets
- shields
- pottery
- books
- small chests
- jewelry boxes
- statues

**Rare valuables** — Distinct and higher-value.

**Set Pieces** — Predefined, protected from automatic sale.

**Quest Items** — Placed under controlled rules.

**Spellbooks** — Rare progression discoveries.

**Unique Relics** — One-off strange or special finds.

**Main Relic** — The primary objective.

---

## 72. Procedural Treasure Rule

Common loot can be highly procedural.

Important loot should be:

**procedurally placed under authored constraints.**

Do NOT rely entirely on unrestricted randomness for progression-critical items.

---

## 73. Discovery Cadence

The player should regularly experience meaningful finds.

Rough philosophy:

**Constant:**

- ordinary loot

**Every few minutes:**

- unusual valuable
- chest
- oversized object
- interesting find

**Less often:**

- set piece
- quest item
- hidden pocket
- rare item

**Rare major:**

- spellbook
- secret chamber
- unique relic
- huge jackpot

Use hidden dry-streak protection so RNG cannot produce long boring periods.

Do not make this feel like a visible timed system.

---

## 74. Anti-Repetition

Variety comes from:

- different treasure types
- different materials
- different chamber layouts
- different excavation problems
- different hauling problems
- different route choices
- quests
- sets
- spellbooks
- exploration
- dragon states
- giant extraction projects

The core action can remain simple while the player's decisions change.

---

## 75. Expedition Intent

The player generally chooses their own reason for entering.

Possible goals:

- make money
- explore
- complete quest
- find set piece
- search for spellbook
- recover abandoned wagon
- retrieve giant marked treasure
- search for relic
- open shortcut
- excavate chamber

The game does NOT need a rigid mission-select screen.

One expedition can change direction because of a surprise discovery.

---

## 76. Dragon Role

The dragon is alive and shares the den.

It is NOT a normal combat boss.

It provides:

- tension
- expedition pressure
- greed decisions
- dynamic world movement

---

## 77. Disturbance System

Player actions generate disturbance.

Possible examples:

| Action | Disturbance |
|---|---|
| Small object | low |
| Heavy armor | moderate |
| Dragging chest | higher |
| Dropping massive object | high |
| Mass Telekinesis | very high |
| Moving giant statue | extreme |

Location also matters.

Deeper regions can be more sensitive/dangerous.

---

## 78. Dragon Threat Philosophy

The player becomes more powerful over time.

But their ambitions become louder.

Early:

- small jobs
- low disturbance

Late:

- giant wagons
- huge statues
- mass magic
- giant treasure clearing

So the player's own greed keeps the dragon relevant.

---

## 79. Dragon Alert Stages

Rough structure:

### Calm / Warning

Signs:

- breathing
- rumble
- treasure movement

Player can continue.

### Active Search

Dragon begins moving through den.

Player may:

- retreat
- hide
- reroute
- abandon cargo
- use Silence
- use shortcuts

### Critical

Dragon is near.

Player needs to immediately avoid its path.

---

## 80. Hiding

Keep hiding simple.

Do NOT turn the game into a complicated stealth simulator.

Possible safe-ish spots:

- narrow tunnels
- behind huge treasure piles
- ruined side chambers
- stone arches
- behind statues
- crawl spaces

Dragon cannot physically enter every route.

---

## 81. Dragon Movement

The dragon physically exists somewhere in the den.

Possible behaviors:

- sleeping
- resting
- moving between major chambers
- investigating noise
- crossing large routes

Dragon should not teleport to the player.

If the player creates a huge crash in one chamber and quietly leaves, the dragon can investigate that location.

This allows emergent distraction strategies.

---

## 82. Dragon Navigation

Dragon can access:

- giant halls
- wide tunnels
- large caverns
- major chambers

Dragon may not access:

- narrow passages
- tiny ruins
- crawlspaces
- tight shortcuts

These can become player escape routes.

---

## 83. Dragon Movement Affects Treasure

Very important.

When the dragon physically moves through the den:

- coins slide
- piles shift
- objects tumble
- treasure may partially collapse
- routes may become partially blocked
- another route may open
- previously buried objects may become exposed

The player may return to a familiar chamber and realize:

> "The dragon moved through here."

This makes the world feel alive.

---

## 84. Dragon Presence by Depth

- Near entrance: rare direct presence
- Middle: more signs, occasional crossings
- Deep: common dragon activity
- Inner: core dragon territory

Avoid random unavoidable kills.

Danger should have warnings.

---

## 85. Dragon Leaving the Den

The dragon can sometimes leave the cavern entirely.

Potential duration: several in-game days

During this period:

- no normal dragon presence
- safer deep exploration
- ideal time for loud excavation
- major extraction
- wagons
- giant statues
- mass Telekinesis

The player should infer its absence.

Do NOT simply display:

~~DRAGON AWAY: 3 DAYS~~

Possible clues:

- no breathing
- no heat
- no smoke
- silent nest
- no rumble
- Dragon Sense says no presence

---

## 86. Dragon Return

The player should not necessarily know the exact return time.

Possible warning signs:

- distant roar outside
- animals fleeing
- tremor
- smoke returning
- heat
- faint Dragon Sense signal

Then danger returns.

This creates moments like:

> "The dragon is coming back and I'm deep inside with a loaded wagon."

---

## 87. Short-Term vs Long-Term Dragon Rhythm

- Short-term: disturbance during individual expeditions
- Long-term: dragon presence / absence across days

These systems overlap.

---

## 88. Death

If dragon catches player:

No combat.

Possible sequence:

- fire
- flash
- cut to black

Later:

- burned/scorched remains
- bones
- lost equipment nearby

Keep presentation stylized rather than graphic.

---

## 89. New Hunter

Death fiction:

> A new relic hunter arrives.

Long-term progression continues.

This allows death to feel real without resetting the whole incremental game.

---

## 90. What Is Lost on Death

Possible:

- current unsecured expedition treasure
- abandoned cart/wagon
- carried oversized object

These remain in the cave and may be recovered.

Permanent progression remains:

- skills
- discovered spellbooks
- completed sets
- major progress
- world excavation
- unlocked gear

Important progression items should not create frustrating permanent-loss situations.

---

## 91. Previous Hunter

Death location may show:

- bones
- equipment
- lost wagon
- map marker

This creates organic recovery expeditions.

---

## 92. Ending

Main ending:

Player eventually finds the legendary relic.

The moment it is taken:

the dragon fully wakes.

Normal disturbance rules no longer matter.

The final sequence becomes an escape.

Player must use:

- map knowledge
- shortcuts
- movement
- stamina
- abilities
- cleared routes
- Telekinesis
- experience with the den

Escape to camp.

Main story complete.

---

## 93. Postgame

Do not necessarily destroy the save after the ending.

Player may continue to:

- excavate remaining hoard
- complete sets
- finish quests
- find spellbooks
- uncover secret chambers
- recover giant treasure
- complete Codex
- reach 100%

Exact post-ending dragon fiction can be decided later.

---

## 94. Completion Tracking

Potential categories:

- Hoard Excavated
- Chambers
- Sets
- Spellbooks
- Quests
- Codex
- Secrets

Do not necessarily overwhelm player with percentages from the beginning.

---

## 95. New Game Replayability

A new game can regenerate:

- cave layout
- chamber arrangement
- treasure composition
- spellbook positions
- set locations
- quest items
- main relic location
- giant valuables
- shortcuts

Player understands systems but does not know the map.

---

## 96. New Game+

Optional future idea only.

Possible:

- harder dragon
- new sets
- rarer treasure
- extra spellbooks
- deeper regions
- different relic

Do NOT make NG+ necessary for initial version.

---

## 97. Target Length

6–10 hours felt too short.

Current rough target:

- Main relic: 12–18 hours
- Main + substantial side content: 18–25 hours
- 100%: 25–35+ hours

These are NOT locked.

Prototype testing should determine real pacing.

---

## 98. Visual Direction

Very important:

Do NOT make this AAA.

Do NOT make it photorealistic.

The developer is a beginner.

Preferred direction:

- stylized 3D
- low-poly to medium-low-poly
- clear shapes
- simple materials
- attractive lighting
- readable silhouettes
- warm gold vs dark cool stone
- game-like
- simple enough to realistically build

The most recent visual direction the developer liked was significantly simpler than earlier realistic concept images.

---

## 99. Graphics Should NOT Be

Avoid:

- photorealistic treasure
- complex realistic metal shaders
- ornate AAA architecture everywhere
- extreme texture detail
- hundreds of unique environment assets
- complicated realistic humans
- excessive particles
- excessive bloom
- cinematic depth of field everywhere
- extremely complicated UI
- over-rendered concept-art look

The game should look like an achievable indie title.

---

## 100. Treasure Art Philosophy

Scale matters more than fidelity.

Prefer:

100 simple reusable treasure assets convincingly forming a massive hoard

over:

10 ultra-detailed objects

Useful reusable families:

- coin
- coin pile
- goblet
- cup
- pottery
- gem
- ring
- crown
- shield
- helmet
- sword
- chest
- book
- statue
- jewelry box

Use:

- scale variation
- material variation
- color variation
- rotation
- clustering
- procedural distribution

to create diversity.

---

## 101. Beginner-Friendly Visual Target

A good target is:

**Simple Polished Indie**

Not ultra-low-effort blockout.

Not high-end stylized AAA.

Possible characteristics:

- low-poly/simple meshes
- clean stylized textures
- Unity URP
- baked/simple lighting where possible
- selective dynamic lights
- modest VFX
- simple clean HUD

---

## 102. UI Direction

Minimal.

Examples in gameplay:

- Top-left: Gold
- Bottom-left: Bag / Weight
- Bottom-right: Dragon Disturbance
- Center: small crosshair
- Context prompt: `[E] Pick Up Ancient Spellbook`

Do NOT fill screen with ornate fantasy frames.

Use clean readable game UI.

---

## 103. Technical Hoard Implementation

**DECIDED (developer decision, after playing Prototype 0.1):** the hoard is made
**entirely of pickable items**. There is no visible non-interactive "hill" of
fake treasure. Everything the player can see in the pile can be taken or moved.

CRITICAL (still true):

Do NOT create 100,000 or 1,000,000 individual rigidbody GameObjects.

The trick that makes an all-items hoard affordable: only the **top layer**
of the pile exists as objects. Everything underneath exists only as data
until it is uncovered.

---

## 104. Hoard Layer 1 — Columns of Item Layers

The pile is a grid of small columns (0.5 m in the prototype). Each column is
a stack of thin layers (0.2 m), and each layer holds 3–4 real items, clumped,
stacked on each other and varied in size so the pile looks cluttered.
Treasure lies in patches (coin drifts, weapon and armour piles, heaps of cups
and plates), like whole hauls the dragon dragged in at once.

- The grid only stores how many layers each column has left.
- The items in a layer are rolled from a seed for that column, so they are
  the same every time the game loads.
- A dark surface just under the item tops shows only as shadow in the gaps.
  It is never seen as a hill of its own.

This represents most of the hoard mass without storing it.

---

## 105. Hoard Layer 2 — The Visible Top Layer (instanced, all pickable)

Every column's top layer is drawn with GPU instancing, one batch per item
type and material:

- coin heaps
- swords
- gems
- cups
- shields
- etc.

Every one of them is pickable. They do NOT need full physics.

**Nothing refills.** Taking an item leaves a real gap that stays. Only when
every item of a column's top layer is gone does that spot drop one layer and
show what is underneath.

---

## 106. Hoard Layer 3 — Loose Items

Items the player has tossed aside are stored individually as "loose" items and saved with their
positions. They are still drawn through the same instanced batches.

Use:

- object pooling
- limited colliders
- limited physics

---

## 107. Special Items

Always real authored objects:

- spellbooks
- quest items
- set pieces
- giant treasure
- unique relics
- main relic

---

## 108. Hoard Depletion

Each column tracks:

**Layers Remaining** (plus which items of its top layer are already gone)

As the player takes and tosses items:

- the pile lowers
- new layers of items are uncovered once a spot is fully cleared
- holes stay where the player dug them (no automatic sliding or refilling)
- architecture becomes exposed

Save the layer counts, which items are gone, and the loose items, never
every individual item. **The den remembers its state exactly:** it saves
continuously during an expedition (and when the game is closed), not only at
camp, including the player's bag and position.

**Excavation verb:** "Toss aside" replaces digging. The player throws an item
out of the way without bagging it. Shovel upgrades toss several items at once
(1 → 2 → 3 → 5 → 8), which follows the power curve in section 55.

---

## 109. Temporary Physics

When a dramatic event happens:

- promote some nearby treasure instances to physics
- let them tumble
- later settle/pool/remove

This gives spectacle without simulating the entire cave.

---

## 110. Saving

The save system should remember:

- procedural world seed/layout
- excavated chunk state
- opened routes
- special item status
- set pieces
- spellbooks
- quests
- abandoned carts/wagons
- dropped important treasure
- previous hunter deaths
- camp progression
- skills
- purchased gear
- dragon state

Do NOT save every individual coin position.

---

## 111. Beginner Reality

The full dream game is too large to build immediately.

The correct strategy is:

DO NOT start by building the entire game.

Start with:

**Dragon Hoard Prototype 0.1**

The first question is:

> Is searching through a treasure hoard in first person actually fun?

---

## 112. Prototype 0.1

Start with ONE chamber.

Include:

- first-person movement
- simple stylized cave
- large fake treasure mound
- normal treasure pickup
- bag space
- weight
- return point/camp
- automatic selling
- gold
- one or two upgrades
- one hidden special item
- pile visibly lowering
- simple UI

Optional if manageable:

- basic disturbance bar

Do NOT start with the procedural world.

---

## 113. Prototype 0.2

If 0.1 is fun:

Add:

- 2–4 chambers
- simple map
- cart/wagon
- one spellbook
- Telekinesis
- one quest item
- one set piece
- simple dragon-pressure behavior

---

## 114. Later Development

Only after core loop proves fun:

- procedural chamber arrangement
- advanced dragon AI
- dragon leaving for days
- giant extraction
- skill tree
- multiple spellbooks
- sets
- Codex
- quests
- deeper treasure progression
- complex persistence

---

## 115. Engine

Current preferred engine:

**Unity** — likely Unity 6 + URP

Reason:

- beginner-friendly relative to target
- asset ecosystem
- developer already working with Unity/Codex
- stylized visuals fit well
- no need for Unreal-level photoreal rendering

---

## 116. AI / Tool Workflow

The developer is comfortable using AI heavily.

Potential tools:

- Codex / ChatGPT
- Claude Code
- Unity
- Blender
- Meshy
- Unity Asset Store

Recommended philosophy:

Use AI/code tools for:

- implementation
- system architecture
- editor tooling
- procedural generation
- debugging

Use asset packs / Meshy / Blender for:

- reusable cave assets
- treasure objects
- carts
- camp props
- simple stylized models

Do not attempt to hand-create every asset from scratch.

---

## 117. Important Competitor Differentiation

A nearby concept exists:

**Gildoria – Organize a Dragon's Hoard**

Dragon Hoard must NOT become primarily:

> organize a dragon's hoard

Our identity is:

- outsider relic hunter
- first-person
- excavation/search
- stealing/recovering treasure
- living dragon threat
- camp economy
- huge incremental progression
- bags/wagons
- spellbooks
- sets
- quests
- procedural den
- relic detection
- one legendary target
- final escape

Do not copy another game's:

- exact art
- UI
- characters
- writing
- layouts
- assets

---

## 118. Important Story/IP Rule

The fantasy of searching for a specific treasure inside a dragon hoard is a broad fantasy trope.

Do NOT copy Tolkien-specific expression such as:

- Smaug
- Erebor
- Arkenstone
- Thorin
- Lonely Mountain
- exact scenes
- exact dialogue
- exact visual design

Create an original:

- dragon
- relic
- world
- cultures
- history

---

## 119. Remaining Design Areas

The core identity is now strongly defined.

Still needs detailed later design:

- **A. Exact Economy Numbers** — gold/hour, upgrade costs, SP cost curve, gear pricing, quest payouts, set payouts
- **B. Exact Skill Trees** — final nodes, SP costs, prerequisites, progression timing
- **C. Camp UI** — Merchant screen, Mage screen, Collector, Codex, preparation
- **D. Map UI** — discovered areas, markers, shortcuts, abandoned cargo, no main-relic guidance
- **E. Treasure Rarity / Visual Hierarchy** — materials, rare objects, visual recognition, avoid excessive RPG glow
- **F. Environmental Obstacles** — collapses, buried doors, vertical shafts, giant blockers, magical seals, unstable treasure
- **G. Secrets** — hidden chambers, false walls, treasure beneath treasure, rare one-offs, secret spellbooks
- **H. Day System** — how time advances, how long dragon absences last, rest rules, preventing abuse
- **I. Exact Save Architecture**
- **J. First 10–20 Minutes**
- **K. Art Bible**
- **L. Full Prototype Implementation Plan**

---

## 120. First 10–20 Minutes — Rough Intent

Not fully designed yet, but desired experience:

1. Player arrives.
2. Sees impossible hoard.
3. Starts with tiny carrying ability.
4. Enters first area.
5. Picks up a few simple valuables.
6. Bag fills quickly.
7. Returns.
8. Sees money increase.
9. Buys first meaningful improvement.
10. Returns.
11. Can now noticeably do more.
12. Soon discovers something unusual buried in treasure.

Player understands:

> This whole mountain contains things.

Dragon presence is introduced gradually.

Do NOT overwhelm player with every system at once.

---

## 121. Design Rules for Future Work

When continuing Dragon Hoard:

**DO:**

- protect the core incremental fantasy
- prioritize visible progression
- keep exploration worthwhile
- make major upgrades transformative
- keep dragon tension meaningful
- keep the player searching rather than following markers
- respect beginner scope
- fake scale intelligently

**DO NOT:**

- overcomplicate survival systems
- turn game into combat RPG
- fill screen with quest markers
- make relic search GPS-driven
- simulate every coin
- build AAA graphics
- require full excavation for story progression
- make every room identical
- make camp menu-heavy
- make upgrades trivial
- make progression brutally grindy
- make dragon constantly interrupt gameplay

---

## 122. Current Core Identity in One Paragraph

Dragon Hoard is a first-person stylized indie incremental treasure-excavation game set inside one enormous procedurally arranged but persistent dragon den. The player begins almost powerless, manually searching huge physical treasure piles, carrying tiny amounts back to camp, selling them for intuitive gold value, and gradually buying increasingly expensive gear and Skill Points. Spellbooks discovered inside the hoard unlock new magical branches such as Telekinesis, Featherweight, Silence, Recall, Hoard Sense, and eventually limited Relic Detection. Bags handle normal loot while carts, wagons, magic, and prepared routes handle larger treasure. Chambers have distinct loot identities and excavation problems. Sets, quests, giant valuables, spellbooks, secrets and rare jackpots constantly reward searching. The living dragon physically occupies and moves through the den, reacts to disturbance, shifts treasure as it moves, may temporarily leave the cavern for several in-game days, and creates greed-based expedition pressure rather than combat. The player receives no normal guidance toward the legendary target relic and is meant to become lost and explore extensively; only later progression can provide limited, non-spammable relic sensing. Eventually the relic is found, the dragon fully wakes, and the game culminates in an escape using the player's accumulated knowledge, shortcuts, skills, and power.

---

## 123. The Most Important Production Rule

Before building the entire game:

**MAKE ONE TREASURE CHAMBER FUN.**

If:

- picking treasure
- uncovering buried things
- deciding what to carry
- watching the pile shrink
- returning and buying an upgrade
- becoming noticeably stronger

is satisfying in one room,

then expand.

If that is not satisfying, do not try to solve it by adding:

- procedural generation
- more story
- more NPCs
- more graphics
- more quests

The treasure interaction itself is the foundation.

---

## 124. How AI Assistants Should Help

When given this document:

1. Treat it as the current Dragon Hoard source of truth.
2. Do not replace systems casually.
3. Point out scope risks honestly.
4. Favor beginner-achievable implementations.
5. Keep first person.
6. Keep graphics stylized and achievable.
7. Keep the incremental progression strong.
8. Do not turn the game into an organizer.
9. Do not turn it into a combat RPG.
10. Do not add relic-map guidance unless specifically asked.
11. When proposing code architecture, keep systems modular.
12. When giving implementation steps, say exactly what to build first.
13. If a feature is too ambitious, propose a cheaper illusion that preserves the fantasy.
14. Distinguish prototype requirements from full-game requirements.
15. Preserve the feeling:
    > "There is an impossible amount of treasure here, and I'm slowly becoming powerful enough to conquer it."
