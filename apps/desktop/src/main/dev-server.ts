/**
 * Dev server runner — spawns project dev servers and opens them in the browser.
 *
 * Uses `bun run dev` to run the project's dev script from package.json.
 * Parses stdout/stderr for port patterns and opens the URL in the default browser.
 * Tracks running servers by project directory for start/stop.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process"
import { platform } from "node:os"
import path from "node:path"
import { BrowserWindow, shell } from "electron"
import { createLogger } from "./logger"
import { waitForEnv } from "./shell-env"

const log = createLogger("dev-server")

// ============================================================
// Types
// ============================================================

interface RunningServer {
	process: ChildProcess
	directory: string
}

// ============================================================
// State
// ============================================================

const runningByDirectory = new Map<string, RunningServer>()

// Port patterns: localhost:5173, 127.0.0.1:3000, 0.0.0.0:3000
const PORT_REGEX = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/

function parsePort(text: string): number | null {
	const match = text.match(PORT_REGEX)
	return match ? Number.parseInt(match[1], 10) : null
}

/** Broadcast that a dev server stopped (crash or manual stop). */
function broadcastStopped(directory: string): void {
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("dev-server:stopped", { directory })
	}
}

// ============================================================
// Public API
// ============================================================

/** Check if a dev server is running for the given directory. */
export function isRunning(directory: string): boolean {
	const norm = path.resolve(directory)
	return runningByDirectory.has(norm)
}

/** Stop the dev server for the given directory. */
export function stop(directory: string): { ok: boolean; error?: string } {
	const norm = path.resolve(directory)
	const entry = runningByDirectory.get(norm)
	if (!entry) {
		return { ok: true }
	}
	try {
		const pid = entry.process.pid
		if (!pid) {
			runningByDirectory.delete(norm)
			broadcastStopped(norm)
			return { ok: true }
		}

		if (platform() === "win32") {
			execSync(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" })
		} else {
			entry.process.kill("SIGTERM")
		}

		runningByDirectory.delete(norm)
		broadcastStopped(norm)
		log.info("Dev server stopped", { directory: norm, pid })
		return { ok: true }
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error"
		log.error("Failed to stop dev server", { directory: norm, error: msg })
		return { ok: false, error: msg }
	}
}

/** Start the dev server for the given directory. */
export async function start(directory: string): Promise<{ ok: boolean; error?: string }> {
	const norm = path.resolve(directory)
	if (runningByDirectory.has(norm)) {
		return { ok: true }
	}

	await waitForEnv()

	// Use `bun run dev` — runs scripts.dev from package.json, or fails if no dev script
	const command = "bun"
	const args = ["run", "dev"]

	log.info("Starting dev server", { directory: norm, command: `${command} ${args.join(" ")}` })

	let portOpened = false

	const proc = spawn(command, args, {
		cwd: norm,
		stdio: "pipe",
		env: process.env,
		shell: platform() === "win32",
	})

	const entry: RunningServer = { process: proc, directory: norm }
	runningByDirectory.set(norm, entry)

	const tryOpenPort = (port: number) => {
		if (portOpened) return
		portOpened = true
		const url = `http://localhost:${port}`
		shell.openExternal(url)
		log.info("Opened dev server in browser", { url })
	}

	const handleOutput = (data: Buffer) => {
		const text = data.toString()
		const port = parsePort(text)
		if (port) tryOpenPort(port)
	}

	proc.stdout?.on("data", handleOutput)
	proc.stderr?.on("data", handleOutput)

	proc.on("error", (err) => {
		log.error("Failed to spawn dev server", { directory: norm, error: err })
		if (runningByDirectory.get(norm)?.process === proc) {
			runningByDirectory.delete(norm)
			broadcastStopped(norm)
		}
	})

	proc.on("exit", (code, signal) => {
		if (runningByDirectory.get(norm)?.process === proc) {
			runningByDirectory.delete(norm)
			broadcastStopped(norm)
			log.info("Dev server process exited", { directory: norm, code, signal })
		}
	})

	// Give the process a moment to start and emit output
	await new Promise((r) => setTimeout(r, 500))

	// If process already exited with error, report it
	if (proc.exitCode != null && proc.exitCode !== 0) {
		runningByDirectory.delete(norm)
		broadcastStopped(norm)
		return {
			ok: false,
			error: `Dev server exited with code ${proc.exitCode}. Ensure the project has a dev script in package.json and bun is installed.`,
		}
	}

	return { ok: true }
}
