/**
 * Single data gateway hook for the automations subsystem.
 *
 * Fetches automations + runs on mount, subscribes to real-time push
 * updates via the preload bridge, and polls every 30s for timer freshness.
 * This is the ONLY writer to automationsAtom / automationRunsAtom.
 *
 * Mount once in AutomationsPage; everything else reads from atoms.
 */

import { useSetAtom } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"
import { setAutomationRunsAtom, setAutomationsAtom } from "../atoms/automations"
import { createLogger } from "../lib/logger"
import { fetchAutomationRuns, fetchAutomations } from "../services/backend"

const log = createLogger("use-automation-data")

/** Polling interval for countdown/timer freshness (30 seconds). */
const POLL_INTERVAL = 30_000

const isElectron = typeof window !== "undefined" && "palot" in window

export function useAutomationData() {
	const setAutomations = useSetAtom(setAutomationsAtom)
	const setRuns = useSetAtom(setAutomationRunsAtom)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const mountedRef = useRef(true)

	const refetch = useCallback(async () => {
		if (!isElectron) return
		try {
			const [automations, runs] = await Promise.all([fetchAutomations(), fetchAutomationRuns()])
			if (!mountedRef.current) return
			setAutomations(automations)
			setRuns(runs)
			setError(null)
		} catch (err) {
			if (!mountedRef.current) return
			const msg = err instanceof Error ? err.message : "Failed to load automations"
			setError(msg)
			log.error("Failed to fetch automation data", { error: msg })
		} finally {
			if (mountedRef.current) setLoading(false)
		}
	}, [setAutomations, setRuns])

	// Initial fetch + polling
	useEffect(() => {
		mountedRef.current = true
		refetch()

		const intervalId = setInterval(refetch, POLL_INTERVAL)
		return () => {
			mountedRef.current = false
			clearInterval(intervalId)
		}
	}, [refetch])

	// Subscribe to push updates from the main process
	useEffect(() => {
		if (!isElectron) return
		const unsub = window.palot?.onAutomationRunsUpdated(() => {
			refetch()
		})
		return unsub
	}, [refetch])

	return { loading, error, refetch }
}
