// electron.vite.config.ts
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
var __electron_vite_injected_dirname = "C:\\Sites\\palot\\apps\\desktop";
function copyDrizzleMigrations() {
  const src = path.resolve(__electron_vite_injected_dirname, "drizzle");
  return {
    name: "copy-drizzle-migrations",
    writeBundle(options) {
      const dest = path.join(options.dir, "drizzle");
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    }
  };
}
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ["@palot/configconv", "drizzle-orm"] }),
      copyDrizzleMigrations()
    ],
    build: {
      rollupOptions: {
        input: { index: path.resolve(__electron_vite_injected_dirname, "src/main/index.ts") }
      }
    }
  },
  preload: {
    // No externalizeDepsPlugin — sandboxed preloads must bundle all deps.
    // Output CJS because Electron sandboxed preloads cannot use ESM.
    build: {
      rollupOptions: {
        input: { index: path.resolve(__electron_vite_injected_dirname, "src/preload/index.ts") },
        output: {
          format: "cjs"
        }
      }
    }
  },
  renderer: {
    root: path.resolve(__electron_vite_injected_dirname, "src/renderer"),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__electron_vite_injected_dirname, "src/renderer"),
        "@palot/ui": path.resolve(__electron_vite_injected_dirname, "../../packages/ui/src")
      }
    },
    worker: {
      format: "es"
    },
    server: {
      port: 1420,
      strictPort: true
    },
    build: {
      rollupOptions: {
        input: { index: path.resolve(__electron_vite_injected_dirname, "src/renderer/index.html") }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
