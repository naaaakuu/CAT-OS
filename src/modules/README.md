# src/modules/ — question-type modules

Each VARC question type lives here as an **independent island**
(PROJECT_RULES Rule 5): a folder that composes `src/core/` and `src/ui/`
plus its own content from `content/`, and **never imports another module**.
Anything two modules would share belongs in `core/` (logic) or `ui/`
(components) instead.

The pattern — established by `reading-comprehension/` (Milestone 2):

```
src/modules/<type>/
├── index.js      # exports register<Type>(router, context); the ONLY
│                 # thing app.js knows about the module
├── screens/      # the module's screens (compose ui/ components)
└── logic/        # module-specific logic (uses core/ services)
```

`context` currently carries `{ storage }` (the StorageAdapter). Modules
receive it — they never construct adapters or import app globals.

Three modules exist today, all following this shape:
- `reading-comprehension/` — the reference implementation (Milestone 2).
- `para-jumbles/` — the sentence-ordering journey (0.10.0). It adds one
  shared component (`ui/components/cat-jumble-board.js`) and its own core
  services (`core/engine/pj-session.js`, `core/mentor/pj-*.js`), and it
  writes to the **same** sessions/attempts stores as RC with a
  `module: "pj"` tag, so engagement and backup need no changes.
- `para-summary/` — the summary journey (0.11.0). It adds no new
  components (reuses `cat-question-card`/`cat-option` and the shared
  intro/teaching CSS), brings its own core services
  (`core/engine/ps-session.js`, `core/mentor/ps-*.js`), and tags its
  records `module: "ps"` in the same stores.

Adding the next module (Odd One Out / Vocabulary) is: copy this shape,
write its screens against `ui/` components, register it in `app.js`,
add its files to the service worker's shell list. Odd One Out should
reuse `cat-jumble-board`. No existing module changes.
