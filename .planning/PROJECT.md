# PodEdit

## What This Is

A local web app for editing podcast audio files using transcript navigation. Upload an audio file, generate a timestamped transcript, browse and play back sections, mark start/end pairs for removal, then process and download the edited audio directly in the browser.

## Core Value

Transcript-driven audio editing that makes it fast to find, mark, and remove sections from podcast files without leaving the browser.

## Current Milestone: v2.0 In-Browser Audio Processing

**Goal:** Add browser-based audio processing to generate edited audio files directly, eliminating the need for external scripts.

**Target features:**
- FFmpeg.wasm integration for browser-based audio processing
- Apply marked cuts to remove unwanted sections from audio
- Download processed audio file with cuts removed
- Process 45-90 minute podcasts in the browser without server upload

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

### Active

v2.0 goals:
- [ ] User can process audio in the browser to apply marked cuts
- [ ] User can download edited audio file with cut regions removed
- [ ] System handles large podcast files (45-90 min) in browser memory

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
*Last updated: 2026-01-26 after milestone v2.0 initialization*
