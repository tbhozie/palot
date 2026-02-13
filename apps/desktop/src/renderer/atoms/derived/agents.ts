import { atom } from "jotai"
import { atomFamily } from "jotai-family"
import type {
	Agent,
	AgentStatus,
	OpenCodeProject,
	SessionStatus,
	SidebarProject,
} from "../../lib/types"
import { discoveryAtom } from "../discovery"
import { sessionFamily, sessionIdsAtom } from "../sessions"
import { showSubAgentsAtom } from "../ui"

// ============================================================
// Helpers (moved from hooks/use-agents.ts)
// ============================================================

function deriveAgentStatus(
	status: SessionStatus,
	hasPermissions: boolean,
	hasQuestions: boolean,
): AgentStatus {
	if (hasPermissions || hasQuestions) return "waiting"
	switch (status.type) {
		case "busy":
			return "running"
		case "retry":
			return "running"
		case "idle":
			return "idle"
		default:
			return "idle"
	}
}

export function formatRelativeTime(timestampMs: number): string {
	const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
	if (seconds < 60) return "now"
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d`
	const months = Math.floor(days / 30)
	return `${months}mo`
}

export function formatElapsed(startMs: number): string {
	const seconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
	if (seconds < 60) return `${seconds}s`
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60
	return `${hours}h ${remainingMinutes}m`
}

function projectNameFromDir(directory: string): string {
	return directory.split("/").pop() || "/"
}

// ============================================================
// Project slug system
// ============================================================

interface ProjectEntry {
	id: string
	name: string
	directory: string
}

function buildProjectSlugMap(projects: ProjectEntry[]): Map<string, { id: string; slug: string }> {
	const byDir = new Map<string, ProjectEntry>()
	for (const p of projects) {
		const existing = byDir.get(p.directory)
		if (!existing || (existing.id.startsWith("dir-") && !p.id.startsWith("dir-"))) {
			byDir.set(p.directory, p)
		}
	}

	const result = new Map<string, { id: string; slug: string }>()
	for (const entry of byDir.values()) {
		const slug = `${entry.name}-${entry.id.slice(0, 12)}`
		result.set(entry.directory, { id: entry.id, slug })
	}
	return result
}

function collectAllProjects(
	liveSessionDirs: Map<string, string>,
	discovery: {
		loaded: boolean
		projects: OpenCodeProject[]
	},
): ProjectEntry[] {
	const entries: ProjectEntry[] = []
	const seenDirs = new Set<string>()

	// Discovery projects (from API)
	if (discovery.loaded) {
		for (const project of discovery.projects) {
			if (!project.worktree || seenDirs.has(project.worktree)) continue
			seenDirs.add(project.worktree)
			entries.push({
				id: project.id,
				name: project.name ?? projectNameFromDir(project.worktree),
				directory: project.worktree,
			})
		}
	}

	// Live session directories (may include directories not in any project)
	for (const [, directory] of liveSessionDirs) {
		if (seenDirs.has(directory)) continue
		if (!directory) continue
		seenDirs.add(directory)
		let hash = 0
		for (let i = 0; i < directory.length; i++) {
			hash = (hash * 31 + directory.charCodeAt(i)) | 0
		}
		entries.push({
			id: `dir-${Math.abs(hash).toString(16).padStart(8, "0")}`,
			name: projectNameFromDir(directory),
			directory,
		})
	}

	return entries
}

// ============================================================
// Derived atom: project slug map (shared by agentsAtom + agentFamily)
// ============================================================

/**
 * Lightweight derived atom that maps directory -> { id, slug }.
 * Only depends on session directories (stable after creation) and discovery
 * (loaded once). This avoids recomputing slugs when session status/permissions change.
 */
const projectSlugMapAtom = atom((get) => {
	const sessionIds = get(sessionIdsAtom)
	const discovery = get(discoveryAtom)

	const liveSessionDirs = new Map<string, string>()
	for (const id of sessionIds) {
		const entry = get(sessionFamily(id))
		if (!entry) continue
		liveSessionDirs.set(id, entry.directory)
	}

	const allProjects = collectAllProjects(liveSessionDirs, discovery)
	return buildProjectSlugMap(allProjects)
})

// ============================================================
// Per-session agent selector (reads ONE sessionFamily atom)
// ============================================================

/**
 * Derives a full `Agent` for a single session. Only subscribes to that session's
 * `sessionFamily` atom + the shared `projectSlugMapAtom`, so status/permission
 * changes on OTHER sessions do not trigger re-derivation.
 */
export const agentFamily = atomFamily((sessionId: string) =>
	atom((get) => {
		const entry = get(sessionFamily(sessionId))
		if (!entry) return null

		const slugMap = get(projectSlugMapAtom)
		const { session, status, permissions, questions, directory } = entry
		const projectInfo = slugMap.get(directory)
		const agentStatus = deriveAgentStatus(status, permissions.length > 0, questions.length > 0)
		const created = session.time.created
		const lastActiveAt = session.time.updated ?? session.time.created

		const agent: Agent = {
			id: session.id,
			sessionId: session.id,
			name: session.title || "Untitled",
			status: agentStatus,
			environment: "local" as const,
			project: projectNameFromDir(directory),
			projectSlug: projectInfo?.slug ?? projectNameFromDir(directory),
			directory,
			branch: entry.branch ?? "",
			duration: formatRelativeTime(lastActiveAt),
			tokens: 0,
			cost: 0,
			currentActivity:
				questions.length > 0
					? `Asking: ${questions[0].questions[0]?.header ?? "Question"}`
					: permissions.length > 0
						? `Waiting for approval: ${permissions[0].title}`
						: status.type === "busy"
							? "Working..."
							: undefined,
			activities: [],
			permissions,
			questions,
			parentId: session.parentID,
			worktreePath: entry.worktreePath,
			worktreeBranch: entry.worktreeBranch,
			createdAt: created,
			lastActiveAt,
		}
		return agent
	}),
)

/**
 * Reads just the session title for a given session ID.
 * Used for breadcrumb "parent session name" lookups without subscribing
 * to the full agents list.
 */
export const sessionNameFamily = atomFamily((sessionId: string) =>
	atom((get) => {
		const entry = get(sessionFamily(sessionId))
		if (!entry) return undefined
		return entry.session.title || "Untitled"
	}),
)

// ============================================================
// Derived atom: agents list
// ============================================================

/**
 * All agents derived from live sessions.
 * With API-first discovery, there are no more "offline-only" discovered sessions
 * since sessions are loaded directly from the API into the session atom family.
 */
export const agentsAtom = atom((get) => {
	const sessionIds = get(sessionIdsAtom)
	const agents: Agent[] = []

	for (const id of sessionIds) {
		const agent = get(agentFamily(id))
		if (agent) agents.push(agent)
	}

	return agents
})

// ============================================================
// Derived atom: project list for sidebar
// ============================================================

export const projectListAtom = atom((get) => {
	const sessionIds = get(sessionIdsAtom)
	const discovery = get(discoveryAtom)
	const showSubAgents = get(showSubAgentsAtom)
	const slugMap = get(projectSlugMapAtom)

	const projects = new Map<string, SidebarProject>()

	// Live sessions grouped by directory
	for (const id of sessionIds) {
		const entry = get(sessionFamily(id))
		if (!entry) continue
		if (!showSubAgents && entry.session.parentID) continue
		if (!entry.directory) continue

		const dir = entry.directory
		const projectInfo = slugMap.get(dir)
		const name = projectNameFromDir(dir)
		const t = entry.session.time.updated ?? entry.session.time.created ?? 0

		const existing = projects.get(dir)
		if (existing) {
			existing.agentCount += 1
			if (t > existing.lastActiveAt) existing.lastActiveAt = t
		} else {
			projects.set(dir, {
				id: projectInfo?.id ?? dir,
				slug: projectInfo?.slug ?? name,
				name,
				directory: dir,
				agentCount: 1,
				lastActiveAt: t,
			})
		}
	}

	// Discovered projects from API that have no live sessions yet
	// (show them in sidebar so users can start new agents)
	if (discovery.loaded) {
		for (const project of discovery.projects) {
			if (!project.worktree) continue
			if (projects.has(project.worktree)) continue

			const projectInfo = slugMap.get(project.worktree)
			const name = project.name ?? projectNameFromDir(project.worktree)
			const lastActiveAt = project.time.updated ?? project.time.created ?? 0

			projects.set(project.worktree, {
				id: projectInfo?.id ?? project.id,
				slug: projectInfo?.slug ?? name,
				name,
				directory: project.worktree,
				agentCount: 0,
				lastActiveAt,
			})
		}
	}

	return Array.from(projects.values()).sort((a, b) => b.lastActiveAt - a.lastActiveAt)
})
