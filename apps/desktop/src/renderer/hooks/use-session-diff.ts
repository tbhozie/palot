import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useRef } from "react"
import {
	diffFilterFamily,
	sessionDiffFamily,
	sessionDiffStatsFamily,
	setSessionDiffAtom,
} from "../atoms/ui"
import type { FileDiff } from "../lib/types"
import { getProjectClient } from "../services/connection-manager"
import { getSessionDiff } from "../services/opencode"

/**
 * Hook that fetches session diffs and subscribes to real-time updates
 * via the SSE event processor (which writes to sessionDiffFamily).
 *
 * Returns the current diffs, loading state, aggregate stats, and a refetch function.
 */
export function useSessionDiff(sessionId: string, directory: string) {
	const diffs = useAtomValue(sessionDiffFamily(sessionId))
	const stats = useAtomValue(sessionDiffStatsFamily(sessionId))
	const setDiffs = useSetAtom(setSessionDiffAtom)
	const filter = useAtomValue(diffFilterFamily(sessionId))
	const loadingRef = useRef(false)
	const fetchedRef = useRef<string | null>(null)

	const fetchDiffs = useCallback(async () => {
		if (loadingRef.current) return
		loadingRef.current = true
		try {
			const client = getProjectClient(directory)
			if (!client) return
			const result = await getSessionDiff(client, sessionId)
			setDiffs({ sessionId, diffs: result })
		} catch {
			// Silently fail, diffs will update via SSE
		} finally {
			loadingRef.current = false
		}
	}, [sessionId, directory, setDiffs])

	// Initial fetch when session changes
	useEffect(() => {
		if (fetchedRef.current !== sessionId) {
			fetchedRef.current = sessionId
			fetchDiffs()
		}
	}, [sessionId, fetchDiffs])

	// Filter diffs by message if a filter is active
	const filteredDiffs: FileDiff[] = filter
		? diffs // TODO: implement per-message filtering when the API is wired
		: diffs

	return {
		diffs: filteredDiffs,
		allDiffs: diffs,
		stats,
		loading: diffs.length === 0 && fetchedRef.current === sessionId,
		refetch: fetchDiffs,
		filter,
	}
}
