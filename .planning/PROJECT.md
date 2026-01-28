# PodEdit

## What This Is

A local web app for editing podcast audio files using transcript navigation. Upload an audio file, generate a timestamped transcript, browse and play back sections, mark start/end pairs for removal, then process and download the edited audio directly in the browser.

## Core Value

Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser.

## Current State

**Latest Release:** v2.0 In-Browser Audio Processing (shipped 2026-01-28)

**What works now:**
- Upload audio files (MP3, WAV, M4A) with memory-efficient streaming
- Generate timestamped transcripts via API (OpenAI Whisper, Deepgram, etc.)
- Navigate audio by clicking words in transcript with auto-scroll
- Mark cut regions with visual feedback and editable timestamps
- Process audio in browser with FFmpeg.wasm (no server required)
- Download edited audio with cuts removed and timestamped filenames
- Cancel processing operations and see real-time progress with FFmpeg logs

**Tech Stack:**
- ~4,100 LOC JavaScript + HTML
- Vite dev server with cross-origin isolation headers (COOP/COEP)
- FFmpeg.wasm for browser-based audio processing
- API-based transcription (OpenAI Whisper API)
- Local development only (no deployment)

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

### Active

Future enhancements:
- [ ] Format conversion options (MP3→WAV, M4A→MP3)
- [ ] Preview processed audio before download
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
| JSON output format | Structured data easy to parse in scripts | — Pending |
| API-based transcription | Accuracy over cost, acceptable for personal use | — Pending |
| No session persistence | One-shot workflow, simpler implementation | — Pending |
| Basic audio player | Core functionality sufficient, no visualization needed | — Pending |

---
*Last updated: 2026-01-28 after v2.0 milestone completion*
