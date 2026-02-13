/** Vite-specific extensions to ImportMeta (renderer process only). */
interface ImportMetaEnv {
	readonly DEV: boolean
	readonly PROD: boolean
	readonly MODE: string
	readonly BASE_URL: string
	readonly SSR: boolean
}

interface ImportMeta {
	readonly env: ImportMetaEnv
	glob<T = Record<string, unknown>>(pattern: string, opts?: { query?: string; eager?: boolean }): T
}
