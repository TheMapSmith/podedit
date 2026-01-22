# Stack Research

**Domain:** Local web app for podcast audio editing with transcript navigation
**Researched:** 2026-01-22
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Wavesurfer.js** | 7.12.1 | Audio playback with waveform visualization | Best-in-class for audio+transcript UIs. Built-in Regions plugin for marking cut points, Timeline plugin for timestamp display. Now uses HTML5 Audio (not Web Audio API) for better performance with large files. |
| **Vite** | latest | Development server | Instant dev server startup, native ES modules, zero config. Standard for modern web apps in 2026. Runs on localhost:5173 by default. |
| **Vanilla JavaScript** | ES2026+ | Frontend logic | Optimal for this scope. React/Vue add complexity without benefit for single-page audio editor. Modern JS with native modules is sufficient. |
| **Node.js + Express** | 20.x LTS + 4.x | Local backend server | Lightweight server for file upload handling and API proxying. Express with Multer handles multipart/form-data uploads cleanly. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Multer** | 1.x | File upload middleware | Required for handling audio file uploads in Express. Supports disk storage for local dev. |
| **Deepgram SDK** | latest | Transcription API client | Recommended transcription service. Superior accuracy (5.26% WER), fast batch processing (1 hour in 20 seconds), includes timestamps and speaker diarization. |
| **OpenAI Whisper API** | (API only) | Alternative transcription | Fallback option. Lower accuracy (10.6% WER) but strong multilingual support (99 languages). Use if non-English podcasts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **npm** | Package management | Standard Node.js package manager |
| **ESLint** | Code quality | Optional but recommended for catching errors |
| **@types/node** | TypeScript types | Only if using TypeScript (not required) |

## Installation

