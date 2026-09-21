# Graph Report - saturdays-together  (2026-09-21)

## Corpus Check
- 78 files · ~33,557 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 468 nodes · 1287 edges · 21 communities (13 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `011bc999`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- utils.ts
- compilerOptions
- remote.ts
- session.ts
- store.ts
- devDependencies
- route.ts
- remote.test.ts
- AddSheet.tsx
- route.tsx
- our saturdays
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- run-remote.sh
- run.sh
- bits.tsx

## God Nodes (most connected - your core abstractions)
1. `SavedItem` - 32 edges
2. `useShared()` - 28 edges
3. `useAppUI()` - 23 edges
4. `getSupabase()` - 22 edges
5. `cn()` - 19 edges
6. `PillButton()` - 18 edges
7. `commit()` - 17 edges
8. `getSnapshot()` - 17 edges
9. `CategoryId` - 17 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TripsPage()` --calls--> `useAppUI()`  [EXTRACTED]
  app/trips/page.tsx → components/ui/AppUI.tsx
- `AppUIProvider()` --indirect_call--> `dismissNotice()`  [INFERRED]
  components/ui/AppUI.tsx → lib/store.ts
- `ItemDetailPage()` --calls--> `countdown()`  [EXTRACTED]
  app/later/[id]/page.tsx → lib/utils.ts
- `ItemDetailPage()` --calls--> `friendlyDay()`  [EXTRACTED]
  app/later/[id]/page.tsx → lib/utils.ts
- `ItemDetailPage()` --calls--> `sourceInfo`  [EXTRACTED]
  app/later/[id]/page.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (21 total, 6 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.08
Nodes (55): ActivityPage(), ItemDetailPage(), LaterPage(), View, FeedList(), FindsRow(), Lately(), ItemCard() (+47 more)

### Community 1 - "utils.ts"
Cohesion: 0.12
Nodes (36): HomePage(), RECENT(), choose(), LittleMoment(), PHRASE, PickForUs(), Picker(), PickSheet() (+28 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 3 - "remote.ts"
Cohesion: 0.17
Nodes (21): createCouple(), deleteInteraction(), deleteItem(), fetchMyCouple(), fetchSpace(), insertInteraction(), insertItem(), itemToRow() (+13 more)

### Community 4 - "session.ts"
Cohesion: 0.08
Nodes (47): count(), EMOJIS, ProfileCard(), UsPage(), AppGate(), AuthScreen(), AuthShell(), Onboarding() (+39 more)

### Community 5 - "store.ts"
Cohesion: 0.15
Nodes (38): NotesBox(), deletePhoto(), isStoredRef(), buildSeed(), addItem(), bootRemote(), commit(), detail() (+30 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (41): eslint, eslint-config-next, framer-motion, next, dependencies, framer-motion, next, react (+33 more)

### Community 7 - "route.ts"
Cohesion: 0.24
Nodes (15): authorized(), dynamic, GET(), readCapped(), runtime, safeFetch(), assertPublicUrl(), decodeEntities() (+7 more)

### Community 8 - "remote.test.ts"
Cohesion: 0.16
Nodes (10): alice, as(), b64(), bob, carol, dave, ID, jwt() (+2 more)

### Community 9 - "AddSheet.tsx"
Cohesion: 0.05
Nodes (40): body, display, metadata, viewport, AddForm(), AddSheet(), Props, readDraft() (+32 more)

### Community 11 - "our saturdays"
Cohesion: 0.17
Nodes (11): Environment variables, First-time setup, in the app, Free-tier notes, How "only between us" works, Install on iPhone, Not built yet, our saturdays, Run it (+3 more)

### Community 18 - "run-remote.sh"
Cohesion: 0.50
Nodes (3): JWT_SECRET, LC_ALL, run-remote.sh script

### Community 20 - "bits.tsx"
Cohesion: 0.13
Nodes (23): Phase, SharePage(), TripsPage(), PasteLink(), EmptyState(), ErrorState(), PillButtonProps, ScreenHeader() (+15 more)

## Knowledge Gaps
- **129 isolated node(s):** `runtime`, `dynamic`, `View`, `display`, `body` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 155 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SavedItem` connect `types.ts` to `utils.ts`, `remote.ts`, `session.ts`, `store.ts`, `AddSheet.tsx`, `bits.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `useAppUI()` connect `utils.ts` to `types.ts`, `AddSheet.tsx`, `bits.tsx`, `session.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `useShared()` connect `types.ts` to `utils.ts`, `store.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `runtime`, `dynamic`, `View` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07789473684210527 - nodes in this community are weakly interconnected._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1178743961352657 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._