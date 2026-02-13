/**
 * Jotai atoms for the React Scan dev-tool toggle.
 *
 * The actual react-scan library state lives outside React (initialized before
 * React even loads). These atoms mirror that state so the Command Palette can
 * read/write it reactively.
 */

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

const STORAGE_KEY = "palot:reactScan"

/**
 * Persisted toggle for React Scan.
 * Kept in sync with the same localStorage key used by `lib/react-scan.ts`.
 */
export const reactScanStorageAtom = atomWithStorage<boolean>(STORAGE_KEY, false)

/**
 * Read-only derived atom (simple pass-through for now, but allows future
 * composition with URL params or other overrides like mock-mode does).
 */
export const isReactScanAtom = atom((get) => get(reactScanStorageAtom))

/**
 * Write-only toggle atom for the Command Palette.
 * Flips the persisted value AND calls the runtime react-scan toggle.
 */
export const toggleReactScanAtom = atom(null, async (get, set) => {
	const next = !get(reactScanStorageAtom)
	set(reactScanStorageAtom, next)

	// Lazily import the runtime helper so this atom file does not pull in
	// react-scan at module level (it may not be loaded in production).
	if (import.meta.env.DEV) {
		const { setReactScanEnabled } = await import("../lib/react-scan")
		setReactScanEnabled(next)
	}
})
