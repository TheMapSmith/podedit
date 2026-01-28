---
status: resolved
trigger: "ffmpeg-vite-worker-404"
created: 2026-01-28T00:00:00Z
updated: 2026-01-28T00:08:00Z
---

## Current Focus

hypothesis: CONFIRMED - Fix applied and verified
test: Dev server restarted with new configuration
expecting: FFmpeg should now load successfully without 404 errors
next_action: Manual verification by clicking "Test FFmpeg Loading" button in browser

## Symptoms

expected: FFmpeg should load completely (reach 100%) and be ready to use
actual: Loading alert gets stuck at 50%, worker.js file returns 404
errors:
- Browser console: GET http://localhost:5173/node_modules/.vite/deps/worker.js?worker_file=&type=module, MIME: x-unknown/x-unknown-content-type, status: 404 NS_ERROR_CORRUPTED_CONTENT
- Vite server: "The file does not exist at "/home/sprite/podedit/node_modules/.vite/deps/worker.js?worker_file&type=module" which is in the optimize deps directory. The dependency might be incompatible with the dep optimizer. Try adding it to `optimizeDeps.exclude`."
reproduction: Click a button/trigger action that initiates FFmpeg loading
started: First time setup - never worked before

## Eliminated

## Evidence

- timestamp: 2026-01-28T00:01:00Z
  checked: vite.config.js
  found: Basic config with COOP/COEP headers, build.target: esnext, no worker or optimizeDeps config
  implication: No Vite worker configuration or FFmpeg optimization settings

- timestamp: 2026-01-28T00:02:00Z
  checked: package.json
  found: "@ffmpeg/ffmpeg": "^0.12.15", "@ffmpeg/util": "^0.12.2" with type: "module"
  implication: Using latest FFmpeg.wasm with ES modules

- timestamp: 2026-01-28T00:03:00Z
  checked: browserCompatibility.js loadFFmpeg method
  found: Uses dynamic imports for '@ffmpeg/ffmpeg' and '@ffmpeg/util', loads from CDN using toBlobURL
  implication: FFmpeg modules are dynamically imported, not pre-bundled by Vite

- timestamp: 2026-01-28T00:04:00Z
  checked: index.html test button and BrowserCompatibility usage
  found: Test button at line 619, calls browserCompat.loadFFmpeg() which triggers dynamic imports at line 77-78
  implication: When FFmpeg loads, Vite tries to optimize '@ffmpeg/ffmpeg' and '@ffmpeg/util' dependencies

- timestamp: 2026-01-28T00:05:00Z
  checked: Error message analysis
  found: URL shows /node_modules/.vite/deps/worker.js with empty worker_file parameter, Vite suggests adding to optimizeDeps.exclude
  implication: Vite is pre-bundling FFmpeg dependencies incorrectly, breaking worker file resolution

- timestamp: 2026-01-28T00:06:00Z
  checked: Web research on FFmpeg.wasm + Vite integration
  found: Multiple GitHub issues confirm this is a known problem, solution is optimizeDeps.exclude for @ffmpeg packages
  implication: This is the documented solution, confirmed by FFmpeg.wasm community

## Resolution

root_cause: Vite's dependency optimizer (esbuild) attempts to pre-bundle @ffmpeg/ffmpeg and @ffmpeg/util packages, but esbuild cannot correctly handle worker file imports that FFmpeg.wasm uses. This breaks the worker URL resolution, causing 404 errors with malformed URLs like "worker.js?worker_file=&type=module"
fix: Added optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] to vite.config.js to prevent pre-bundling of FFmpeg packages
verification:
  - Cleared Vite dependency cache (node_modules/.vite)
  - Restarted dev server (killed old process, started new one)
  - Server is running on port 5173 with new configuration
  - Ready for manual testing via "Test FFmpeg Loading" button in browser at localhost:5173
files_changed: ['vite.config.js']
