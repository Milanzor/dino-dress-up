# Dino Dress-Up — "Dino Dagje Uit" (Sunny Valley Story)

## Context

We're building a **brand-new browser game from scratch** (the project directory
`/home/milan/projects-prive/dino-dress-up` is currently empty) for **Dutch
pre-readers, ages 3–5**. The game is a **stylized low-poly 3D, third-person
dino dress-up story**: the child first creates and customizes their own dino,
which persists in `localStorage`, then plays through a multi-chapter, branching
story where **choices accumulate and matter** (earlier picks change who shows up
and how the story ends). Controls must be trivially simple (arrow keys + space,
plus touch for tablets) with **no fail states** — every branch leads to a
different *fun*, never a punishment.

Decisions already made with the user:
- **Visual/tech:** stylized low-poly 3D, third-person follow camera (Three.js).
- **Audience:** pre-readers (3–5) → **all choices are picture/icon buttons with
  Dutch audio narration; no reading required anywhere.**
- **Language:** **the entire game is in Dutch.** Player-facing content (audio +
  the few on-screen words) is Dutch; code/identifiers/comments stay English.
- **Choice interaction:** **tap-to-hear, tap-again-to-confirm** — first tap on a
  picture button speaks it in Dutch + highlights it; a second tap on the *same*
  button confirms. Kids can re-listen freely; no accidental commits.
- **Dress-up patterns (spots/stripes):** **included in v1** (color + belly +
  pattern + accessories).
- **Scope approach:** plan the full game outline up front (below), then build in
  phased vertical slices.
- **"Claude Design" clarification:** the DesignSync tool syncs a **2D UI design
  system** (HTML/CSS: title, character-creator panel, choice dialog, HUD). It
  does **not** generate 3D models. Dino/world art comes from **CC0 low-poly
  packs** (Quaternius animated dinosaurs, Kenney props) + runtime recolor.

## Tech stack

| Concern | Choice | Note |
|---|---|---|
| Build/dev | **Vite + TypeScript** | fast HMR, simple |
| 3D | **Three.js (vanilla, r170+)** — NOT react-three-fiber | scene is small/imperative; R3F adds JS overhead for no gain here |
| glTF | `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, **`SkeletonUtils.clone`** | safe cloning of skinned/animated dinos |
| Materials | **`MeshToonMaterial`** + gradient map | cute look + cheap on tablets |
| Narrative | **inkjs** (+ `inklecate`/compiler build step) | branching, variables, visit-tracking, serializable state |
| Audio | **Howler.js** + a TTS fallback (`nl-NL` Web Speech) | placeholder VO during dev |
| State | small vanilla store (Zustand vanilla or hand-rolled emitter) | no React |
| UI | **No framework** — Claude Design HTML/CSS modules | overlay on the canvas |

## Architecture

Single full-screen `<canvas id="game-canvas">` (z0) with an HTML
`<div id="ui-root">` overlay (z10, `pointer-events:none`; interactive panels opt
back in). **Strict module boundaries** — systems talk only through types;
`src/app/GameApp.ts` is the *only* wiring point.

```
src/
  main.ts                       bootstrap
  app/
    GameApp.ts                  orchestrator — runs the story loop, wires everything
    AppState.ts                 single source of truth (character, progress, sceneId)
    flow.ts                     Title -> Creator -> Story state machine
  engine/
    Renderer.ts                 WebGLRenderer + rAF loop + clock; DPR capped at 2
    SceneManager.ts             builds/tears down active level scene, transitions
    CameraRig.ts                third-person follow + damping + soft bounds
    Loader.ts                   GLTFLoader (+DRACO/KTX2) with asset cache
    Lighting.ts                 reusable cute lighting presets (day/sunset/cave)
  character/
    CharacterConfig.ts          config type + per-species RIGS manifest
    DinoFactory.ts              clone glb, recolor, mount accessories -> DinoActor
    DinoActor.ts                mesh + AnimationMixer + locomotion (idle/walk/happy)
    Recolor.ts                  material recolor + pattern texture application
    AccessoryMounter.ts         attach accessory meshes to bones/sockets
  story/
    StoryEngine.ts              wraps inkjs; turns Ink tags -> typed Beat/Choice events
    ink/story.ink               authored Dutch narrative (source)
    story.json                  compiled build artifact
    SceneDescriptor.ts          level data type
  levels/scenes.ts              registry: sceneId -> SceneDescriptor (data-driven)
  ui/
    UIRoot.ts                   mounts/unmounts panels into #ui-root
    components/                  TitleScreen, CharacterCreator, ChoiceDialog, HUD
    styles/                      Claude Design CSS
  audio/
    AudioService.ts             narrate()/prompt()/sfx()/ambient()/unlock()
    AudioManifest.ts            clipId -> { file?, text? (Dutch, for TTS) }
  input/InputController.ts      keyboard + touch -> {move, interact} intents
  save/
    schema.ts                   SaveStateV1 + CURRENT_VERSION
    SaveManager.ts              load/save/clear localStorage (fail-soft)
    migrations.ts               v(n)->v(n+1)
