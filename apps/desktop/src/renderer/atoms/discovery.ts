import { atom } from "jotai"
import type { OpenCodeProject } from "../lib/types"

// ============================================================
// Types
// ============================================================

/**
 * State for discovered project/session data.
 *
 * With API-first discovery, projects come from `client.project.list()` and
 * sessions are loaded per-project via `client.session.list()`. The discovery
 * atom only tracks projects now; sessions are loaded directly into the
 * session atom family by the connection manager.
 */
export interface DiscoveryState {
	loaded: boolean
	loading: boolean
	error: string | null
	/** Projects discovered from the OpenCode API (Project type from SDK) */
	projects: OpenCodeProject[]
}

// ============================================================
// Atoms
// ============================================================

export const discoveryAtom = atom<DiscoveryState>({
	loaded: false,
	loading: false,
	error: null,
	projects: [],
})

// Convenience selectors
export const discoveryLoadedAtom = atom((get) => get(discoveryAtom).loaded)
export const discoveryLoadingAtom = atom((get) => get(discoveryAtom).loading)
export const discoveryProjectsAtom = atom((get) => get(discoveryAtom).projects)
