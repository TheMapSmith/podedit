---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true

must_haves:
  truths:
    - "README reflects current Vite-based development setup"
    - "Features list accurately describes v1.0 and v2.0 capabilities"
    - "Quick start instructions work for new users"
  artifacts:
    - path: "README.md"
      provides: "Updated project documentation"
      contains: "npm run dev"
---

<objective>
Update README.md to accurately reflect the current state of PodEdit including v1.0 features, v2.0 progress with FFmpeg.wasm browser processing, and correct Vite-based development instructions.

Purpose: The existing README is outdated - it references `npx serve .` when the project now uses Vite, and lacks documentation of the substantial feature set built across phases 1-7.

Output: Comprehensive README.md that helps new users understand what PodEdit does and how to run it.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@README.md
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite README.md with current features and setup</name>
  <files>README.md</files>
  <action>
Rewrite README.md to include:

**Quick Start section:**
- `npm install` to install dependencies
- `npm run dev` to start Vite dev server
- Note that Vite is required for COOP/COEP headers (enables FFmpeg.wasm multi-threading)
- Remove outdated `npx serve .` and Python/PHP alternatives

**Features section - v1.0 (current):**
- Upload audio files (MP3, WAV, M4A, AAC, OGG)
- AI transcription via Whisper API with automatic chunking for large files
- Click-to-seek navigation with auto-scroll and highlight sync
- Mark cut regions with editable timestamps
- Export cut list as JSON

**Features section - v2.0 (in progress):**
- Browser-based audio processing with FFmpeg.wasm (no server required)
- Multi-threaded processing for 2x speed (60-min podcast in 3-6 min)
- File size validation (50 MB warning, 100 MB limit)
- iOS Safari support with single-thread fallback

**Requirements section:**
- Node.js (for running Vite dev server)
- Modern browser with SharedArrayBuffer support (Chrome, Firefox, Edge)
- OpenAI API key for transcription (stored in browser localStorage)

**Architecture section (brief):**
- Static HTML/CSS/JavaScript with ES modules
- Services: AudioService, TranscriptionService, BrowserCompatibility, AudioProcessingService
- IndexedDB for transcript caching
- No backend - all processing happens in browser

Keep the tone concise and practical. No emojis.
  </action>
  <verify>
Read README.md and confirm:
- Quick start uses `npm run dev`
- v1.0 and v2.0 features listed
- Requirements mention modern browser
- No references to `npx serve .`
  </verify>
  <done>README.md accurately describes current project state, features, and setup instructions</done>
</task>

</tasks>

<verification>
- `npm run dev` command is documented in Quick Start
- Feature list covers both v1.0 and v2.0 capabilities
- Requirements reflect actual dependencies (Node.js, modern browser, API key)
- Old `npx serve .` instructions removed
</verification>

<success_criteria>
- README.md provides accurate, helpful documentation for new users
- Development setup instructions work correctly
- Feature descriptions match actual implementation
</success_criteria>

<output>
After completion, create `.planning/quick/006-update-readme-md-with-latest-updates-and/006-SUMMARY.md`
</output>
