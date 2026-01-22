# PodEdit

## What This Is

A local web app for marking cut points in podcast audio files. Upload an audio file, generate a timestamped transcript, browse and play back sections, mark start/end pairs for removal, then export JSON with cut instructions for downstream editing scripts.

## Core Value

Transcript-driven audio navigation that makes it fast to find and mark sections to remove from podcast files.

## Current Milestone: v1.0 Initial Release

**Goal:** Build complete podcast cut point editor from scratch - audio playback, transcription, navigation, marking, and export.

**Target features:**
- Audio file upload and streaming playback (handles 45-90 min podcasts)
- API-based transcription with caching and large file support
- Transcript display with click-to-jump navigation
- Cut point marking with visual indication and direct timestamp editing
- JSON export in ffmpeg-compatible format

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload audio file to the app
- [ ] User can generate transcript with timestamps via API service
- [ ] User can browse transcript and click timestamps to jump to audio position
- [ ] User can mark start/end pairs for sections to remove
- [ ] User can export JSON file with filename and cut timestamps
- [ ] Audio player supports play/pause/seek controls
- [ ] Transcript displays with clear timestamp markers

### Out of Scope

- Waveform visualization — basic player is sufficient for v1
- Session persistence — once JSON is exported, work is done
- Multi-file queue — one file at a time workflow
- Actual audio editing — handled by external scripts
- Deployment/hosting — local dev server only
- User accounts or authentication — single-user local tool

## Context

This tool is the prep step in a podcast editing workflow. The user reviews podcast recordings, identifies sections to remove (dead air, mistakes, off-topic tangents), and generates a cut list. The output JSON feeds into local ffmpeg scripts that perform the actual audio edits.

The transcript is the primary navigation tool - the user skims text to find problem areas, then uses audio playback to verify before marking cuts.

## Constraints

- **Environment**: Local development server — runs on localhost, no deployment needed
- **Transcription**: API-based service (Whisper API, Deepgram, etc.) — requires API keys and internet connectivity
- **Output Format**: JSON — must be easily parsable by downstream scripts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| JSON output format | Structured data easy to parse in scripts | — Pending |
| API-based transcription | Accuracy over cost, acceptable for personal use | — Pending |
| No session persistence | One-shot workflow, simpler implementation | — Pending |
| Basic audio player | Core functionality sufficient, no visualization needed | — Pending |

---
*Last updated: 2026-01-22 after milestone v1.0 initialization*
