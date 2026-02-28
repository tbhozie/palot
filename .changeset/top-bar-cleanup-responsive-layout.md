---
"@palot/desktop": minor
---

Cleaner top bar, responsive layout, and session UX improvements

**Top bar cleanup:** Removed the stop button (redundant — chat input is always visible), the status dot/label (redundant — visible from the chat itself), and the error/retry alert triangles from the metrics bar (alarming without context; errors are visible inline in the chat).

**Responsive layout:** The chat view and new-chat screen now adapt to narrow viewports — padding collapses on small screens and the suggestion grid switches to a single column. The sidebar auto-collapses when the window drops below 600px and restores when it grows back (manual closes are respected).

**Session task list:** Smoother expand/collapse via CSS grid-row height transition. Task items animate in with a staggered fade+slide and re-animate on status change. Visual weight reduced with softer colors and lighter borders.

**Session switching:** No more loading spinner flash when switching back to a previously-visited session that has cached messages. The "Load earlier messages" button no longer bleeds through from one session to another on switch.

**Window:** Removed the 900×600 minimum window size constraint.
