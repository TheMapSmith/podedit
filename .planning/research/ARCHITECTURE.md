# Architecture Research: FFmpeg.wasm Integration

**Domain:** Browser-based podcast audio processing
**Researched:** 2026-01-26
**Confidence:** HIGH

## Existing Architecture Overview

PodEdit uses vanilla JavaScript with clear controller/service separation:

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Player   │  │ Transcript│  │ Cut      │                   │
│  │Controller│  │Controller│  │Controller│                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       │             │             │                          │
├───────┴─────────────┴─────────────┴──────────────────────────┤
│                        Service Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Audio   │  │Transcribe│  │  Export  │  │  Cache   │    │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        Data Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ HTML5    │  │IndexedDB │  │CutRegion │                   │
│  │  Audio   │  │  Cache   │  │  Model   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Existing Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| AudioService | Manages HTML5 Audio element for streaming playback | Blob URL creation, event handling, cleanup |
| CutController | Manages cut region state (mark start/end pairs) | Array of CutRegion models with callbacks |
| TranscriptController | Renders transcript, handles word navigation | DOM manipulation, timestamp parsing |
| ExportService | Downloads JSON with cut timestamps | Blob creation for file download |
| PlayerController | UI state coordination (play/pause, seek) | RequestAnimationFrame updates |

## New Architecture for V2.0

### Extended System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Player   │  │Transcript│  │   Cut    │  │Processing│    │
│  │Controller│  │Controller│  │Controller│  │Controller│ NEW│
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
├───────┴─────────────┴─────────────┴─────────────┴───────────┤
│                        Service Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Audio   │  │Transcribe│  │  Export  │  │Processing│NEW │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │
│  └──────────┘  └──────────┘  └────┬─────┘  └────┬─────┘    │
├───────────────────────────────────┴──────────────┴──────────┤
│                        Processing Layer                  NEW │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              FFmpeg.wasm Instance                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Web      │  │ Virtual  │  │WASM Core │          │    │
│  │  │ Worker   │  │File Sys  │  │(Engine)  │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        Data Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ HTML5    │  │IndexedDB │  │CutRegion │                   │
│  │  Audio   │  │  Cache   │  │  Model   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### New Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| ProcessingService | Orchestrates FFmpeg.wasm for audio processing | FFmpeg instance lifecycle, command construction |
| ProcessingController | UI for process trigger, progress display | Button state, progress bar updates |
| ExportService (extended) | Downloads both JSON and processed audio | Add downloadAudio() method alongside downloadJson() |

## Data Flow: Cut Marks → FFmpeg → Download

### Complete Processing Flow

```
[User clicks "Process Audio"]
    ↓
[ProcessingController.onProcessClick()]
    ↓ (1. Get audio file)
[AudioService.getOriginalFile()] ────────────┐
    ↓                                        │
[ProcessingController]                       │
    ↓ (2. Get cut list)                     │
[CutController.getCutRegions()] ─────────┐  │
    ↓                                     │  │
[ProcessingController]                    │  │
    ↓ (3. Orchestrate processing)         │  │
[ProcessingService.processAudio(file, cuts)] │
    ↓                                     │  │
[FFmpeg.wasm Processing Pipeline]         │  │
    │                                     │  │
    ├─ (3a) Load FFmpeg.wasm             │  │
    │   await ffmpeg.load()               │  │
    │                                     │  │
    ├─ (3b) Write input to virtual FS    │  │
    │   await ffmpeg.writeFile()    ◄────┴──┘
    │                                     │
    ├─ (3c) Generate filter_complex ◄────┘
    │   buildFilterCommand(cuts)
    │
    ├─ (3d) Execute FFmpeg
    │   await ffmpeg.exec([...])
    │   [progress callbacks fire]
    │
    ├─ (3e) Read output
    │   await ffmpeg.readFile()
    │
    └─ (3f) Cleanup
        ffmpeg.terminate()
    ↓
[ProcessingService returns Blob]
    ↓
[ProcessingController receives Blob]
    ↓ (4. Download processed file)
[ExportService.downloadAudio(blob, filename)]
    ↓
[Browser downloads edited audio file]
```

