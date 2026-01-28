---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/transcriptionService.js
autonomous: true

must_haves:
  truths:
    - "Each chunk respects the 1400 second API duration limit"
    - "Chunk size calculation considers both byte size AND duration"
    - "Longer audio files (low bitrate) get more chunks than short files of same size"
  artifacts:
    - path: "src/services/transcriptionService.js"
      provides: "Duration-aware chunking logic"
      contains: "maxDuration"
  key_links:
    - from: "transcribe()"
      to: "calculateChunkSize()"
      via: "size and duration calculations"
---

<objective>
Fix transcription chunking to ensure each chunk respects the API duration limit (1400 seconds).

Purpose: A 25MB file that is 3000 seconds long would be split into 2 chunks by size (25MB / 24MB = 2 chunks). But each ~12.5MB chunk would contain ~1500 seconds of audio, exceeding the 1400 second API limit per request. The chunking needs to calculate chunk size based on BOTH the size limit AND the duration limit, using whichever produces more chunks.

Output: Updated TranscriptionService that calculates optimal chunk count considering both constraints.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/services/transcriptionService.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add duration-aware chunk calculation to TranscriptionService</name>
  <files>src/services/transcriptionService.js</files>
  <action>
Update TranscriptionService to ensure each chunk respects the API's 1400 second duration limit:

1. Add constants in constructor:
   ```javascript
   this.maxChunkSize = 24 * 1024 * 1024; // 24MB - existing
   this.maxChunkDuration = 1200; // 1200 seconds - safe buffer under 1400s API limit
   this.minBitrate = 64000; // 64 kbps - conservative assumption for duration estimation
   ```

2. Add estimateDuration(file) method:
   ```javascript
   /**
    * Estimate audio duration from file size using conservative bitrate assumption
    * Uses low bitrate (64kbps) to over-estimate duration, ensuring we chunk more aggressively
    * @param {File} file - Audio file
    * @returns {number} - Estimated duration in seconds
    */
   estimateDuration(file) {
     // file.size is bytes, minBitrate is bits/second
     // duration = (bytes * 8 bits/byte) / (bits/second)
     return (file.size * 8) / this.minBitrate;
   }
   ```

3. Modify the transcribe() method's chunking decision. Replace the simple size check:
   ```javascript
   // OLD: if (file.size > this.maxChunkSize) { ... }

   // NEW: Calculate optimal chunk count considering both limits
   const estimatedDuration = this.estimateDuration(file);
   const chunksBySize = Math.ceil(file.size / this.maxChunkSize);
   const chunksByDuration = Math.ceil(estimatedDuration / this.maxChunkDuration);
   const numChunks = Math.max(chunksBySize, chunksByDuration, 1);

   if (numChunks > 1) {
     console.log(`Chunking: size needs ${chunksBySize} chunks, duration needs ${chunksByDuration} chunks, using ${numChunks}`);
     const chunkSize = Math.ceil(file.size / numChunks);
     transcript = await this.transcribeChunked(file, fileHash, onProgress, chunkSize);
   } else {
     transcript = await this.transcribeSingle(file, fileHash);
   }
   ```

4. Update transcribeChunked() signature to accept chunkSize parameter:
   ```javascript
   async transcribeChunked(file, hash, onProgress, chunkSize = this.maxChunkSize) {
     // Use chunkSize instead of this.maxChunkSize in the chunking loop
     while (offset < file.size) {
       const end = Math.min(offset + chunkSize, file.size);
       // ...
     }
   }
   ```

5. Add logging at start of transcribe():
   ```javascript
   const estimatedDuration = this.estimateDuration(file);
   console.log(`Transcription: ${file.name}, ${(file.size / (1024*1024)).toFixed(2)}MB, ~${Math.round(estimatedDuration)}s estimated`);
   ```
  </action>
  <verify>
    Test the logic mentally with the reported scenario:
    - 25MB file at 3000 seconds actual duration
    - Estimated duration: (25 * 1024 * 1024 * 8) / 64000 = 3277 seconds
    - Chunks by size: ceil(25MB / 24MB) = 2
    - Chunks by duration: ceil(3277 / 1200) = 3
    - Result: 3 chunks of ~8.3MB each, each ~1092 seconds estimated
    - Each chunk respects both 24MB size and 1400s duration limits
  </verify>
  <done>
    TranscriptionService calculates chunk count based on whichever constraint (size or duration) requires more chunks, ensuring each chunk stays within API limits.
  </done>
</task>

</tasks>

<verification>
Code review verification:
1. estimateDuration() exists and uses 64kbps conservative estimate
2. transcribe() calculates both chunksBySize and chunksByDuration
3. numChunks = max of both calculations
4. transcribeChunked() accepts dynamic chunkSize parameter
5. Logging shows which constraint drove the chunking decision

For a 25MB/3000s file:
- Old behavior: 2 chunks, each ~1500s (exceeds 1400s limit)
- New behavior: 3 chunks, each ~1000s (within limits)
</verification>

<success_criteria>
- estimateDuration() method calculates duration using conservative 64kbps bitrate
- Chunk count is max(chunksBySize, chunksByDuration)
- transcribeChunked() uses dynamic chunk size from calculation
- Console logging shows both size-based and duration-based chunk calculations
</success_criteria>

<output>
After completion, create `.planning/quick/003-verify-large-file-chunking-the-api-also-/003-SUMMARY.md`
</output>
