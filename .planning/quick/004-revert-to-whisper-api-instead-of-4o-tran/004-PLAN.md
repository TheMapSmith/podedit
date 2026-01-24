---
phase: quick
plan: 004
type: quick-task
wave: 1
depends_on: []
files_modified:
  - src/services/transcriptionService.js
  - src/controllers/transcriptController.js
autonomous: true

must_haves:
  truths:
    - "Transcription uses whisper-1 model"
    - "Transcript displays word-by-word with inline spans"
    - "Click-to-seek works on individual words"
    - "Time-based highlighting follows word boundaries"
  artifacts:
    - path: "src/services/transcriptionService.js"
      provides: "whisper-1 API integration"
      contains: "whisper-1"
    - path: "src/controllers/transcriptController.js"
      provides: "Word-based transcript rendering"
      contains: "transcript-word"
  key_links:
    - from: "transcriptionService.js"
      to: "OpenAI API"
      via: "whisper-1 model with word timestamps"
    - from: "transcriptController.js"
      to: "transcript.words"
      via: "word array iteration"
---

<objective>
Revert transcription from gpt-4o-transcribe back to whisper-1 API

Purpose: Return to word-level transcript granularity with whisper-1 model (reversing quick-002)
Output: Transcription service using whisper-1 with word-level timestamps, UI displaying inline word spans
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/002-switch-from-whisper-1-to-gpt-4o-transcri/002-SUMMARY.md

# Current implementation to revert
@src/services/transcriptionService.js
@src/controllers/transcriptController.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Revert TranscriptionService to whisper-1</name>
  <files>src/services/transcriptionService.js</files>
  <action>
Revert the transcription service from gpt-4o-transcribe to whisper-1:

1. In transcribeSingle():
   - Change model from 'gpt-4o-transcribe-diarize' to 'whisper-1'
   - Remove response_format and chunking_strategy params
   - Add: formData.append('response_format', 'verbose_json')
   - Add: formData.append('timestamp_granularities[]', 'word')

2. In transcribeChunked():
   - Same model and param changes as transcribeSingle()
   - Update timestamp adjustment to work with words array instead of segments:
     ```javascript
     if (result.words && Array.isArray(result.words)) {
       result.words.forEach(word => {
         word.start += cumulativeDuration;
         word.end += cumulativeDuration;
       });
     }
     ```

3. Update merged result structure:
   - Change `segments: results.flatMap(r => r.segments || [])` to `words: results.flatMap(r => r.words || [])`
   - Keep text, duration, language, chunks fields as-is
  </action>
  <verify>
grep -n "whisper-1" src/services/transcriptionService.js returns matches
grep -n "timestamp_granularities" src/services/transcriptionService.js returns matches
grep -n "gpt-4o" src/services/transcriptionService.js returns NO matches
  </verify>
  <done>TranscriptionService uses whisper-1 model with word-level timestamp granularity</done>
</task>

<task type="auto">
  <name>Task 2: Revert TranscriptController to word-based display</name>
  <files>src/controllers/transcriptController.js</files>
  <action>
Revert the transcript controller from segment-based to word-based display:

1. Update state variables (lines ~28-29):
   - currentSegmentIndex -> currentWordIndex
   - activeSegment -> activeWord

2. Update renderTranscript():
   - Check for transcript.words instead of transcript.segments
   - Create inline span elements instead of div elements:
     ```javascript
     const span = document.createElement('span');
     span.className = 'transcript-word';
     span.setAttribute('data-start', word.start);
     span.setAttribute('data-end', word.end);
     span.textContent = word.word + ' ';
     ```
   - Remove speaker label logic (whisper-1 doesn't have speaker diarization)

3. Update setupClickToSeek():
   - Change .transcript-segment to .transcript-word in closest() selector

4. Update onTimeUpdate():
   - Check for transcript.words instead of transcript.segments
   - Call findCurrentWordIndex instead of findCurrentSegmentIndex

5. Rename findCurrentSegmentIndex() to findCurrentWordIndex():
   - Reference transcript.words instead of transcript.segments
   - Access word.start and word.end instead of segment.start/end

6. Update updateHighlight():
   - Rename parameter from newActiveSegment to newActiveWord
   - Update activeSegment references to activeWord

7. Update highlightCutRegions():
   - Query for .transcript-word instead of .transcript-segment
   - Reference transcript.words instead of transcript.segments
   - Access word.start and word.end instead of segment.start/end

8. Update clearCutHighlights():
   - Query for .transcript-word instead of .transcript-segment

9. Update cleanup():
   - Reset currentWordIndex and activeWord instead of segment equivalents
  </action>
  <verify>
grep -n "transcript-word" src/controllers/transcriptController.js returns matches
grep -n "transcript-segment" src/controllers/transcriptController.js returns NO matches
grep -n "currentWordIndex" src/controllers/transcriptController.js returns matches
  </verify>
  <done>TranscriptController renders word-level transcript with inline spans, click-to-seek and highlighting work on words</done>
</task>

</tasks>

<verification>
1. grep -n "whisper-1" src/services/transcriptionService.js - model is whisper-1
2. grep -n "timestamp_granularities" src/services/transcriptionService.js - word timestamps enabled
3. grep -n "transcript-word" src/controllers/transcriptController.js - word spans rendered
4. grep -n "gpt-4o\|transcript-segment" src/services/transcriptionService.js src/controllers/transcriptController.js - returns NO matches
</verification>

<success_criteria>
- TranscriptionService uses whisper-1 model with verbose_json response format
- Word-level timestamp_granularities parameter is set
- TranscriptController renders transcript as inline word spans
- Click-to-seek targets .transcript-word elements
- Time-based highlighting updates activeWord state
- Cut region highlighting works with word elements
- No references to gpt-4o or transcript-segment remain
</success_criteria>

<output>
After completion, create `.planning/quick/004-revert-to-whisper-api-instead-of-4o-tran/004-SUMMARY.md`
</output>
