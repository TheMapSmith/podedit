# Feature Research

**Domain:** Browser-based audio processing for podcast editing
**Researched:** 2026-01-26
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Process trigger button | Users need clear affordance to start processing | LOW | Standard pattern: "Export" or "Download Edited Audio" button. Should be visually distinct, placed near cut list/timeline |
| Determinate progress indicator | Long-running operations require progress feedback to prevent abandonment | MEDIUM | Research shows users wait 3x longer with animated progress bar. Show percentage + estimated time remaining |
| Cancel/abort processing | Users expect ability to stop long operations | MEDIUM | Critical UX issue: many professional audio tools have non-functional cancel buttons. Must actually stop processing and clean up resources |
| Memory error handling | Browser memory limits (2-4GB) require graceful failure | MEDIUM | Handle QuotaExceededError, provide clear message about file size limits, suggest workarounds |
| File download delivery | Browser download is expected pattern for generated files | LOW | Use Blob + createObjectURL() + anchor download attribute. Must call revokeObjectURL() to prevent memory leaks |
| Filename suggestion | Generated files need sensible default names | LOW | Convention: `{original-name}_edited_{timestamp}.{ext}`. Use YYYYMMDD_HHMM format for timestamp |
| Format preservation | Output should match input format by default | MEDIUM | If user uploads MP3, export MP3. Avoids unexpected quality loss or compatibility issues |
| Processing status visibility | User needs to know what's happening during processing | LOW | Show current operation: "Loading FFmpeg...", "Analyzing audio...", "Applying cuts...", "Generating output..." |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| No upload required | Privacy + speed: process locally without server round-trip | LOW | Already decided: browser-based processing. Strong differentiator for privacy-conscious users |
| Transcript-driven cuts | Text-based editing is faster than waveform scrubbing | LOW | Core value already built in v1.0. Differentiates from traditional DAWs |
| Cut preview playback | Verify cuts before processing saves time on re-processing | MEDIUM | Play across cut boundary to hear transition. Useful for 45-90min files where re-processing is costly |
| Processing time estimate | Set expectations upfront based on file size and cut count | MEDIUM | Show estimate before processing starts: "This will take approximately 2-3 minutes" |
| Browser compatibility check | Detect WebAssembly support, show clear error if incompatible | LOW | Feature detection: `if (!window.WebAssembly)` with fallback message. Prevents cryptic failures |
| Memory usage indicator | Show current memory usage, warn before hitting limits | HIGH | Track approximate memory during processing, warn at 80% threshold. Helps users understand constraints |
| Processing log/details | Advanced users want to see FFmpeg commands and output | LOW | Show FFmpeg command being executed, capture stdout/stderr. Helps debugging and builds trust |
| Auto-save cut list | Don't lose work if processing fails or browser crashes | MEDIUM | Save cut list to localStorage before processing starts. Restore on page reload |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic preview generation | "I want to hear result before export" | Doubles processing time, doubles memory usage. For 90min file, generates 90min of preview before user can export | Manual "Preview Cut" button that plays 5 seconds around a specific cut boundary |
| Undo/redo after processing | "I made a mistake, undo the export" | Browser processing is destructive. Can't undo after export without re-processing entire file | Keep original file + cut list intact. User can adjust cuts and re-process (non-destructive workflow) |
| Real-time waveform during processing | "Show me visual feedback" | FFmpeg.wasm doesn't expose frame-by-frame output. Waveform requires separate decoding pass | Use determinate progress bar + current operation text. Simpler and sufficient |
| Background processing while editing | "Let me keep editing while it processes" | FFmpeg.wasm runs in web worker but blocks file access. Can't safely edit cut list while processing same file | Show modal dialog during processing, prevent editing. Clear "processing" vs "editing" states |
| Automatic filename generation | "Just download it without asking" | Users lose track of files, can't choose location. Browser security requires user gesture for download | Show file save dialog with suggested name. User confirms location and can rename |
| Format conversion options | "Export as WAV/MP3/AAC" | Adds UI complexity, increases testing surface, complicates error handling. Format support varies by browser | Preserve input format for v2.0. Add format conversion in v2.x if users actually request it |

