---
"@palot/desktop": minor
---

Redesign default chat display mode with grouped tool summaries

The default view now renders an interleaved stream of text, reasoning blocks, and grouped tool summaries instead of a pill-bar summary. Consecutive tool calls of the same category (explore, edit, run, etc.) are collapsed into a single inline chip (e.g. "Read 3 files", "Edited foo.tsx, bar.tsx") with a left-border color accent. A "Show N steps" toggle reveals the full verbose tool cards on demand.
