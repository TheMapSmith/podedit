---
status: resolved
trigger: "ffmpeg-loading-sharedarraybuffer-and-module-import"
created: 2026-01-28T00:00:00Z
updated: 2026-01-28T00:00:01Z
---

## Current Focus

hypothesis: CONFIRMED - User is running wrong development server
test: verified vite.config.js exists with proper headers, package.json has "dev" and "start" scripts that use Vite
expecting: fix is to run `npm start` or `npm run dev` instead of `npx serve .`
next_action: provide solution to user

## Symptoms

expected: FFmpeg should load successfully without errors when clicking "test ffmpeg loading" button
actual: Two types of errors occur:
  1. On page load: "SharedArrayBuffer is not available. This may be due to missing security headers or browser restrictions." and "Cross-origin isolation is not enabled. The server must send COOP/COEP headers."
  2. When clicking "test ffmpeg loading": Failed to load FFmpeg: The specifier "@ffmpeg/ffmpeg" was a bare specifier, but was not remapped to anything. Relative module specifiers must start with "./", "../" or "/".
errors:
  - SharedArrayBuffer is not available. This may be due to missing security headers or browser restrictions.
  - Cross-origin isolation is not enabled. The server must send COOP/COEP headers.
  - Failed to load FFmpeg: The specifier "@ffmpeg/ffmpeg" was a bare specifier, but was not remapped to anything. Relative module specifiers must start with "./", "../" or "/".
reproduction:
  1. Start the app with "npx serve ."
  2. Load the page - see SharedArrayBuffer/COOP/COEP warnings
  3. Click "test ffmpeg loading" button - see bare specifier error
timeline: This is a new setup/feature that has never worked
environment: Using "npx serve ." as development server (not Vite dev server)

## Eliminated

## Evidence

- timestamp: 2026-01-28T00:00:00Z
  checked: index.html and browserCompatibility.js module imports
  found: browserCompatibility.js uses bare module specifiers `import('@ffmpeg/ffmpeg')` and `import('@ffmpeg/util')` on lines 77-78. The app uses "type": "module" in package.json and expects Vite dev server to resolve these bare imports, but user is running `npx serve .` which is a simple static HTTP server that cannot resolve bare module specifiers.
  implication: When running without a build tool/bundler, bare imports like '@ffmpeg/ffmpeg' cannot be resolved by the browser. Vite would normally handle this via its dependency pre-bundling, but `serve` doesn't do any module resolution.

- timestamp: 2026-01-28T00:00:00Z
  checked: browserCompatibility.js checkCompatibility() method
  found: checks for SharedArrayBuffer and crossOriginIsolated on lines 25-32. The check runs on page load and reports errors if these are not available.
  implication: The `serve` static server doesn't send the required COOP/COEP headers needed for cross-origin isolation, which prevents SharedArrayBuffer from being available.

- timestamp: 2026-01-28T00:00:00Z
  checked: vite.config.js and package.json scripts
  found: vite.config.js exists with proper COOP/COEP headers configured (lines 5-8). package.json has "dev" and "start" scripts that run `vite`, not `serve`.
  implication: The project is configured to use Vite dev server which handles both module resolution and security headers. User is using the wrong server (`npx serve .` instead of `npm start`).

## Resolution

root_cause: User is running the wrong development server. Using `npx serve .` (a simple static HTTP server) instead of `npm start` or `npm run dev` (Vite dev server). The serve command cannot: (1) resolve bare module specifiers like '@ffmpeg/ffmpeg', (2) send required COOP/COEP headers for SharedArrayBuffer support. The project is already correctly configured with vite.config.js that includes the necessary headers.
fix: User needs to stop using `npx serve .` and instead run `npm start` or `npm run dev` to use the Vite development server
verification: After running with Vite, the page should load without SharedArrayBuffer errors, and clicking "test ffmpeg loading" should successfully load FFmpeg
files_changed: []
