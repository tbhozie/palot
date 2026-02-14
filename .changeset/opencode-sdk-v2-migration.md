---
"@palot/desktop": minor
"@palot/server": patch
"@palot/configconv": patch
---

### Breaking: Require OpenCode >= 1.2.0

Palot now requires OpenCode 1.2.0 or higher. Older versions will be blocked during the environment check.

### New Features

- **Incremental streaming (message.part.delta)**: handle the new `message.part.delta` SSE event for incremental text/reasoning updates, replacing full part object replacements with efficient string delta appending
- **Remote server support**: connect to remote OpenCode servers with authentication, mDNS discovery, and onboarding integration
- **Update banner redesign**: floating toast card instead of full-width bar

### SDK Migration

- Upgrade `@opencode-ai/sdk` from 1.1.x to 1.2.x across all packages
- Migrate all SDK type imports from v1 to v2, gaining proper typed discriminated unions for all events
- `Permission` type replaced by `PermissionRequest` (field `title` becomes `permission`)
- `permission.updated` event replaced by `permission.asked`
- Remove unnecessary type casts throughout the event processing pipeline

### Fixes

- Fix CI release workflow to run builds in a single workflow run
- Suppress hover background on macOS sidebar server indicator