## Feature Dependencies

```
File Download Delivery
    └──requires──> Process Trigger Button
                       └──requires──> FFmpeg.wasm Loading
                                          └──requires──> Browser Compatibility Check

Progress Indicator
    └──requires──> Processing Status Visibility
                       └──enhances──> Cancel/Abort Processing

Cut Preview Playback
    └──requires──> Audio Playback (already built in v1.0)
    └──conflicts──> Automatic Preview Generation (memory usage)

Auto-save Cut List
    └──enhances──> Cancel/Abort Processing (preserves work if aborted)
    └──enhances──> Memory Error Handling (can recover from failure)

Processing Time Estimate
    └──requires──> File Size Analysis
    └──enhances──> Progress Indicator (sets expectations)
```

### Dependency Notes

- **File Download requires Process Trigger:** Can't download until processing completes. Process trigger initiates the workflow.
- **Progress requires Status Visibility:** Progress percentage is meaningless without context about what operation is running.
- **Cut Preview conflicts with Auto Preview:** Both consume memory. Preview-on-demand is safer for large files.
- **Auto-save enhances Cancel/Abort:** If user cancels processing, their cut list is preserved for retry.
- **Time Estimate enhances Progress:** Users tolerate waits better when expectations are set upfront.

## MVP Definition

### Launch With (v2.0)

Minimum viable audio processing — what's needed to complete the workflow.

- [x] **Process trigger button** — Clear affordance to start processing (P1)
- [x] **Determinate progress indicator** — Percentage + current operation text (P1)
- [x] **Cancel/abort processing** — Stop button that actually works (P1)
- [x] **Memory error handling** — Graceful failure with clear message (P1)
- [x] **File download delivery** — Standard browser download with Blob URL (P1)
- [x] **Filename suggestion** — `{original}_edited_{timestamp}.{ext}` pattern (P1)
- [x] **Format preservation** — Output matches input format (P1)
- [x] **Browser compatibility check** — Detect WebAssembly, show error if unsupported (P1)

### Add After Validation (v2.x)

Features to add once core processing is working and users request them.

- [ ] **Cut preview playback** — Verify cuts before processing (P2, if users report re-processing pain)
- [ ] **Processing time estimate** — Set expectations before processing starts (P2, if users report uncertainty)
- [ ] **Processing log/details** — Show FFmpeg commands for debugging (P2, if users report errors)
- [ ] **Auto-save cut list** — Recover from failures (P2, if users report lost work)

### Future Consideration (v3+)

Features to defer until clear user demand exists.

- [ ] **Memory usage indicator** — Complex to implement accurately, unclear value until users hit limits
- [ ] **Format conversion options** — Adds complexity, may never be needed if format preservation works well
- [ ] **Batch processing** — Process multiple files, but conflicts with "one file at a time" constraint
- [ ] **Cloud backup of cut lists** — Requires server infrastructure, conflicts with "browser-only" constraint

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Process trigger button | HIGH | LOW | P1 |
| Progress indicator (determinate) | HIGH | MEDIUM | P1 |
| Cancel/abort processing | HIGH | MEDIUM | P1 |
| Memory error handling | HIGH | MEDIUM | P1 |
| File download delivery | HIGH | LOW | P1 |
| Filename suggestion | MEDIUM | LOW | P1 |
| Format preservation | HIGH | MEDIUM | P1 |
| Browser compatibility check | HIGH | LOW | P1 |
| Cut preview playback | MEDIUM | MEDIUM | P2 |
| Processing time estimate | MEDIUM | MEDIUM | P2 |
| Processing log/details | LOW | LOW | P2 |
| Auto-save cut list | MEDIUM | MEDIUM | P2 |
| Memory usage indicator | LOW | HIGH | P3 |
| Format conversion | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch (audio processing MVP)
- P2: Should have, add when users encounter pain points
- P3: Nice to have, defer until clear demand

