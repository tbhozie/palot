---
"@palot/desktop": minor
"@palot/ui": minor
---

### New Features

- **Session metrics**: comprehensive per-session work time, cost, tokens, model distribution, cache efficiency, and tool breakdown
- **Per-turn metadata**: display model, duration, and cost after each response
- **Live turn timer**: show elapsed time on submit button while agent is working
- **Prompt toolbar selector**: enhanced model/provider selector UI
- **OpenCode API integration**: replace disk-based discovery and messages with OpenCode server API

### Performance

- **Per-session streaming**: scope streaming buffer and version notifications per session, eliminating cross-session re-renders (~20x/sec savings for inactive sessions)
- **Decoupled volatile metrics from agent identity**: sidebar no longer re-renders on every metrics tick
- **Lazy metrics for background sessions**: only the viewed session uses reactive atom subscriptions
- **Granular sidebar subscriptions**: each project folder and session item subscribes independently

### UI/UX

- **Base UI migration**: migrated shadcn components from Radix to Base UI
- **Sidebar improvements**: stabilized sort order, relative last-active time, animated project folders
- **New chat styling**: translucent backgrounds and subtle borders on suggestion cards
- **Command dialog**: layout fix for better usability

### Fixes

- Support OpenCode XML read output format in tool card parser
- Migrate tooltips from Radix asChild to Base UI render prop pattern
- Stabilize sidebar atom references to prevent cascading re-renders