tools/compile-ink.mjs           ink -> json (npm prebuild/dev script)
public/{models,audio,icons,env}/  CC0 assets, Dutch VO, choice icons
```

### The story loop (heartbeat)

1. `StoryEngine.continue()` pulls the next Ink line; its **tags** carry
   `scene:<id>`, `narrate:<clipId>`, and (at choice points) per-choice
   `icon:<id>` + `audio:<clipId>`. **Ink's emitted text is ignored** — pre-readers
   never see it; tags are the bridge to 3D/audio/UI.
2. `scene:` changed → `SceneManager.load(SCENES[id])`, re-place the dino, retarget camera.
3. `narrate:` → `AudioService.narrate(clipId)` (Dutch).
4. Choice point → `UIRoot.showChoices(pictureChoices)`.
5. Child taps a button → hears Dutch prompt + it glows; taps the **same** button
   again → confirm SFX → `StoryEngine.choose(index)` → loop repeats.
6. After each choice `AppState.progress` updates and `SaveManager` autosaves (debounced).

Between scripted beats the child can **free-roam** the dino (arrows/touch). Story
advances only on explicit `interact` (space, or stepping into a glowing
interaction zone); choice dialogs are modal and pause locomotion. No walls —
soft bounds gently nudge the dino back; camera always keeps it centered.

### Dress-up (runtime, onto a glTF dino)

`CharacterConfig` = `{ species, bodyColor, bellyColor?, pattern:
'none'|'spots'|'stripes', accessories: [{slot,id}] }`.

- **Clone** the cached glTF per actor with `SkeletonUtils.clone` (preserves skeleton/anim bindings).
- **Recolor:** traverse, **clone each material before editing** (don't mutate the
  shared cache), `material.color.set(...)`. Part→material mapping comes from the
  per-species **`RIGS` manifest** — the single file that absorbs CC0 naming quirks.
- **Patterns (v1):** pre-authored tiling spots/stripes textures assigned to
  `material.map` + color tint (robust across inconsistent UVs).
- **Accessories:** separate small `.glb`s parented to the matching **bone**
  (`skeleton.getBoneByName(...)` from the manifest) with per-(species,slot)
  position/rotation/scale offsets, so they follow head/back animation automatically.
- **Live preview:** the creator runs a turntable scene; changing any value calls
  `DinoFactory.apply(config)` in place (no reload). Confirm → commit to `AppState` + save.

The `RIGS` manifest (`character/CharacterConfig.ts`) maps, per species:
material-slot names, bone names per accessory slot, socket offsets, and semantic
clip names (`idle`/`walk`/`happy`). **No cross-skeleton animation retargeting** —
each species plays its *own* baked clips referenced by this map.

### Save schema (localStorage)

One namespaced key `dino-dress-up:save`, versioned envelope:
`{ version, character, story:{ inkState, currentSceneId, choiceHistory }, meta }`.
`inkState` = `story.state.ToJson()` — Ink's full serialized runtime state, which
*is* "every choice that mattered." Load reads `version` first, runs forward
`migrations` sequentially, and **fails soft → fresh start** on any
corruption/unknown version (a kids' game must never hard-crash on a bad save).
All access wrapped in try/catch (private mode / quota). Parent-gated "opnieuw
beginnen" (start over) on the title.

## Full story outline — "Dino Dagje Uit" (Dutch)

One day in Sunny Valley, building to **Het Grote Dino Feest**. ~8 chapters / ~17
scenes, a choice in almost every scene, all narrated in Dutch with picture
buttons. Accessories and friends earned along the way feed back into dress-up and
shape the finale. Dutch-friendly names (e.g. Trix the triceratops, Bronto, baby
Ptera, little sibling Pip).

1. **Thuis (Home Sweet Nest):** Wake up (stretch/bounce/yawn → personality
   flavor in narration) · Breakfast (berries/greens/seeds → snack to share later) ·
   Get dressed (sun hat / rain cape / explorer pack / party crown → affects weather
   scene + festival look).
2. **De Wijde Wereld In:** Say goodbye (Mama/Papa/sibling Pip — Pip can tag along
   as a helper) · The fork (Meadow first 🌸 or River first 💦 → order changes who you meet).
3. **Bloemenwei (Meadow):** Help Trix find her bouncy ball (search grass / ask
   butterflies / lure with snack → earn **Bloemenkroon**, Trix joins) · Meadow
   treasure shell (keep / share with a tiny dino → kindness + **Vriendschapssticker**).
4. **Rivier (River):** Crossing (stepping stones / log bridge / ask gentle Bronto
   for a lift → Bronto befriended) · Help baby Ptera reach her nest (build a ramp /
   call grown-up Pteras / ride your back uphill → earn **Verenbadge**, Ptera joins).
5. **Fluisterbos & Glittergrotten:** The woods, cozy-not-scary (hold a friend's paw
   / hum a brave song / light a **glow-mushroom lantern** → courage + lantern) · Cave
   sparkles, gentle color-match (pick a **kristalkleur** → festival decoration color).
6. **De Verrassing:** Sudden rain — rain cape = cozy; otherwise a friend shares an
   umbrella (kindness shown *to you*). Then huddle / share snack / sing a rain song
   → grows the festival crew.
7. **Klaarmaken:** Pick your act (dance / sing / fashion parade / show-and-tell
   about friends → shapes finale) · Final touch-up (combine earned accessories →
   choose final festival look).
8. **Het Grote Dino Feest:** The arrival (the friends you actually made show up) ·
   Your moment (perform your chosen act) · The ending — a warm group celebration
   with a **variant** from your journey: *Vriendschapsfeest*, *Modester*,
   *Dappere Ontdekker*, or *Lief-zijn-Kampioen*. All endings happy.

Branch-state (Ink variables) tracked across levels: outfit, breakfast snack, path
order, friends made (each can appear at the festival), keepsakes earned, kindness,
courage, chosen act → these combine to pick the ending and populate the finale.

**Bonus systems:** accessories earned mid-game keep growing the dress-up;
a **sticker/friend album** persisted in localStorage across playthroughs gives a
reason to replay other paths.

## Phased build order (each phase is runnable + demoable)

- **Phase 0 — Skeleton:** Vite+TS+Three scaffold; full-screen canvas + spinning
  placeholder; `#ui-root` overlay; "tik om te starten" button that fires
  `AudioService.unlock()` (required for tablet/iOS autoplay).