```bash
# Initialize project
npm init -y

# Core dependencies
npm install express multer

# Frontend (via CDN in HTML - no install needed)
# Wavesurfer.js imported from: https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/wavesurfer.esm.js
# Regions plugin from: https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/plugins/regions.esm.js

# Transcription SDK (choose one)
npm install @deepgram/sdk           # Recommended
# OR
npm install openai                   # Alternative

# Dev server
npm install -D vite

# Optional: Dev tools
npm install -D eslint
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Wavesurfer.js** | Howler.js | Use Howler if you need audio sprites, spatial audio, or multi-format fallback WITHOUT waveform visualization. Howler is lighter (7KB) but lacks visual feedback. |
| **Vanilla JS** | React | Use React only if planning to scale to complex multi-view app with state management needs. Overkill for single-page audio editor. |
| **Vanilla JS** | Vue | Use Vue if team prefers framework structure and plans to add dashboard/library features later. Better DX than vanilla for medium complexity. |
| **Deepgram** | AssemblyAI | Use AssemblyAI if you need advanced audio intelligence (sentiment analysis, content moderation, topic detection). Higher cost ($0.015/min vs $0.0077/min) but richer features. |
| **Deepgram** | OpenAI Whisper | Use OpenAI Whisper for multilingual podcasts (99 languages vs Deepgram's fewer). Lower accuracy but better language coverage. |
| **Express + Multer** | Client-side only | Use pure client-side (File API) if avoiding any backend. Trade-off: can't proxy API keys securely, must expose them in frontend. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Web Audio API directly** | Too low-level for this use case. Requires building playback controls, seek UI, loading, etc from scratch. | Wavesurfer.js (uses HTML5 Audio under hood since v7) |
| **jQuery audio plugins** | Outdated in 2026. Modern ES modules and Fetch API replace jQuery needs. | Native JS + Wavesurfer.js |
| **create-react-app** | Deprecated, slow build times, complexity overhead for simple app. | Vite with vanilla JS or Vite + React if framework needed |
| **Self-hosted Whisper** | Requires GPU infrastructure, DevOps expertise, monitoring. Costs >$1/hour when factoring in infrastructure. | Deepgram or OpenAI Whisper API |
| **WebSockets for transcription** | Unnecessary complexity for batch processing. Streaming transcription not needed for file upload workflow. | REST API calls (Deepgram/OpenAI HTTP endpoints) |

## Stack Patterns by Variant

**If targeting non-English podcasts:**
- Use OpenAI Whisper API instead of Deepgram
- Pricing: $0.006/min vs Deepgram's $0.0077/min
- Trade-off: Lower accuracy (10.6% vs 5.26% WER) but 99 language support

**If scaling beyond MVP:**
- Consider React with Vite for better component organization
- Add state management (Zustand or Jotai) for undo/redo functionality
- Migrate to TypeScript for type safety on larger codebase

**If avoiding backend entirely:**
- Remove Express + Multer
- Use HTML5 File API to read files client-side
- WARNING: API keys exposed in frontend code (security risk)
- Consider: Key stored in .env.local, loaded via Vite's import.meta.env

**If adding real-time collaboration:**
- Switch to WebSocket-based transcription (Deepgram supports this)
- Add WebRTC for shared audio playback state
- NOT RECOMMENDED for MVP - significant complexity increase

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Wavesurfer.js 7.x | All modern browsers (ES2026 baseline) | v7 uses HTML5 Audio, not Web Audio API. Breaking change from v6. |
| Express 4.x | Node 18+, 20+ LTS | Node 20.x recommended for long-term support |
| Multer 1.x | Express 4.x | Requires body-parser (included in Express 4.16+) |
| Vite latest | Node 18+, 20+ | Uses native ES modules, requires modern Node |

## Architecture Notes

### Why This Stack for PodEdit

**Frontend simplicity wins:**
- Single-page app with one core interaction (play audio, mark regions)
- Vanilla JS sufficient for DOM manipulation and event handling
- Wavesurfer.js handles 90% of UI complexity (waveform, playback, regions)
- No need for React's reconciliation or Vue's reactivity system

**Backend is thin:**
- Express server only needed for:
  1. File upload endpoint (Multer)
  2. API key proxying (keeps Deepgram/OpenAI keys secure)
  3. Transcription request forwarding
- Could eliminate entirely if acceptable to expose API keys client-side

**Audio library choice:**
- Wavesurfer.js is purpose-built for this exact use case
- Regions plugin provides cut point marking out-of-box
- Timeline plugin displays timestamps alongside waveform
- v7's switch to HTML5 Audio solves memory issues with large files
- Waveform visualization critical for UX (users need visual feedback)

**Transcription service:**
- Deepgram recommended for accuracy and speed
- Batch transcription model (not streaming) fits upload workflow
- Timestamp output is native (word-level and phrase-level available)
- Speaker diarization useful for interview-style podcasts
- Cost-effective at $0.0077/min vs self-hosting Whisper >$1/hour

### Deployment Constraint Impact

**"Local development only" removes:**
- Hosting provider decisions (Vercel, Netlify, etc)
- Database needs (no user accounts, project persistence)
- Authentication/authorization
- HTTPS requirements
- CORS complexity
- CDN considerations

**This enables:**
- File system writes (export JSON to local disk)
- API keys in .env files (no secrets management)
- localhost-only CORS policy
- SQLite if persistence needed (not required for MVP)

## Sources

### High Confidence (Official Documentation)
- [Wavesurfer.js GitHub](https://github.com/katspaugh/wavesurfer.js) — Version 7.12.1 confirmed, regions plugin verified
- [Wavesurfer.js Official Site](https://wavesurfer.xyz/) — API documentation, Timeline and Regions plugins
- [Vite Official Docs](https://vite.dev/guide/) — Development server details, ES2026 baseline confirmed
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Native browser capabilities

### Medium Confidence (Verified Multi-Source)
- [Deepgram vs Whisper (2026)](https://deepgram.com/learn/whisper-vs-deepgram) — Pricing, accuracy (5.26% vs 10.6% WER), speed comparison
- [OpenAI Whisper API Pricing](https://costgoat.com/pricing/openai-transcription) — $0.006/min confirmed
- [Express Multer Middleware](https://expressjs.com/en/resources/middleware/multer.html) — Official Express docs
- [AssemblyAI API Comparison (2026)](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription) — Transcription service landscape

### Low Confidence (Ecosystem Discovery)
- [React vs Vue Comparison (2026)](https://www.thefrontendcompany.com/posts/vue-vs-react) — Framework trade-offs for small apps
- [Web Audio Libraries Survey](https://github.com/notthetup/awesome-webaudio) — Ecosystem overview
- [JavaScript Audio Player Reviews](https://www.jqueryscript.net/blog/best-custom-audio-player.html) — Wavesurfer vs alternatives

---
*Stack research for: PodEdit - Local podcast audio editing web app*
*Researched: 2026-01-22*
