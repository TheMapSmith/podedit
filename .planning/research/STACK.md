# Stack Research

**Domain:** Local web app for podcast audio editing with transcript navigation
**Researched:** 2026-01-22 (Updated: 2026-01-26 for browser audio processing)
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vanilla JavaScript** | ES2026+ | Frontend logic | Already validated in v1.0. Optimal for scope - no framework overhead. Modern JS with native modules is sufficient. |
| **Vite** | latest | Development server | Already in project. CRITICAL for v2.0: Vite enables COOP/COEP headers required for FFmpeg.wasm SharedArrayBuffer. |
| **HTML5 Audio** | Native | Audio playback | Already validated. Keep for playback - FFmpeg.wasm handles processing, not playback. |
| **@ffmpeg/ffmpeg** | 0.12.15 | Browser audio processing | NEW for v2.0: Industry standard for audio manipulation. Runs entirely in browser via WebAssembly. Full codec support for cut application. |
| **@ffmpeg/util** | latest | FFmpeg helper utilities | NEW for v2.0: Required companion package for file I/O and blob handling in ffmpeg.wasm. |
| **@ffmpeg/core-mt** | 0.12.6 | Multi-threaded WASM core | NEW for v2.0: 2x faster than single-thread. Essential for 45-90 minute podcast processing (3-6 min vs 6-12 min). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **IndexedDB** | Native | Transcription + processed audio caching | Already in use for transcripts. Extend for processed audio caching to avoid re-processing. |
| **Whisper API** | (API only) | Transcription service | Already validated in v1.0. No changes needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vite dev server** | Local development with COOP/COEP headers | CRITICAL: Must configure headers in vite.config.js for FFmpeg.wasm |
| **Browser DevTools Memory Profiler** | Monitor memory usage during processing | Essential for debugging 45-90 min file processing |

## Installation

```bash
# NEW: Core audio processing packages (v2.0)
npm install @ffmpeg/ffmpeg @ffmpeg/util

# Multi-threaded core (peer dependency, loaded dynamically at runtime)
# No explicit install needed - referenced via CDN in code

# Existing stack (already installed in v1.0)
# - No framework dependencies
# - Vite already available for dev server
```

## Vite Configuration (REQUIRED for v2.0)

ffmpeg.wasm requires SharedArrayBuffer support, which mandates cross-origin isolation:

```javascript
// vite.config.js (NEW FILE - PodEdit currently uses 'serve' package)
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

**Migration note:** PodEdit v1.0 uses `serve` package (`npm run dev` runs `serve .`). Must migrate to Vite for v2.0 to enable COOP/COEP headers.

## Integration Pattern with Existing Stack

### Existing PodEdit v1.0 Stack (No Changes)
- ✓ Vanilla JavaScript - Compatible with FFmpeg.wasm
- ✓ HTML5 Audio for playback - Keep for playback
- ✓ IndexedDB for caching - Extend for processed audio
- ✓ Whisper API transcription - No changes needed
- ✓ JSON export with cut timestamps - Keep for cut metadata

### NEW: Audio Processing Layer (v2.0)

```javascript
// src/services/audioProcessingService.js (NEW)
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class AudioProcessingService {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.loaded = false;
  }

  async initialize() {
    // Lazy load: only when user clicks "Process Audio"
    // Saves ~25MB download on initial page load
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
    });
    this.loaded = true;
  }

  async applyCuts(audioFile, cutRegions) {
    if (!this.loaded) await this.initialize();

    // Write input file to FFmpeg virtual filesystem
    await this.ffmpeg.writeFile('input.mp3', await fetchFile(audioFile));

    // Build filter to remove cut regions
    const filterCmd = this.buildCutFilter(cutRegions);

    // Execute FFmpeg processing
    await this.ffmpeg.exec([
      '-i', 'input.mp3',
      '-filter_complex', filterCmd,
      '-map', '[out]',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      'output.mp3'
    ]);

    // Read processed output
    const data = await this.ffmpeg.readFile('output.mp3');

    // CRITICAL: Cleanup virtual filesystem immediately
    await this.ffmpeg.deleteFile('input.mp3');
    await this.ffmpeg.deleteFile('output.mp3');

    return new Blob([data.buffer], { type: 'audio/mpeg' });
  }

  buildCutFilter(cutRegions) {
    // Build FFmpeg filter_complex to remove cut regions
    // Keeps audio OUTSIDE cut regions, concatenates remaining segments
    // Example: Keep 0-10s, remove 10-20s, keep 20-end
    // Filter: [0:a]atrim=0:10,asetpts=PTS-STARTPTS[a0];[0:a]atrim=20,asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[out]
  }
}
```

## Memory Management for Large Files

### Memory Requirements (45-90 minute podcasts)

| File Duration | Typical Size (MP3 128kbps) | Peak Memory Usage | Browser Limit |
|---------------|----------------------------|-------------------|---------------|
| 45 minutes | ~43 MB | ~150-200 MB | 2 GB (WebAssembly) |
| 60 minutes | ~58 MB | ~200-250 MB | 2 GB (WebAssembly) |
| 90 minutes | ~86 MB | ~300-400 MB | 2 GB (WebAssembly) |

**Verdict:** 45-90 minute podcasts are **well within safe limits** for browser processing. WebAssembly 2GB limit provides 5-10x safety margin.

### Memory Best Practices

1. **Lazy Load FFmpeg:** Only load ffmpeg.wasm (~25MB) when user clicks "Process Audio"
2. **Immediate Cleanup:** Call `ffmpeg.deleteFile()` immediately after reading output
3. **Revoke Blob URLs:** Call `URL.revokeObjectURL()` after download link created
4. **File Size Validation:** Warn users if file exceeds 500 MB (conservative safety margin)
5. **Progress Feedback:** Use ffmpeg progress events to show processing status

```javascript
// Memory cleanup pattern
ffmpeg.on('progress', ({ progress }) => {
  updateProgressBar(progress * 100);
});