- **Phase 1 — One dino walking (the charm gate):** `Loader` + render loop; load one
  Quaternius dino; `DinoActor` idle/walk; `InputController` (arrows + touch);
  `CameraRig` follow. **Test on a real tablet here.**
- **Phase 2 — Dress-up slice:** `CharacterConfig` + `RIGS`; `DinoFactory` recolor
  (body + belly) + **patterns** + one accessory via bone sockets; Dutch
  `CharacterCreator` UI (icon buttons + turntable preview); commit to `AppState`.
- **Phase 3 — Persistence:** `SaveManager` v1 schema + migration scaffold; character
  survives reload; parent-gated "opnieuw beginnen."
- **Phase 4 — Story engine, one branch:** inkjs + `compile-ink.mjs`; a 2-scene Dutch
  `story.ink` with one picture-choice (tap-to-hear/tap-to-confirm) that branches;
  `StoryEngine` events → scene load + Dutch narration + choice dialog. Proves the
  whole loop end-to-end.
- **Phase 5 — Full branching story:** author all ~17 scenes; Ink variables set early
  that change later levels + the ending; persist `inkState`; friend album / recap.
- **Phase 6 — Polish:** toon materials + lighting presets; ambient audio;
  transitions/animations; **swap TTS placeholder → recorded Dutch VO** via the
  manifest (data change, no code change); accessibility + parent gate; tablet perf
  pass (DPR cap, draw-call/material audit).

