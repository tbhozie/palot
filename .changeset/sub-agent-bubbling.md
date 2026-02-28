---
"@palot/desktop": minor
---

Sub-agent permissions and questions now bubble up to the parent session

When Claude spawns a sub-agent via the Task tool, any interactive request that the sub-agent raises — a tool-use permission or a follow-up question — is now surfaced directly in the parent session's input area. This means you no longer need to navigate to the child session to unblock a running task.

**What changed:**

- **Parent chat input**: Shows the sub-agent's permission card or question flow with a "Sub-agent" indicator. Responding from the parent correctly targets the child session.
- **Sidebar**: The parent session's status turns to "waiting" (amber dot) when any descendant sub-agent is blocked, making it visible at a glance.
- **Sub-agent card**: While a sub-agent is running and waiting for input, its card header shows a "Needs approval" or "Asking a question" badge in amber.
- **Notifications**: System notifications and the dock badge count are now raised for sub-agent permissions/questions too, attributed to the root parent session so clicking them takes you to the right place.
- **Bug fix**: Permission and question responses were previously always routed to the parent session ID. They now correctly target the session that owns the request, even when that session is a sub-agent.
