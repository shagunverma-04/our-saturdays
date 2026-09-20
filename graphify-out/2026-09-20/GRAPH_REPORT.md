# Graph Report - saturdays-together  (2026-09-20)

## Corpus Check
- 58 files · ~30,323 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 354 nodes · 914 edges · 21 communities (13 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a089e258`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CategoryIcon.tsx
- utils.ts
- compilerOptions
- remote.ts
- session.ts
- store.ts
- devDependencies
- AddSheet.tsx
- remote.test.ts
- bits.tsx
- route.tsx
- our saturdays
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- run-remote.sh
- run.sh
- AppUI.tsx

## God Nodes (most connected - your core abstractions)
1. `useStore()` - 26 edges
2. `SavedItem` - 21 edges
3. `useAppUI()` - 19 edges
4. `getSupabase()` - 19 edges
5. `PillButton()` - 17 edges
6. `CategoryId` - 17 edges
7. `compilerOptions` - 16 edges
8. `cn()` - 15 edges
9. `commit()` - 14 edges
10. `AddForm()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `TripsPage()` --calls--> `useAppUI()`  [EXTRACTED]
  app/trips/page.tsx → components/ui/AppUI.tsx
- `AppUIContextValue` --references--> `CategoryId`  [EXTRACTED]
  components/ui/AppUI.tsx → lib/types.ts
- `NotesBox()` --calls--> `updateItem()`  [EXTRACTED]
  app/later/[id]/page.tsx → lib/store.ts
- `LaterPage()` --calls--> `useAppUI()`  [EXTRACTED]
  app/later/page.tsx → components/ui/AppUI.tsx
- `LaterPage()` --calls--> `setStatus()`  [EXTRACTED]
  app/later/page.tsx → lib/store.ts

## Import Cycles
- None detected.

## Communities (21 total, 6 thin omitted)

### Community 0 - "CategoryIcon.tsx"
Cohesion: 0.16
Nodes (16): Props, choose(), LittleMoment(), Entry, VERB, BITS, Burst(), ALL (+8 more)

### Community 1 - "utils.ts"
Cohesion: 0.12
Nodes (42): ItemDetailPage(), HomePage(), NextSaturday(), PickList(), PHRASE, PickForUs(), RecentlySaved(), ThisWeek() (+34 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "remote.ts"
Cohesion: 0.20
Nodes (18): createCouple(), deleteItem(), fetchMyCouple(), fetchSpace(), insertItem(), itemToRow(), joinCouple(), ok() (+10 more)

### Community 4 - "session.ts"
Cohesion: 0.13
Nodes (32): count(), EMOJIS, ProfileCard(), UsPage(), AppGate(), AuthScreen(), AuthShell(), Onboarding() (+24 more)

### Community 5 - "store.ts"
Cohesion: 0.14
Nodes (36): NotesBox(), deletePhoto(), isStoredRef(), buildSeed(), DEFAULT_PROFILES, Seed, SEEDS, addItem() (+28 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, framer-motion, next, dependencies, framer-motion, next, react (+32 more)

### Community 7 - "AddSheet.tsx"
Cohesion: 0.21
Nodes (15): AddForm(), titlePlaceholder(), Avatar(), blobToDataUrl(), shrinkImage(), cache, cached(), flush() (+7 more)

### Community 8 - "remote.test.ts"
Cohesion: 0.18
Nodes (10): alice, as(), b64(), bob, carol, dave, ID, jwt() (+2 more)

### Community 9 - "bits.tsx"
Cohesion: 0.12
Nodes (19): LaterPage(), matches(), STATUS_CHIPS, StatusFilter, TripsPage(), CategoryBar(), CategoryFilter, Chip() (+11 more)

### Community 11 - "our saturdays"
Cohesion: 0.17
Nodes (11): Environment variables, First-time setup, in the app, Free-tier notes, How "only between us" works, Install on iPhone, Not built yet, our saturdays, Run it (+3 more)

### Community 18 - "run-remote.sh"
Cohesion: 0.50
Nodes (3): JWT_SECRET, LC_ALL, run-remote.sh script

### Community 20 - "AppUI.tsx"
Cohesion: 0.14
Nodes (13): body, display, metadata, viewport, AddSheet(), BottomNav(), Icons, NAV (+5 more)

## Knowledge Gaps
- **109 isolated node(s):** `StatusFilter`, `STATUS_CHIPS`, `display`, `body`, `metadata` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 126 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SavedItem` connect `utils.ts` to `CategoryIcon.tsx`, `remote.ts`, `session.ts`, `store.ts`, `AddSheet.tsx`, `bits.tsx`, `AppUI.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useStore()` connect `utils.ts` to `CategoryIcon.tsx`, `bits.tsx`, `session.ts`, `store.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `useAppUI()` connect `utils.ts` to `bits.tsx`, `session.ts`, `AppUI.tsx`, `AddSheet.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useStore()` (e.g. with `getSnapshot()` and `subscribe()`) actually correct?**
  _`useStore()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StatusFilter`, `STATUS_CHIPS`, `display` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11515151515151516 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._