## UX Pattern Details

### Processing Trigger

**Placement:** Primary action near cut list summary
**Label:** "Export Edited Audio" (clearer than "Process" or "Download")
**Visual treatment:** Primary button color, slightly larger than secondary actions
**State management:**
- Disabled when no cuts marked (gray, with tooltip: "Mark at least one cut to export")
- Disabled during processing (prevent double-click)
- Enabled when ready to process

### Progress Indicator

**Type:** Determinate progress bar (percentage-based)
**Elements:**
- Horizontal bar showing 0-100% fill
- Percentage text: "47% complete"
- Current operation text: "Applying cut 3 of 8..."
- Time estimate (if available): "About 1 minute remaining"
- Cancel button positioned next to progress bar

**Update frequency:**
- Progress percentage: every 500ms minimum (avoid UI thrashing)
- Operation text: when FFmpeg stage changes

### Error Handling

**Memory errors:**
```
Error Dialog:
Title: "File Too Large for Browser Processing"
Body: "This audio file (127 MB) exceeds browser memory limits.

Try these solutions:
• Close other browser tabs to free memory
• Process a shorter section of the file
• Use the JSON export and process with FFmpeg locally

File size limit: Approximately 90 minutes of audio"

Actions: [Close] [Export JSON Instead]
```

**Format errors:**
```
Error Dialog:
Title: "Unsupported Audio Format"
Body: "This file format is not supported for browser processing.

Supported formats: MP3, WAV, M4A, OGG
Detected format: FLAC

Convert the file to a supported format and try again."

Actions: [Close]
```

**Processing errors:**
```
Error Dialog:
Title: "Processing Failed"
Body: "An error occurred while processing the audio.

Technical details:
[FFmpeg stderr output]

Your cut list has been saved. You can try again or export the cut list as JSON."

Actions: [Try Again] [Export JSON] [Close]
```

### File Download

**Pattern:**
1. Create Blob from processed audio data
2. Generate blob URL: `URL.createObjectURL(blob)`
3. Create temporary anchor element
4. Set `download` attribute with suggested filename
5. Programmatically click anchor
6. Immediately revoke blob URL: `URL.revokeObjectURL(url)`

**Filename template:**
```javascript
// Input: "podcast-episode-42.mp3"
// Output: "podcast-episode-42_edited_20260126_1435.mp3"

const suggestedFilename = `${originalName}_edited_${timestamp}.${extension}`;
```

**Modern alternative (if supported):**
Use File System Access API `showSaveFilePicker()` to let user choose location upfront. Fall back to blob URL method for compatibility.

## Competitor Feature Analysis

| Feature | Descript (cloud-based) | Audacity (desktop) | Our Approach (browser) |
|---------|------------------------|-------------------|------------------------|
| Processing location | Server-side | Native desktop | Browser WebAssembly |
| Progress indication | Real-time percentage + waveform preview | Modal dialog with percentage | Modal dialog with percentage + operation text |
| Cancel processing | Yes, instant | Yes, instant | Yes, must clean up resources properly |
| Preview before export | Automatic (text-based editing) | Manual playback of timeline | Manual preview of cut boundaries |
| Undo after export | Yes (non-destructive, cloud storage) | History panel (session only) | No undo (re-process with adjusted cuts) |
| File size limits | Unlimited (server processing) | Limited by disk space | Limited by browser memory (2-4GB) |
| Format options | Multiple formats on export | Multiple formats via export dialog | Preserve input format (simpler) |
| Download delivery | Cloud storage + download | Save to chosen location | Browser download with suggested name |

**Key takeaway:** Browser-based approach trades format flexibility and undo capability for privacy and no-upload workflow. This aligns with the "transcript-driven, browser-only" core value.

## Sources

