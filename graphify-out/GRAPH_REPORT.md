# Graph Report - saturdays-together  (2026-09-20)

## Corpus Check
- 60 files · ~23,608 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 372 nodes · 942 edges · 20 communities (12 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a089e258`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- utils.ts
- compilerOptions
- remote.ts
- bits.tsx
- store.ts
- devDependencies
- media.ts
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
- useAppUI

## God Nodes (most connected - your core abstractions)
1. `useStore()` - 26 edges
2. `SavedItem` - 21 edges
3. `useAppUI()` - 19 edges
4. `getSupabase()` - 19 edges
5. `CategoryId` - 18 edges
6. `PillButton()` - 17 edges
7. `compilerOptions` - 16 edges
8. `cn()` - 15 edges
9. `commit()` - 14 edges
10. `AddForm()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `NotesBox()` --calls--> `updateItem()`  [EXTRACTED]
  app/later/[id]/page.tsx → lib/store.ts
- `ItemDetailPage()` --calls--> `useItemActions()`  [EXTRACTED]
  app/later/[id]/page.tsx → components/later/useItemActions.ts
- `LaterPage()` --calls--> `useAppUI()`  [EXTRACTED]
  app/later/page.tsx → components/ui/AppUI.tsx
- `LaterPage()` --calls--> `setStatus()`  [EXTRACTED]
  app/later/page.tsx → lib/store.ts
- `LaterPage()` --calls--> `useStore()`  [EXTRACTED]
  app/later/page.tsx → lib/store.ts

## Import Cycles
- None detected.

## Communities (20 total, 6 thin omitted)

### Community 1 - "utils.ts"
Cohesion: 0.12
Nodes (38): ItemDetailPage(), NotesBox(), HomePage(), choose(), LittleMoment(), NextSaturday(), PickList(), PHRASE (+30 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "remote.ts"
Cohesion: 0.20
Nodes (18): createCouple(), deleteItem(), fetchMyCouple(), fetchSpace(), insertItem(), itemToRow(), joinCouple(), ok() (+10 more)

### Community 4 - "bits.tsx"
Cohesion: 0.09
Nodes (38): count(), EMOJIS, UsPage(), AppGate(), AuthScreen(), AuthShell(), Onboarding(), ShareCode() (+30 more)

### Community 5 - "store.ts"
Cohesion: 0.19
Nodes (31): deletePhoto(), isStoredRef(), buildSeed(), loadCouple(), addItem(), bootRemote(), commit(), FALLBACK_ME (+23 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, framer-motion, next, dependencies, framer-motion, next, react (+32 more)

### Community 7 - "media.ts"
Cohesion: 0.27
Nodes (10): Avatar(), blobToDataUrl(), shrinkImage(), cache, cached(), flush(), queue, resolve() (+2 more)

### Community 8 - "remote.test.ts"
Cohesion: 0.18
Nodes (10): alice, as(), b64(), bob, carol, dave, ID, jwt() (+2 more)

### Community 9 - "AddSheet.tsx"
Cohesion: 0.06
Nodes (49): LaterPage(), matches(), STATUS_CHIPS, StatusFilter, AddForm(), AddSheet(), Props, titlePlaceholder() (+41 more)

### Community 11 - "our saturdays"
Cohesion: 0.17
Nodes (11): Environment variables, First-time setup, in the app, Free-tier notes, How "only between us" works, Install on iPhone, Not built yet, our saturdays, Run it (+3 more)

### Community 18 - "run-remote.sh"
Cohesion: 0.50
Nodes (3): JWT_SECRET, LC_ALL, run-remote.sh script

### Community 20 - "useAppUI"
Cohesion: 0.11
Nodes (17): body, display, metadata, viewport, TripsPage(), ProfileCard(), BottomNav(), Icons (+9 more)

## Knowledge Gaps
- **114 isolated node(s):** `StatusFilter`, `STATUS_CHIPS`, `display`, `body`, `metadata` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SavedItem` connect `AddSheet.tsx` to `utils.ts`, `remote.ts`, `bits.tsx`, `store.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `useStore()` connect `utils.ts` to `AddSheet.tsx`, `bits.tsx`, `store.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `CategoryId` connect `AddSheet.tsx` to `utils.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useStore()` (e.g. with `getSnapshot()` and `subscribe()`) actually correct?**
  _`useStore()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StatusFilter`, `STATUS_CHIPS`, `display` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11524822695035461 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._