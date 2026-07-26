# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Heads Up" — a forehead-guessing party game built with Expo (managed workflow) + TypeScript. One player holds the phone against their forehead (landscape, screen facing the group); the group describes a word without saying it; the forehead player tilts the phone down for correct, up to pass. A countdown timer runs the round, then a results screen shows the breakdown.

No traditional backend, but category/word data is **not** bundled in the app — it's fetched at runtime from a static `categories.json` served via `raw.githubusercontent.com` off this repo's `main` branch (see "Category data is fully remote" below). The app ships with zero categories built in.

## Commands

```bash
npm start          # start Metro dev server (scan QR with Expo Go, or connect a dev client)
npm run ios        # start + open iOS simulator
npm run android    # start + open Android emulator
npm run web        # start + open web
npx tsc --noEmit   # typecheck (no separate lint/test scripts are configured)
npx expo-doctor    # verify Expo project health / dependency compatibility
```

EAS builds (`eas.json`): `development` (dev client, internal distribution), `preview` (internal distribution), `production`. Gyroscope/accelerometer-based tilt detection **cannot be tested in Expo Go simulators or the web target** — it requires a real device.

## Architecture

### Navigation flow is a fixed linear stack, and gameplay params are threaded through it

`Home → CategorySelect → Countdown → Gameplay → Results`, defined in `src/navigation/types.ts` (`RootStackParamList`) and wired in `src/navigation/RootNavigator.tsx` (`native-stack`, headers hidden). Each screen forwards `playerCount` / `categoryId` / `durationSeconds` to the next via route params rather than any shared state/context — there is no global store. `Countdown` and `Gameplay` both replace themselves in history (`navigation.replace`) rather than pushing, so the back stack doesn't accumulate mid-round screens. `Results`'s "Play again" uses `navigation.reset()` instead of `navigate()` — React Navigation v7 no longer auto-collapses back to an existing screen already in the stack, so `reset` is required to avoid stale duplicate `CategorySelect`/`Results` entries in history.

### Orientation locking is pre-emptive, not reactive

The gameplay screen must be locked landscape (`LANDSCAPE_RIGHT` specifically, not the `LANDSCAPE` range lock — see comment in `CategorySelectScreen.tsx`/`GameplayScreen.tsx` for why a range lock flickers when the phone is held vertically against a forehead). To avoid a portrait flash, the lock is triggered in `CategorySelectScreen`'s `handleStart` *before* navigating, not in `GameplayScreen`'s mount effect (that's just a safety-net re-assert). It's unlocked back to portrait only when `GameplayScreen` unmounts.

### Tilt detection (`src/hooks/useTiltDetection.ts`) fuses two sensors deliberately — don't simplify to one

- **Gyroscope is the trigger.** A nod is a rotation, not a static posture, and "at rest" is ~0 on all gyro axes regardless of how the phone happens to sit against a given forehead. An earlier accelerometer-only approach failed because whichever axis was picked could sit near its ±1g saturation point at rest depending on holding angle, making one tilt direction nearly undetectable.
- **Accelerometer corroborates direction only**, evaluated on its *own* dominant axis — which is deliberately not the same axis the gyroscope triggered on, since rotating around an axis doesn't change the accelerometer reading on that axis, only the other two.
- A hard time-based refractory window (`REFRACTORY_MS`) follows every trigger, not a "return near baseline" gate — the head/phone swinging back to resting position after a nod is itself a rotation and would otherwise misfire as the opposite gesture.
- `TILT_SIGN` is the escape hatch for a device where direction comes out inverted — flip it before touching the detection logic.

This hook can only be validated on a physical device; when changing thresholds, get it tested on-device before assuming it works.

### Screens own their own sensor/lifecycle side effects

`GameplayScreen` composes `useKeepAwake` (screen-stays-on only during a round), `useTiltDetection`, and the orientation lock in the same component — there's no shared "round" abstraction. Word queue/scoring state (`wordQueue`, `results`, `correctCount`/`passedCount`) is local `useState` in `GameplayScreen`. The category is resolved from `useCategories()` **once**, in a `useMemo` with an intentionally-empty dependency array — re-deriving it on every categories-context update would reshuffle the word queue mid-round. The queue is reshuffled in place when exhausted before time runs out.

### Design tokens are centralized and referenced by name, not by literal

`src/theme/theme.ts` exports `colors`, `fonts`, `radii` matching the values in `headsup-designs.html` (the source mockup — check it before changing visual styling). Custom fonts (Baloo 2 / Poppins / Space Mono) are loaded once in `App.tsx` via `expo-font` + `@expo-google-fonts/*` and referenced by the family-name strings in `theme.fonts`. `PressedButton` (`src/components/PressedButton.tsx`) implements the mockup's "solid offset-shadow" pressed-button look using a two-layer view (not CSS `box-shadow`, which React Native doesn't support) — reuse it instead of rebuilding chunky CTAs inline.

### Category data is fully remote — the app bundles none of it

`src/data/categories.ts` holds only the `Category`/`CategoryId` **types** and a pure `findCategoryById` helper — no data. `CategoryId` is a plain `string`, not a fixed union, because categories are runtime data, not compile-time knowledge.

`src/data/CategoriesContext.tsx` (`CategoriesProvider`, wrapping `RootNavigator` in `App.tsx`) owns the actual data lifecycle:
- On mount, hydrates from `AsyncStorage` (key `headsup:categories`) if a previous refresh was cached. If nothing is cached, `categories` starts as `[]` — there is no bundled fallback.
- `refresh()` fetches `categories.json` from `raw.githubusercontent.com/ShubhankarDas/headsup-game/main/categories.json`, and on success **overwrites** both in-memory state and `AsyncStorage` entirely (never merges with what was there before). On failure, leaves existing cached data untouched and surfaces `error`.
- `CategorySelectScreen` auto-triggers one `refresh()` on mount only if there's nothing cached yet, and also exposes a manual refresh button; it renders an empty-state prompt instead of the category grid when `categories.length === 0`.

Each category object carries its own presentation data — `icon` (an `@expo/vector-icons` `MaterialCommunityIcons` glyph name), `bgColor`, `textColor` — not just `id`/`name`/`words`. This is deliberate: it's what lets a `categories.json` update introduce a genuinely new category (new color, icon, word list) with zero app code changes. Do not move icon/color back into a local `Record<CategoryId, ...>` lookup in `CategorySelectScreen.tsx` — that was the previous design and it defeats the purpose of remote refresh. `findCategoryById(categories, 'random')` (`RANDOM_CATEGORY_ID`) synthesizes a pooled category from whatever's currently loaded rather than being stored data.

The root-level `categories.json` in this repo **is** the served data — editing categories means editing that file and pushing to `main`; nothing else publishes it.
