# PodEdit

A browser-based transcript-driven audio editor for podcasts. Mark sections for removal by clicking on words, then export cut instructions or process audio directly in your browser.

## Quick Start

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

Note: Vite dev server is required (not optional) because it provides the COOP/COEP headers needed for multi-threaded FFmpeg.wasm processing.

## Features

### v1.0 (Complete)

- Upload audio files (MP3, WAV, M4A, AAC, OGG)
- AI transcription via OpenAI Whisper API with automatic chunking for large files
- Click-to-seek navigation with auto-scroll and highlight sync during playback
- Mark cut regions by clicking transcript words (start/end pairs)
- Editable timestamps with multi-format parsing
- Export cut list as JSON for external audio editors

### v2.0 (In Progress)

- Browser-based audio processing with FFmpeg.wasm (no server required, 100% private)
- Multi-threaded processing for 2x speed (60-min podcast in 3-6 minutes)
- File size validation (50 MB soft warning, 100 MB hard limit)
- iOS Safari support with single-thread fallback
- Progress tracking with time-based completion estimates
- Automatic memory cleanup prevents browser crashes

## Requirements

- Node.js (for running Vite dev server)
- Modern browser with SharedArrayBuffer support (Chrome, Firefox, Edge)
- OpenAI API key for transcription (stored in browser localStorage, never sent to third parties)

## Architecture

PodEdit is a static HTML/CSS/JavaScript application with ES modules. All processing happens client-side in your browser:

**Services:**
- AudioService: Streaming playback for large files with memory-efficient patterns
- TranscriptionService: Whisper API integration with IndexedDB caching
- CutController: Two-phase marking (start/end) with validation
- BrowserCompatibility: Feature detection and iOS Safari handling
- AudioProcessingService: FFmpeg.wasm integration with filter_complex commands

**Storage:**
- IndexedDB for transcript caching (instant load for repeated files)
- localStorage for API key and preferences
- No backend server - all data stays on your device

## Documentation

See `.planning/` directory for detailed project documentation, phase plans, and implementation summaries.