### FFmpeg.wasm Best Practices
- [Unleashing FFmpeg Power in the Browser - Medium](https://medium.com/@pardeepkashyap650/unleashing-ffmpeg-power-in-the-browser-a-guide-to-webassembly-video-processing-ec00297aa6ef)
- [ffmpeg.wasm GitHub Repository](https://github.com/ffmpegwasm/ffmpeg.wasm)
- [ffmpeg.wasm Official Documentation](https://ffmpegwasm.netlify.app/)
- [Building a Privacy-First Video to Audio Converter - DEV Community](https://dev.to/xg_fei_e836667012d8841d03/building-a-privacy-first-video-to-audio-converter-with-ffmpegwasm-1kd0)
- [ffmpeg.audio.wasm - Audio-focused build](https://github.com/JorenSix/ffmpeg.audio.wasm)

### Progress Indicators and UX Patterns
- [Progress Trackers and Indicators - UserGuiding](https://userguiding.com/blog/progress-trackers-and-indicators)
- [12 UI/UX Design Trends That Will Dominate 2026](https://www.index.dev/blog/ui-ux-design-trends)

### Browser File Download Patterns
- [URL: createObjectURL() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
- [Programmatically downloading files in the browser - LogRocket](https://blog.logrocket.com/programmatically-downloading-files-browser/)
- [How to save a file - web.dev](https://web.dev/patterns/files/save-a-file)
- [Blob - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

### Browser Memory and Error Handling
- [Exceeding the buffering quota - Chrome Developers](https://developer.chrome.com/blog/quotaexceedederror)
- [Audio + memory usage = headache - HTML5 Game Devs](https://www.html5gamedevs.com/topic/19339-audio-memory-usage-headache/)
- [OOM causes browser crash in decodeAudioData - Firefox Bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1066036)

### Web Audio API and Large File Handling
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Loading sound files faster - Clicktorelease](https://www.clicktorelease.com/blog/loading-sounds-faster-using-html5-web-audio-api/)
- [Phonograph.js: Stream large audio files - Medium](https://medium.com/@Rich_Harris/phonograph-js-tolerable-mobile-web-audio-55286bd5e567)
- [Web Audio API Performance - Paul Adenot](https://padenot.github.io/web-audio-perf/)

### Cancel/Abort UX Issues
- [Export Audio Mixdown: Cancel - Steinberg Forums](https://forums.steinberg.net/t/export-audio-mixdown-cancel/645001)
- [Can we get a true ABORT for Export? - Steinberg Forums](https://forums.steinberg.net/t/can-we-please-finally-get-a-true-instantaneous-abort-for-export-audio-mixdown/721393)

### Audio Editor Features and Standards
- [Best Podcast Editing Software in 2026 - Podcast Videos](https://www.podcastvideos.com/articles/best-podcast-editing-software-2026/)
- [10 Best Podcast Editing Software - Riverside](https://riverside.com/blog/podcast-editing-software)
- [Effective Sound File Naming - SoundCy](https://soundcy.com/article/how-to-name-sound-file)

### Non-Destructive Editing Workflows
- [Destructive vs Non-Destructive Audio Editing - The Podcast Host](https://www.thepodcasthost.com/editing-production/destructive-vs-non-destructive-editing/)
- [Audio Integrity: Destructive vs Non-Destructive - Journalism University](https://journalism.university/electronic-media/audio-integrity-destructive-non-destructive-editing/)
- [Ocenaudio Download (2026 Latest)](https://www.filehorse.com/download-ocenaudio/)

### Browser Format Support
- [MP3 audio format - Can I use](https://caniuse.com/mp3)
- [Audio format with limited browser support - PowerMapper](https://www.powermapper.com/products/sortsite/rules/bughtmlaudiocodec/)
- [Detect Supported Audio Formats with JavaScript - David Walsh](https://davidwalsh.name/detect-supported-audio-formats-javascript)

---
*Feature research for: PodEdit v2.0 Browser-based Audio Processing*
*Researched: 2026-01-26*
