import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { activeServerConfigAtom } from "../atoms/connection"
import { discoveryAtom } from "../atoms/discovery"
import { isMockModeAtom } from "../atoms/mock-mode"
import { appStore } from "../atoms/store"
import { createLogger } from "../lib/logger"
import { resolveAuthHeader, resolveServerUrl } from "../services/backend"
import {
	connectToOpenCode,
	loadAllProjects,
	loadProjectSessions,
} from "../services/connection-manager"

const log = createLogger("discovery")

// Module-level guard to prevent concurrent discovery runs.
// The Jotai atom guard (loaded/loading) depends on a React re-render
// to propagate, which can race with React Strict Mode double-effects
// or fast re-mounts.
let discoveryInFlight = false

/** Reset the discovery guard so discovery can re-run (used when switching servers or exiting mock mode). */
export function resetDiscoveryGuard(): void {
	discoveryInFlight = false
}

/**
 * API-first discovery hook.
 *
 * On mount:
 * 1. Resolves the active server URL (spawns local or uses remote URL)
 * 2. Resolves auth credentials if the server requires them
 * 3. Connects to the OpenCode server (SSE events for all projects)
 * 4. Lists all projects from the API via `client.project.list()`
 * 5. Loads live sessions for each discovered project directory
 */
export function useDiscovery() {
	const discovery = useAtomValue(discoveryAtom)
	const isMockMode = useAtomValue(isMockModeAtom)
	const activeServer = useAtomValue(activeServerConfigAtom)
	const { loaded, loading } = discovery

	useEffect(() => {
		// In mock mode, atoms are hydrated by useMockMode() -- skip real discovery
		if (isMockMode) return
		if (loaded || loading || discoveryInFlight) return
		discoveryInFlight = true

		// Set loading
		appStore.set(discoveryAtom, (prev) => ({
			...prev,
			loading: true,
			error: null,
		}))

		;(async () => {
			try {
				// --- Step 1: Resolve the server URL ---
				log.info("Resolving server URL...", {
					server: activeServer.name,
					type: activeServer.type,
				})
				const url = await resolveServerUrl(activeServer)

				// --- Step 2: Resolve auth if needed ---
				const authHeader = await resolveAuthHeader(activeServer)

				// --- Step 3: Connect to the server (starts SSE event loop) ---
				log.info("Connecting to OpenCode server", {
					url,
					server: activeServer.name,
					authenticated: !!authHeader,
				})
				await connectToOpenCode(url, authHeader)

				// --- Step 4: Discover projects from the API ---
				log.info("Loading projects from API...")
				const projects = await loadAllProjects()
				log.info("Discovered projects via API", { count: projects.length })

				// Store projects in discovery atom
				appStore.set(discoveryAtom, {
					loaded: true,
					loading: false,
					error: null,
					projects,
				})

				// --- Step 5: Load live sessions for each project directory ---
				const directories = new Set<string>()
				for (const project of projects) {
					if (project.worktree) {
						directories.add(project.worktree)
					}
				}

				const results = await Promise.allSettled(
					[...directories].map((dir) => loadProjectSessions(dir)),
				)
				const failed = results.filter((r) => r.status === "rejected")
				if (failed.length > 0) {
					log.warn("Some project session loads failed", {
						total: directories.size,
						failed: failed.length,
					})
				}

				log.info("Discovery complete", {
					server: activeServer.name,
					url,
					projects: projects.length,
					directories: directories.size,
				})
			} catch (err) {
				log.error("Discovery failed", err)
				discoveryInFlight = false
				appStore.set(discoveryAtom, (prev) => ({
					...prev,
					loading: false,
					error: err instanceof Error ? err.message : "Discovery failed",
				}))
			}
		})()
	}, [loaded, loading, isMockMode, activeServer])
}
