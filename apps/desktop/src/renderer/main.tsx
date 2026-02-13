// React Scan must be loaded BEFORE React so it can hijack React DevTools.
// Static imports are hoisted by the ES module spec, so we must use dynamic
// imports for everything to guarantee execution order.
if (import.meta.env.DEV) {
	await import("./lib/react-scan")
}

const { StrictMode } = await import("react")
const { createRoot } = await import("react-dom/client")
const { App } = await import("./app")
// CSS import is static -- it has no React dependency, so hoisting is fine.
// @ts-expect-error -- Vite handles CSS imports at build time
await import("./index.css")

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