## FFmpeg.wasm Integration Patterns

### Pattern 1: Service Initialization (Lazy Loading)

**What:** Load FFmpeg.wasm only when needed (on-demand), not at application startup.

**Why:** FFmpeg WASM core is ~31MB (single-thread) or ~32MB (multi-thread). Loading on startup delays initial page load unnecessarily.

**Implementation:**
```javascript
class ProcessingService {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
  }

  async ensureLoaded() {
    if (this.isLoaded) return;

    this.ffmpeg = new FFmpeg();
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
  }
}
```

**Trade-offs:**
- Pro: Faster initial load for users who only want transcription
- Pro: Memory efficient until processing needed
- Con: User waits for FFmpeg download when clicking "Process Audio"
- Con: Need to handle loading state in UI

### Pattern 2: Virtual File System Management

**What:** FFmpeg.wasm uses an in-memory virtual filesystem. Write files in, execute commands, read files out.

**Why:** WASM has no native access to browser File objects. Must copy data into virtual FS.

**Implementation:**
```javascript
async processAudio(audioFile, cutRegions) {
  await this.ensureLoaded();

  // Write input file to virtual FS
  const inputName = 'input.mp3'; // Use generic name
  await this.ffmpeg.writeFile(inputName, await fetchFile(audioFile));

  // Execute command (operates on virtual FS paths)
  const filterCmd = this.buildFilterCommand(cutRegions);
  await this.ffmpeg.exec(['-i', inputName, ...filterCmd, 'output.mp3']);

  // Read output from virtual FS
  const data = await this.ffmpeg.readFile('output.mp3');

  // Cleanup virtual FS
  await this.ffmpeg.deleteFile(inputName);
  await this.ffmpeg.deleteFile('output.mp3');

  return new Blob([data.buffer], { type: 'audio/mpeg' });
}
```

**Trade-offs:**
- Pro: Isolated filesystem prevents conflicts
- Pro: Automatic cleanup prevents memory leaks
- Con: Entire file loaded into memory (limits size)
- Con: File copy overhead (time and memory)

### Pattern 3: Filter Complex Command Construction

**What:** Build FFmpeg filter_complex commands to remove cut regions by concatenating kept segments.

**Why:** Can't directly "delete" regions from audio. Must extract kept segments and concatenate them.

**Approach:** For each cut region, generate `atrim` + `asetpts` filters to extract kept segments, then `concat` to join them.

**Implementation:**
```javascript
buildFilterCommand(cutRegions) {
  // Sort cuts by start time
  const sorted = [...cutRegions].sort((a, b) => a.startTime - b.startTime);

  // Build array of KEPT segments (inverse of cuts)
  const keepSegments = [];
  let currentTime = 0;

  for (const cut of sorted) {
    if (currentTime < cut.startTime) {
      keepSegments.push({ start: currentTime, end: cut.startTime });
    }
    currentTime = cut.endTime;
  }

  // Add final segment after last cut (if any)
  // Note: Need audio duration - get from AudioService
  const duration = this.audioDuration; // Must be injected
  if (currentTime < duration) {
    keepSegments.push({ start: currentTime, end: duration });
  }

  // Build filter_complex command
  // Example: [0:a]atrim=0:10,asetpts=PTS-STARTPTS[a0];
  //          [0:a]atrim=15:30,asetpts=PTS-STARTPTS[a1];
  //          [a0][a1]concat=v=0:a=1[out]

  if (keepSegments.length === 0) {
    throw new Error('No audio would remain after cuts');
  }

  if (keepSegments.length === 1) {
    // Single segment - simple trim
    const seg = keepSegments[0];
    return [
      '-af',
      `atrim=${seg.start}:${seg.end},asetpts=PTS-STARTPTS`
    ];
  }

  // Multiple segments - need concat
  const filters = [];
  const labels = [];

  keepSegments.forEach((seg, i) => {
    const label = `a${i}`;
    filters.push(`[0:a]atrim=${seg.start}:${seg.end},asetpts=PTS-STARTPTS[${label}]`);
    labels.push(`[${label}]`);
  });

  // Concat all segments
  filters.push(`${labels.join('')}concat=v=0:a=${keepSegments.length}[out]`);

  return [
    '-filter_complex',
    filters.join(';'),
    '-map', '[out]'
  ];
}
```

