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

Adding the next module (Para Summary, V1.x) is: copy this shape, write
its screens against `ui/` components, register it in `app.js`, add its
files to the service worker's shell list. No existing module changes.