## Critical files (design determines success)

- `src/app/GameApp.ts` — sole orchestrator; runs the story loop.
- `src/character/DinoFactory.ts` + the `RIGS` manifest in `CharacterConfig.ts` —
  absorbs all model-specific quirks for recolor / patterns / accessory mounting.
- `src/story/StoryEngine.ts` — turns Ink tags into 3D/audio/UI events; the bridge
  that makes a text engine drive a non-reading, Dutch, audio-first game.
- `src/levels/scenes.ts` — data-driven `SceneDescriptor` registry.
- `src/save/schema.ts` + `migrations.ts` — versioned, fail-soft localStorage envelope
  storing `CharacterConfig` + serialized Ink state.
- `src/audio/AudioManifest.ts` — clipId → Dutch file (or TTS text); the seam for
  swapping placeholder narration for recorded VO.

## Risks & mitigations

- **Animation across different dino models** (biggest risk): don't retarget across
  skeletons — each species plays its own baked clips via the `RIGS` `clips` map;
  missing `happy` falls back to `idle`.
- **Tablet performance:** keep it small — one low-poly skinned dino, toon materials,
  minimal/one cheap shadow, `setPixelRatio(min(dpr,2))`, target 30–60fps. Fallback
  in back pocket: same architecture works with a 2.5D sprite dino (only `engine/` +
  `character/` change).
- **CC0 asset quirks:** DRACO/meshopt decoding; inconsistent material/bone names
  (absorbed by `RIGS`); accessory scale/orientation tuned per socket; match
  Kenney accessory art style to the toon look (recolor if needed).
- **Audio autoplay (iOS/Safari):** unlock on the title tap; test on real iPad early.
- **Free-roam vs story order:** story advances only on explicit `interact`; choice
  dialogs modal; soft bounds, no fail states.

## Verification (how we'll test end-to-end)

- `npm run dev` → Vite serves; open in desktop browser **and a real tablet**.
- **Phase gates are the test plan:** P1 = a dino you can walk with arrows/touch,
  camera follows, runs smoothly on a tablet. P2 = customize color/belly/pattern/hat
  and that exact dino is the one that walks. P3 = reload the page → same dino
  persists; "opnieuw beginnen" clears it. P4 = a Dutch-narrated choice (tap-to-hear,
  tap-to-confirm) branches to a different scene. P5 = a choice in an early chapter
  visibly changes a later chapter and the ending; corrupt the save → game starts
  fresh without crashing.
- Quick checks: `localStorage['dino-dress-up:save']` holds versioned character +
  Ink state; with audio files absent, `nl-NL` TTS still narrates every line; choice
  buttons are ≥96px touch targets with no required reading.