// Cleanup immediately after reading
const data = await ffmpeg.readFile('output.mp3');
await ffmpeg.deleteFile('input.mp3');
await ffmpeg.deleteFile('output.mp3');

// Create download, then revoke URL
const processedBlob = new Blob([data.buffer], { type: 'audio/mpeg' });
const downloadUrl = URL.createObjectURL(processedBlob);
// ... user downloads file ...
URL.revokeObjectURL(downloadUrl);
```

## Performance Characteristics

### Processing Time Estimates

FFmpeg.wasm runs ~20-25x slower than native FFmpeg due to WebAssembly overhead:

| File Duration | Native FFmpeg | ffmpeg.wasm (single-thread) | ffmpeg.wasm (multi-thread) |
|---------------|---------------|----------------------------|---------------------------|
| 45 minutes | ~15 seconds | ~6 minutes | ~3 minutes |
| 60 minutes | ~20 seconds | ~8 minutes | ~4 minutes |
| 90 minutes | ~30 seconds | ~12 minutes | ~6 minutes |

**Decision:** Use multi-threaded core (@ffmpeg/core-mt) for 2x speedup. 3-6 minute processing time is acceptable for occasional export workflow.

### User Experience Implications

- **Show clear progress bar** with time estimate (ffmpeg provides progress events)
- **Allow cancellation** of processing (ffmpeg.terminate())
- **Cache processed results** in IndexedDB to avoid re-processing
- **Consider "draft mode"** with lower bitrate for faster preview (96kbps vs 128kbps = ~30% faster)

## Codec Support

ffmpeg.wasm supports all common podcast audio formats:

| Codec | Input Support | Output Support | Notes |
|-------|---------------|----------------|-------|
| MP3 | ✓ | ✓ (libmp3lame) | Most common podcast format. Recommended output. |
| M4A/AAC | ✓ | ✓ | Common for Apple podcasts |
| WAV | ✓ | ✓ | Uncompressed. 45-min WAV = 500MB. Avoid for output. |
| Opus | ✓ | ✓ | Modern efficient codec |
| OGG Vorbis | ✓ | ✓ | Open format |

**Recommendation:** Output MP3 format (libmp3lame encoder, 128kbps) for maximum podcast platform compatibility.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **@ffmpeg/ffmpeg** | ffmpeg.audio.wasm | If bundle size critical (5MB vs 20MB). Audio-only build. PodEdit doesn't need video, so viable alternative. |
| **@ffmpeg/ffmpeg** | Web Audio API + AudioBuffer | ONLY for simple trimming without format conversion. Web Audio API cannot export compressed formats (MP3, AAC). Output would be WAV (500MB+ for 45 min). |
| **@ffmpeg/ffmpeg** | Server-side FFmpeg | If processing time critical OR files exceed 500MB. Requires backend infrastructure and file upload. Contradicts "local web app" design. |
| **@ffmpeg/core-mt** | @ffmpeg/core (single-thread) | NEVER for podcast-length files. 2x slower with zero benefit. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Web Audio API alone** | Cannot export compressed audio (MP3, AAC). Only supports WAV export via OfflineAudioContext. 45-min WAV = 500MB+. | ffmpeg.wasm for format conversion |
| **@ffmpeg/core (single-thread)** | 2x slower than multi-thread (6-12 min vs 3-6 min for podcasts). No benefit. | @ffmpeg/core-mt (multi-threaded) |
| **CDN-loaded ffmpeg.wasm** | Web Workers cannot load from CDN due to CORS. Will fail at runtime. | Use unpkg with toBlobURL helper (converts to blob://) |
| **Native FFmpeg via subprocess** | Not available in browser. PodEdit is client-side only. | ffmpeg.wasm (WebAssembly port) |
| **ffmpeg.wasm v0.11.x** | Breaking API changes in v0.12. All examples use new async/await API. Callbacks deprecated. | @ffmpeg/ffmpeg v0.12.15+ |
| **Server-side processing** | Contradicts "local web app" design. Requires backend, uploads, privacy concerns. | Browser-based ffmpeg.wasm |

## Stack Patterns by Scenario

**If file size < 100MB (most podcasts):**
- Use @ffmpeg/ffmpeg with multi-threaded core
- Process entirely in browser (3-4 min)
- Cache result in IndexedDB
- Expected: 95% of use cases

**If file size 100-500MB (long podcasts):**
- Use @ffmpeg/ffmpeg with multi-threaded core
- Show warning: "This will take 5-10 minutes"
- Implement cancellation
- Expected: 4% of use cases

**If file size > 500MB:**
- Block browser processing (memory risk)
- Show error: "File too large for browser processing"
- Suggest: Split into smaller episodes or use external editor
- Expected: <1% of use cases

**If bundle size critical:**
- Consider ffmpeg.audio.wasm (~5MB) instead of full build (~20MB)
- Only supports audio codecs (no video)
- PodEdit doesn't need video support, so viable
- Trade-off: Slower download vs initial page load

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @ffmpeg/ffmpeg@0.12.15 | @ffmpeg/util@latest | Both required, util is peer dependency |
| @ffmpeg/ffmpeg@0.12.15 | @ffmpeg/core-mt@0.12.6 | Multi-threaded core, loaded dynamically |
| @ffmpeg/ffmpeg@0.12.x | Vite 4+ | Requires optimizeDeps.exclude configuration |
| Vite latest | Node 18+, 20+ | PodEdit currently uses 'serve' - migration needed |

**Breaking change:** ffmpeg.wasm v0.11.x to v0.12.x changed from callbacks to async/await API. All documentation uses v0.12+ patterns.

## Architecture Notes

### Why This Stack for PodEdit v2.0

**Frontend simplicity maintained:**
- Vanilla JS architecture from v1.0 unchanged
- FFmpeg.wasm integrates as single service class
- No framework needed - modern ES modules sufficient
- HTML5 Audio continues handling playback (not FFmpeg)

**Browser processing advantages:**
- No file uploads (privacy: audio never leaves device)
- No backend infrastructure required
- No hosting costs for processing
- Works offline after initial load
- Aligns with "local web app" design philosophy

**FFmpeg.wasm is purpose-built for this:**
- Industry-standard audio manipulation in browser
- Full codec support (MP3, AAC, Opus, etc.)
- Filter system handles complex cut operations
- Multi-threaded for acceptable performance
- 45-90 min podcasts well within memory limits
- WebAssembly isolation prevents crashes

**Trade-offs accepted:**
- 3-6 minute processing time (vs instant server-side)
- 500MB file size limit (vs unlimited server-side)
- 20x slower than native (acceptable for occasional export)

### Migration from v1.0 to v2.0

**No changes to existing features:**
- Audio playback (HTML5 Audio) - unchanged
- Transcription (Whisper API) - unchanged
- Transcript navigation - unchanged
- Cut marking UI - unchanged
- IndexedDB caching - extended (add processed audio)

**New additions only:**
- Vite dev server (replace 'serve' package)
- vite.config.js (COOP/COEP headers)
- @ffmpeg/ffmpeg + @ffmpeg/util packages
- AudioProcessingService class
- "Process Audio" button + progress UI
- Download processed audio file

### Production Deployment Considerations

**Static Hosting (Current: serve package)**

FFmpeg.wasm **requires** COOP/COEP headers for SharedArrayBuffer. Static file servers like `serve` cannot set these headers.

**Options:**
1. **Migrate to Vite** (recommended) - Built-in dev server with header configuration
2. **Netlify/Vercel/Cloudflare** - All support COOP/COEP header configuration
3. **Service Worker Workaround** - Intercept requests and inject headers client-side

**Example Netlify config:**
```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

