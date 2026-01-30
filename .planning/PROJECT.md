# PodEdit

## What This Is

A local web app for editing podcast audio files using transcript navigation. Upload an audio file, generate a timestamped transcript, browse and play back sections, mark start/end pairs for removal, then process and download the edited audio directly in the browser.

## Core Value

Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser.

## Current State

**Latest Release:** v3.0 UX & Preview Enhancements (shipped 2026-01-30)

**What works now:**
- Upload audio files (MP3, WAV, M4A) with memory-efficient streaming
- Generate timestamped transcripts via API (OpenAI Whisper, Deepgram, etc.)
- Navigate audio by clicking words in transcript with auto-scroll and search
- Mark cut regions with visual feedback (amber highlight), editable timestamps
- Preview playback that automatically skips cut regions to match final output
- Process audio in browser with FFmpeg.wasm (no server required)
- Download edited audio with cuts removed and timestamped filenames
- Professional dark audio editor theme with WCAG AA compliant contrast
- Getting started instructions for first-time users
- Real-time transcript search with mark.js highlighting

**Tech Stack:**
- ~4,442 LOC JavaScript + HTML
- Vite dev server with cross-origin isolation headers (COOP/COEP)
- FFmpeg.wasm for browser-based audio processing
- mark.js for transcript search highlighting
- API-based transcription (OpenAI Whisper API)
- Local development only (no deployment)

## Current Milestone: Planning Next Milestone

**Status:** v3.0 complete, ready to define next goals

**Possible directions:**
- Keyboard shortcuts for common operations (play/pause, mark cuts, search)
- Format conversion options (MP3↔WAV, M4A→MP3)
- Batch processing for multiple files
- Waveform visualization
- Enhanced accessibility (screen reader support, keyboard-only navigation)

## Requirements

### Validated

From v1.0 (shipped 2026-01-24):
- ✓ User can upload audio file to the app
- ✓ User can generate transcript with timestamps via API service
- ✓ User can browse transcript and click timestamps to jump to audio position
- ✓ User can mark start/end pairs for sections to remove
- ✓ User can export JSON file with filename and cut timestamps
- ✓ Audio player supports play/pause/seek controls
- ✓ Transcript displays with clear timestamp markers

From v2.0 (shipped 2026-01-28):
- ✓ User can process audio in the browser to apply marked cuts — v2.0
- ✓ User can download edited audio file with cut regions removed — v2.0
- ✓ System handles large podcast files (45-90 min) in browser memory — v2.0 (with 50 MB warning, 100 MB limit)
- ✓ FFmpeg.wasm loads on-demand to avoid slowing page load — v2.0
- ✓ Cross-origin isolation headers enable SharedArrayBuffer for multi-threading — v2.0
- ✓ User can cancel long-running processing operations — v2.0
- ✓ System shows processing time estimates and progress feedback — v2.0

From v3.0 (shipped 2026-01-30):
- ✓ Cut regions visually highlighted in transcript with amber background — v3.0
- ✓ Preview playback skips cut regions automatically with VBR MP3 tolerance — v3.0
- ✓ Transcript search with real-time highlighting using mark.js — v3.0
- ✓ Dark theme with podcast/audio editor aesthetic and WCAG AA compliance — v3.0
- ✓ Getting started instructions on landing page with auto-hide — v3.0

### Active

Next milestone (to be defined):
- [ ] Keyboard shortcuts for common operations
- [ ] Format conversion options (MP3↔WAV, M4A→MP3)
- [ ] Batch processing for multiple files

Future enhancements (deferred):
- [ ] Format conversion options (MP3→WAV, M4A→MP3)
- [ ] Batch processing for multiple files
- [ ] Keyboard shortcuts for common operations

### Out of Scope

- Waveform visualization — basic player is sufficient
- Session persistence — one-shot workflow remains simple
- Multi-file queue — one file at a time workflow
- Server-based processing — browser-only keeps privacy and simplicity
- Deployment/hosting — local dev server only
- User accounts or authentication — single-user local tool
- Format conversion — maintain input format for v2.0, add later if needed
- Real-time processing preview — manual trigger keeps resource usage controlled

## Context

This tool provides a complete podcast editing workflow in the browser. The user reviews podcast recordings, identifies sections to remove (dead air, mistakes, off-topic tangents), marks cut points using transcript navigation, then processes the audio directly in the browser to generate the final edited file.

The transcript is the primary navigation tool - the user skims text to find problem areas, then uses audio playback to verify before marking cuts. V2.0 eliminates the need for external scripts by bringing FFmpeg processing into the browser via WebAssembly.

## Constraints

- **Environment**: Local development server — runs on localhost, no deployment needed
- **Transcription**: API-based service (Whisper API, Deepgram, etc.) — requires API keys and internet connectivity
- **Processing**: Browser-based via WebAssembly — limited by browser memory, no native FFmpeg performance
- **File Size**: Browser memory constraints — typically 2-4GB available for processing large podcasts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| JSON output format | Structured data easy to parse in scripts | ✓ Good - Used for external FFmpeg workflows in v1.0 |
| API-based transcription | Accuracy over cost, acceptable for personal use | ✓ Good - Whisper API provides reliable timestamps |
| No session persistence | One-shot workflow, simpler implementation | ✓ Good - Users complete edits in single session |
| Basic audio player | Core functionality sufficient, no visualization needed | ✓ Good - Transcript navigation is primary interface |
| FFmpeg.wasm browser processing | Privacy, no server needed, instant results | ✓ Good - v2.0 eliminates external dependencies |
| Dark theme default | Professional audio editor convention, reduces eye strain | ✓ Good - v3.0, matches Audacity/Descript expectations |
| Inline FOUC prevention script | Only way to guarantee theme before first paint | ✓ Good - v3.0, prevents white flash |
| mark.js for search highlighting | Battle-tested library, handles edge cases | ✓ Good - v3.0, works with cut region highlighting |
| Preview playback with VBR tolerance | Allows users to hear final result, 150ms tolerance for imprecise seeks | ✓ Good - v3.0, validates cuts before processing |
| Button element selector styling | Ensures all buttons (current and future) inherit dark theme | ✓ Good - v3.0, consistent aesthetic without class additions |

---
*Last updated: 2026-01-30 after v3.0 milestone completion*
