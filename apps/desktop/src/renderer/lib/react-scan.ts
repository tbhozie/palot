/**
 * React Scan integration -- dev-mode only.
 *
 * This module initializes react-scan to visualize component re-renders.
 * It is dynamically imported in main.tsx BEFORE React, which is a hard
 * requirement of the library (it needs to hijack React DevTools first).
 *
 * Toggle state is persisted in localStorage under "palot:reactScan".
 * The Command Palette calls `toggleReactScan()` / `setReactScanEnabled()`
 * at runtime without requiring a page reload.
 */

const STORAGE_KEY = "palot:reactScan"

function readEnabled(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "true"
	} catch {
		return false
	}
}

// --- Initialization (runs once on import) ---

let scanModule: typeof import("react-scan") | null = null

const enabled = readEnabled()

const { scan } = await import("react-scan")
scanModule = await import("react-scan")

scan({
	enabled,
	animationSpeed: "fast",
})

// --- Public helpers for runtime toggling ---

export function setReactScanEnabled(value: boolean): void {
	if (!scanModule) return
	scanModule.setOptions({ enabled: value })
	try {
		localStorage.setItem(STORAGE_KEY, String(value))
	} catch {
		// Storage unavailable -- ignore
	}
}

export function toggleReactScan(): void {
	setReactScanEnabled(!readEnabled())
}

export function isReactScanEnabled(): boolean {
	return readEnabled()
}
