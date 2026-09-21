# Graph Report - saturdays-together  (2026-09-21)

## Corpus Check
- 125 files · ~64,877 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 776 nodes · 2431 edges · 25 communities (17 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e9a3b648`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- RememberTab.tsx
- compilerOptions
- remote.ts
- session.ts
- store.ts
- devDependencies
- preview-safe.ts
- remote.test.ts
- AppUI.tsx
- route.tsx
- our saturdays
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- run-remote.sh
- run.sh
- AddSheet.tsx
- TripTabs.tsx
- ical.ts
- bits.tsx
- DrawingBoard.tsx

## God Nodes (most connected - your core abstractions)
1. `useShared()` - 56 edges
2. `SavedItem` - 43 edges
3. `useAppUI()` - 39 edges
4. `getSnapshot()` - 38 edges
5. `commit()` - 36 edges
6. `ok()` - 32 edges
7. `send()` - 32 edges
8. `PillButton()` - 30 edges
9. `cn()` - 28 edges
10. `usable()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `GamesPage()` --calls--> `useShared()`  [EXTRACTED]
  app/games/page.tsx → lib/useShared.ts
- `NewWord()` --calls--> `createGuessGame()`  [EXTRACTED]
  components/games/GuessTab.tsx → lib/store.ts
- `Strip()` --calls--> `cn()`  [EXTRACTED]
  components/memories/MemoryDeck.tsx → lib/utils.ts
- `NotesField()` --calls--> `updateTrip()`  [EXTRACTED]
  components/trips/TripTabs.tsx → lib/store.ts
- `AppUIProvider()` --indirect_call--> `dismissNotice()`  [INFERRED]
  components/ui/AppUI.tsx → lib/store.ts

## Import Cycles
- None detected.

## Communities (25 total, 6 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.05
Nodes (104): ActivityPage(), ItemDetailPage(), Props, WhoTab(), FeedList(), FindsRow(), Lately(), LittleMoment() (+96 more)

### Community 1 - "RememberTab.tsx"
Cohesion: 0.14
Nodes (24): GuessTab(), NewWord(), PlayCard(), RememberTab(), BITS, Burst(), buildRememberQuestion(), guessState (+16 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 3 - "remote.ts"
Cohesion: 0.08
Nodes (48): createCouple(), deleteDrawing(), deleteExpense(), deleteGame(), deleteInteraction(), deleteItem(), deleteMemory(), deleteTrip() (+40 more)

### Community 4 - "session.ts"
Cohesion: 0.08
Nodes (49): ProfileCard(), AppGate(), AuthScreen(), AuthShell(), Onboarding(), SaturdayCalendar(), AddPhotoButton(), CalendarLinkCard() (+41 more)

### Community 5 - "store.ts"
Cohesion: 0.12
Nodes (61): DrawPage(), NotesBox(), TripForm(), deletePhoto(), isStoredRef(), buildSeed(), DEFAULT_PROFILES, addDrawing() (+53 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (41): eslint, eslint-config-next, framer-motion, next, dependencies, framer-motion, next, react (+33 more)

### Community 7 - "preview-safe.ts"
Cohesion: 0.13
Nodes (25): dynamic, GET(), noStore, runtime, validTz(), dynamic, GET(), runtime (+17 more)

### Community 8 - "remote.test.ts"
Cohesion: 0.12
Nodes (13): alice, as(), b64(), bob, carol, dave, ID, jwt() (+5 more)

### Community 9 - "AppUI.tsx"
Cohesion: 0.05
Nodes (58): body, display, metadata, viewport, AddSheet(), Photo(), MemoryPeek(), MemoriesScreen() (+50 more)

### Community 11 - "our saturdays"
Cohesion: 0.15
Nodes (12): Environment variables, First-time setup, in the app, Free-tier notes, How "only between us" works, Install on iPhone, Not built yet, our saturdays, Run it (+4 more)

### Community 18 - "run-remote.sh"
Cohesion: 0.50
Nodes (3): JWT_SECRET, LC_ALL, run-remote.sh script

### Community 20 - "AddSheet.tsx"
Cohesion: 0.10
Nodes (31): HomePage(), RECENT(), Phase, SharePage(), AddForm(), readDraft(), titlePlaceholder(), DrawingImage() (+23 more)

### Community 21 - "TripTabs.tsx"
Cohesion: 0.06
Nodes (47): TripsPage(), TripPeek(), TripScreen(), AddToDay(), BudgetTab(), CAT_EMOJI, EMPTY, FindsPicker() (+39 more)

### Community 22 - "ical.ts"
Cohesion: 0.10
Nodes (34): AddToCalendar(), RFC-5545, buildIcs(), CalendarEventInput, compact(), endOf(), esc(), fold() (+26 more)

### Community 23 - "bits.tsx"
Cohesion: 0.10
Nodes (28): GamesPage(), Tab, LaterPage(), View, count(), EMOJIS, UsPage(), ShareCode() (+20 more)

### Community 24 - "DrawingBoard.tsx"
Cohesion: 0.27
Nodes (12): DrawingBoard(), addPoint(), ASPECT, COLORS, Ctx, drawAll(), drawStroke(), exportPng() (+4 more)

## Knowledge Gaps
- **165 isolated node(s):** `runtime`, `dynamic`, `noStore`, `runtime`, `dynamic` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 204 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SavedItem` connect `types.ts` to `RememberTab.tsx`, `remote.ts`, `store.ts`, `AppUI.tsx`, `AddSheet.tsx`, `TripTabs.tsx`, `bits.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `useShared()` connect `types.ts` to `RememberTab.tsx`, `session.ts`, `store.ts`, `AppUI.tsx`, `AddSheet.tsx`, `TripTabs.tsx`, `bits.tsx`, `DrawingBoard.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `useAppUI()` connect `types.ts` to `session.ts`, `store.ts`, `AppUI.tsx`, `AddSheet.tsx`, `TripTabs.tsx`, `bits.tsx`, `DrawingBoard.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `runtime`, `dynamic`, `noStore` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05285942128047391 - nodes in this community are weakly interconnected._
- **Should `RememberTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._