**Trade-offs:**
- Pro: Precise timestamp control
- Pro: Maintains audio quality (no re-encoding if using -c copy, but filter requires re-encode)
- Con: Complex command construction
- Con: Requires audio duration from AudioService

### Pattern 4: Progress Callbacks

**What:** FFmpeg.wasm fires progress events during processing. Wire to UI progress bar.

**Why:** Long files (45-90 min podcasts) may take minutes to process. User needs feedback.

**Limitations:** Progress events are experimental and may not fire for all operations. Progress ratio is only accurate when input/output durations match (which they won't for cuts).

**Implementation:**
```javascript
class ProcessingService {
  async processAudio(audioFile, cutRegions, onProgress) {
    await this.ensureLoaded();

    // Register progress callback
    this.ffmpeg.on('progress', ({ progress, time }) => {
      // progress is 0-1 ratio (unreliable for cuts)
      // time is current processing timestamp in microseconds
      if (onProgress) {
        // Convert time to seconds
        const seconds = time / 1000000;
        onProgress({ seconds, progress });
      }
    });

    // ... processing ...

    // Cleanup callback
    this.ffmpeg.off('progress');
  }
}
```

**Alternative approach:** Log callback for more reliable feedback
```javascript
this.ffmpeg.on('log', ({ message }) => {
  // Parse FFmpeg output for "time=" to extract progress
  // Example: "frame= 1234 fps=56 time=00:01:23.45"
  const match = message.match(/time=(\d{2}):(\d{2}):(\d{2})/);
  if (match && onProgress) {
    const [_, hours, mins, secs] = match;
    const totalSeconds = parseInt(hours) * 3600 +
                         parseInt(mins) * 60 +
                         parseInt(secs);
    onProgress({ seconds: totalSeconds });
  }
});
```

**Trade-offs:**
- Pro: User sees progress during long operations
- Con: Progress events are experimental and unreliable
- Con: Log parsing is fragile and FFmpeg-version dependent

### Pattern 5: Memory Management & Cleanup

**What:** FFmpeg.wasm loads entire files into WASM memory. Must cleanup aggressively to prevent crashes.

**Why:** Browsers limit WASM memory (typically 2-4GB). 90-minute podcasts can be 100-200MB uncompressed.

**Critical cleanup points:**
1. After readFile (delete virtual FS files)
2. After processing complete (terminate FFmpeg instance)
3. On error (cleanup in finally block)

**Implementation:**
```javascript
class ProcessingService {
  async processAudio(audioFile, cutRegions, onProgress) {
    try {
      await this.ensureLoaded();

      const inputName = 'input.mp3';
      await this.ffmpeg.writeFile(inputName, await fetchFile(audioFile));

      // ... processing ...

      const data = await this.ffmpeg.readFile('output.mp3');

      // Immediate cleanup of virtual FS
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile('output.mp3');

      return new Blob([data.buffer], { type: this.getOutputMimeType(audioFile) });

    } catch (error) {
      console.error('Processing failed:', error);
      throw new Error(`Audio processing failed: ${error.message}`);

    } finally {
      // Always terminate FFmpeg instance to free memory
      if (this.ffmpeg) {
        this.ffmpeg.terminate();
        this.isLoaded = false;
        this.ffmpeg = null;
      }
    }
  }
}
```

**Trade-offs:**
- Pro: Prevents memory leaks
- Pro: Allows multiple processing operations in one session
- Con: Must reload FFmpeg for next operation (adds ~2-3s overhead)
- Con: Aggressive cleanup means losing state

**Alternative: Reuse instance**
For batch processing (multiple files), don't terminate between operations:
```javascript
// Keep instance alive, only cleanup files
await this.ffmpeg.deleteFile(inputName);
await this.ffmpeg.deleteFile('output.mp3');
```

But for PodEdit's one-file workflow, aggressive cleanup is safer.

## Integration Points with Existing Services

### 1. AudioService → ProcessingService

**What ProcessingService needs:** Original audio File object

**Current state:** AudioService only exposes HTML5 Audio element, not original File

**Required change:** AudioService must store and expose the original File object

**Implementation:**
```javascript
// audioService.js modification
class AudioService {
  constructor() {
    this.audio = new Audio();
    this.originalFile = null; // NEW
  }

  async loadFile(file) {
    this.originalFile = file; // NEW - store reference

    const url = URL.createObjectURL(file);
    this.audio.src = url;
    // ... rest of existing code
  }

  getOriginalFile() {  // NEW method
    return this.originalFile;
  }
}
```

### 2. CutController → ProcessingService

**What ProcessingService needs:** Array of cut regions with start/end times

**Current state:** CutController already provides `getCutRegions()` returning CutRegion[]

**Required change:** None - interface already exists

**Usage:**
```javascript
// processingController.js
const cuts = this.cutController.getCutRegions();
const processedBlob = await this.processingService.processAudio(
  this.audioService.getOriginalFile(),
  cuts,
  (progress) => this.updateProgressBar(progress)
);
```

### 3. ProcessingService → ExportService

**What ExportService needs:** Processed audio Blob and filename

**Current state:** ExportService only handles JSON downloads

**Required change:** Add downloadAudio() method

**Implementation:**
```javascript
// exportService.js extension
class ExportService {
  // ... existing downloadJson method ...

  /**
   * Download audio blob as a file
   * @param {Blob} audioBlob - Processed audio data
   * @param {string} originalFilename - Original audio filename
   */
  downloadAudio(audioBlob, originalFilename) {
    // Derive output filename: "podcast.mp3" -> "podcast-edited.mp3"
    const baseName = originalFilename.replace(/\.[^.]+$/, '');
    const extension = originalFilename.match(/\.[^.]+$/)?.[0] || '.mp3';
    const outputFilename = `${baseName}-edited${extension}`;

    // Create object URL and trigger download
    const url = URL.createObjectURL(audioBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = outputFilename;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke URL after download to prevent memory leak
    URL.revokeObjectURL(url);
  }
}
```

### 4. AudioService Duration → ProcessingService

**What ProcessingService needs:** Total audio duration to calculate final segment

**Current state:** AudioService has getDuration() method

**Required change:** None, but ProcessingService must call it

**Usage:**
```javascript
// processingService.js
buildFilterCommand(cutRegions) {
  // Need duration to calculate final kept segment
  // This must be passed in from controller
  const duration = this.audioDuration;
  // ... rest of command building
}
```

**Better pattern:** Inject duration when processing starts
```javascript
async processAudio(audioFile, cutRegions, duration, onProgress) {
  this.audioDuration = duration; // Store for buildFilterCommand
  // ...
}
```

## Component Dependency Graph

```
ProcessingController (NEW)
    │
    ├─→ AudioService.getOriginalFile()
    ├─→ AudioService.getDuration()
    ├─→ CutController.getCutRegions()
    ├─→ ProcessingService.processAudio() (NEW)
    └─→ ExportService.downloadAudio() (NEW)

ProcessingService (NEW)
    │
    ├─→ FFmpeg.wasm (external library)
    ├─→ @ffmpeg/util.fetchFile() (external library)
    └─→ @ffmpeg/util.toBlobURL() (external library)

AudioService (MODIFIED)
    + getOriginalFile() method
    + originalFile storage

ExportService (MODIFIED)
    + downloadAudio() method
```

## Suggested Build Order

Based on dependencies and risk, build in this order:

### Phase 1: Service Foundation (Low Risk)
1. **Add ProcessingService skeleton** - Class structure, no FFmpeg yet
   - Constructor
   - processAudio() stub that returns dummy Blob
   - buildFilterCommand() stub
2. **Extend AudioService** - Add getOriginalFile() method
3. **Extend ExportService** - Add downloadAudio() method
4. **Test service integration** - Wire services together without FFmpeg

### Phase 2: FFmpeg Integration (Medium Risk)
5. **Add FFmpeg.wasm library** - Install @ffmpeg/ffmpeg and @ffmpeg/util
6. **Implement FFmpeg loading** - ensureLoaded() method
7. **Implement basic processing** - Write file, exec simple command, read output
8. **Test with simple audio file** - No cuts, just load and re-encode

### Phase 3: Cut Logic (High Risk - Complex)
9. **Implement buildFilterCommand()** - Single cut first
10. **Test single cut removal** - Verify timestamps correct
11. **Extend to multiple cuts** - Array of cuts with concat
12. **Test edge cases** - No cuts, all cuts, overlapping cuts

### Phase 4: UI & Polish (Low Risk)
13. **Add ProcessingController** - Button to trigger processing
14. **Add progress bar** - Wire progress callbacks to UI
15. **Add error handling** - Display errors to user
16. **Add file size warnings** - Warn for files >100MB

### Phase 5: Memory Management (Medium Risk)
17. **Add cleanup on success** - Delete files, terminate instance
18. **Add cleanup on error** - Finally blocks
19. **Test memory usage** - Multiple process operations in one session
20. **Add SharedArrayBuffer detection** - Warn if browser doesn't support

## Memory Lifecycle

```
[User uploads audio file]
    │
    ├─→ AudioService stores File reference (~100MB MP3)
    │   [Memory: ~100MB for File object]
    │
[User clicks "Process Audio"]
    │
    ├─→ ProcessingService.ensureLoaded()
    │   ├─ Download FFmpeg WASM (~31MB)
    │   ├─- Initialize FFmpeg instance
    │   [Memory: +31MB for WASM + overhead]
    │
    ├─→ ffmpeg.writeFile(input)
    │   ├─ Copy File to virtual FS
    │   [Memory: +100MB copy in WASM memory]
    │
    ├─→ ffmpeg.exec(filter_complex)
    │   ├─ Decode audio to PCM
    │   ├─ Process segments
    │   ├─ Encode output
    │   [Memory: Peak ~300-400MB during processing]
    │   [         - Input: 100MB]
    │   [         - Decoded PCM: ~200MB for 90min]
    │   [         - Output buffer: ~100MB]
    │
    ├─→ ffmpeg.readFile(output)
    │   ├─ Copy output to JavaScript
    │   [Memory: +100MB for output Blob]
    │
    ├─→ Cleanup: deleteFile(input, output)
    │   [Memory: -200MB (virtual FS files cleared)]
    │
    └─→ Cleanup: ffmpeg.terminate()
        [Memory: -31MB (WASM freed)]

[User downloads audio]
    │
    └─→ ExportService.downloadAudio(blob)
        ├─ Create object URL (reference, no copy)
        ├─ Trigger download
        └─ Revoke URL
        [Memory: Original ~100MB input still in AudioService]
        [Memory: ~100MB output Blob until download complete]
```

**Peak memory usage:** ~500-600MB
- Original file in AudioService: 100MB
- FFmpeg WASM: 31MB
- Virtual FS copy: 100MB
- Decoded PCM: 200MB
- Output Blob: 100MB

**After cleanup:** ~200MB
- Original file: 100MB (kept for replay)
- Output Blob: 100MB (until download complete, then GC'd)

## Browser Compatibility Requirements

FFmpeg.wasm requires:
- **WebAssembly support** - Chrome 57+, Firefox 52+, Safari 11+, Edge 79+ (95%+ coverage)
- **SharedArrayBuffer** - Chrome 89+, Firefox 79+, Safari 15.2+, Edge 89+ (95%+ coverage as of 2024)
- **Cross-Origin Isolation** - Requires headers:
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`

**For localhost development:** These headers are automatically provided by most dev servers.

**Detection pattern:**
```javascript
function supportsFFmpeg() {
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, reason: 'WebAssembly not supported' };
  }

  if (typeof SharedArrayBuffer === 'undefined') {
    return {
      supported: false,
      reason: 'SharedArrayBuffer not available (cross-origin isolation required)'
    };
  }

  return { supported: true };
}
```

## Anti-Patterns

### Anti-Pattern 1: Loading FFmpeg on Startup

**What people do:** Load FFmpeg.wasm in application initialization
**Why it's wrong:** Delays initial page load by 2-3 seconds for all users, even those who only want transcription
**Do this instead:** Lazy load FFmpeg when user clicks "Process Audio" button

### Anti-Pattern 2: Forgetting Virtual FS Cleanup

**What people do:** Read output file and return, leaving files in virtual FS
**Why it's wrong:** Memory leak - virtual FS files persist in WASM memory until explicitly deleted
**Do this instead:** Always delete virtual FS files after reading, use try/finally blocks

### Anti-Pattern 3: Building Filter Commands with String Concatenation

**What people do:** Build `-filter_complex` string by concatenating parts
**Why it's wrong:** Easy to introduce syntax errors, hard to debug, shell escaping issues
**Do this instead:** Build filter as array of parts, join with semicolons, pass as single argument

### Anti-Pattern 4: Using -c copy with filter_complex

**What people do:** Try to use `-c copy` (stream copy) with `-filter_complex`
**Why it's wrong:** Filters require decoding/encoding - stream copy skips that, command fails
**Do this instead:** Let FFmpeg choose encoder, or explicitly specify `-c:a libmp3lame` for MP3

### Anti-Pattern 5: Assuming Progress Events Are Accurate

**What people do:** Use progress events to show exact percentage completion
**Why it's wrong:** Progress events are experimental, ratios are inaccurate when output duration differs from input
**Do this instead:** Show indeterminate progress spinner, or parse log output for time values (fragile)

## Sources

### Architecture & Integration
- [FFmpeg.wasm GitHub Repository](https://github.com/ffmpegwasm/ffmpeg.wasm) - Official repository
- [FFmpeg.wasm Overview Documentation](https://ffmpegwasm.netlify.app/docs/overview/) - Architecture overview
- [FFmpeg.wasm API Reference](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/) - API methods
- [FFmpeg.wasm Usage Guide](https://ffmpegwasm.netlify.app/docs/getting-started/usage/) - Code examples

### Memory Management
- [Building Browser-Based Audio Tools with FFmpeg.wasm (2024)](https://soundtools.io/blog/building-browser-audio-tools-ffmpeg-wasm/) - Memory management patterns
- [Moving FFmpeg to the Browser: How I Saved 100% on Server Costs](https://dev.to/baojian_yuan/moving-ffmpeg-to-the-browser-how-i-saved-100-on-server-costs-using-webassembly-4l9f) - Memory cleanup strategies
- [Mastering FFMPEG WASM](https://harryosmarsitohang.com/articles/ffmpeg-wasm) - Performance considerations

### Progress & Monitoring
- [Progress event value · Issue #600](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/600) - Progress limitations
- [FFmpeg WASM encoding progress](https://www.japj.net/2025/04/21/ffmpeg-wasm-encoding-progress/) - Alternative progress tracking (April 2025)

### Audio Processing Techniques
- [How to Cut Sections out of an MP4 File with FFmpeg](https://markheath.net/post/cut-and-concatenate-with-ffmpeg) - Cut and concat patterns
- [Practical ffmpeg commands to manipulate a video](https://transang.me/practical-ffmpeg-commands-to-manipulate-a-video/) - Filter examples
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html) - Official filter reference

---
*Architecture research for: PodEdit V2.0 FFmpeg.wasm integration*
*Researched: 2026-01-26*