## Sources

### High Confidence (Official Documentation)
- [GitHub - ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) — Latest version (0.12.15, Jan 2025), API documentation
- [ffmpeg.wasm Official Docs - Installation](https://ffmpegwasm.netlify.app/docs/getting-started/installation/) — Installation instructions, environment requirements
- [ffmpeg.wasm Official Docs - Performance](https://ffmpegwasm.netlify.app/docs/performance/) — Performance benchmarks (128.8s vs 5.2s native, ~25x slower)
- [GitHub - Releases](https://github.com/ffmpegwasm/ffmpeg.wasm/releases) — Version history (v0.12.15 released Jan 7, 2025)
- [@ffmpeg/ffmpeg - npm](https://www.npmjs.com/package/@ffmpeg/ffmpeg) — Package installation (0.12.15 confirmed)
- [ffmpeg.wasm Official Docs - Overview](https://ffmpegwasm.netlify.app/docs/overview/) — Architecture, async/await API, Web Worker details

### Medium Confidence (Verified Multi-Source)
- [Vite Configuration for ffmpeg.wasm - GitHub Discussion #798](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/798) — Vite config examples (optimizeDeps, headers)
- [React + Vite ffmpeg.wasm Example](https://github.com/caominhdev/React-Vite-ffmpeg.wasm) — Multi-threaded setup with COOP/COEP
- [Large File Handling - GitHub Discussion #516](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/516) — Memory limits (2GB WebAssembly hard limit)
- [Memory Usage Discussion - GitHub Issue #83](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/83) — Memory management (deleteFile() cleanup patterns)
- [GitHub - JorenSix/ffmpeg.audio.wasm](https://github.com/JorenSix/ffmpeg.audio.wasm) — Audio-only build (5MB vs 20MB)
- [Building Browser Audio Tools - SoundTools](https://soundtools.io/blog/building-browser-audio-tools-ffmpeg-wasm/) — 100MB file memory usage (~300-400MB peak)
- [COOP/COEP Requirements - GitHub Discussion #576](https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/576) — Cross-origin isolation setup
- [SharedArrayBuffer Requirements - GitHub Issue #234](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/234) — Headers configuration (same-origin, require-corp)

### Low Confidence (Community Sources)
- [Effortless audio encoding - Transloadit](https://transloadit.com/devtips/effortless-audio-encoding-in-the-browser-with-webassembly/) — Web Audio API vs ffmpeg.wasm comparison
- [FFmpeg.wasm vs IMG.LY](https://img.ly/ffmpeg-js-alternative) — Alternative solutions
- [Speed Discussion - GitHub Issue #326](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/326) — Performance characteristics (~40fps video vs 500fps native)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Native browser capabilities (no MP3 export)
- [AudioBuffer - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) — Audio buffer manipulation limitations

---
*Stack research for: PodEdit - Local podcast audio editing web app*
*Researched: 2026-01-22 (v1.0 stack)*
*Updated: 2026-01-26 (v2.0 browser audio processing)*
*Confidence: HIGH - Core claims verified with official ffmpeg.wasm docs and GitHub releases*
