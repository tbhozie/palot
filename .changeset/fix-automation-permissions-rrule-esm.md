---
"@palot/desktop": patch
---

Fix automation permission ruleset and rrule ESM interop

Automations were sometimes blocked because the default permission preset didn't include an explicit allow-all rule before the interactive-prompt denies. The ruleset now starts with `{ permission: "*", pattern: "*", action: "allow" }` so all tool calls pass through unless explicitly denied.

Also fixes a CJS/ESM interop issue with the `rrule` package in the main process and renderer: `RRule` is now resolved via `rruleModule.RRule ?? rruleModule.default?.RRule` so it works in both build contexts.
