---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/transcriptionService.js
  - src/controllers/transcriptController.js
autonomous: true

must_haves:
  truths:
    - "Transcription uses gpt-4o-transcribe model"
    - "Segments display with speaker labels and timestamps"
    - "Click-to-seek works with segment timestamps"
    - "Time-based highlighting works with segments"
  artifacts:
    - path: "src/services/transcriptionService.js"
      provides: "gpt-4o-transcribe API integration"
      contains: "gpt-4o-transcribe"
    - path: "src/controllers/transcriptController.js"
      provides: "Segment-based transcript rendering and navigation"
      contains: "transcript-segment"
  key_links:
    - from: "src/services/transcriptionService.js"
      to: "OpenAI API"
      via: "fetch to transcriptions endpoint"
      pattern: "model.*gpt-4o-transcribe"
    - from: "src/controllers/transcriptController.js"
      to: "segments array"
      via: "renderTranscript iterates segments"
      pattern: "transcript\\.segments"
---

<objective>
Switch transcription from whisper-1 (word-level timestamps) to gpt-4o-transcribe (segment-level timestamps with diarization support).

Purpose: Use newer model with better accuracy and speaker diarization capability
Output: Working transcription with segment-based display and navigation
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/services/transcriptionService.js
@src/controllers/transcriptController.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update TranscriptionService for gpt-4o-transcribe</name>
  <files>src/services/transcriptionService.js</files>
  <action>
Update the transcription service to use the new model and handle segment response format:

1. Change model from 'whisper-1' to 'gpt-4o-transcribe' in both transcribeSingle and transcribeChunked
2. Remove `timestamp_granularities[]` parameter (not supported by new model)
3. Keep `response_format: 'verbose_json'` to get segments with timestamps
4. Update the response handling - gpt-4o-transcribe returns:
   ```json
   {
     "text": "full transcript text",
     "segments": [
       {
         "id": 0,
         "start": 0.0,
         "end": 5.2,
         "text": "segment text",
         "speaker": "SPEAKER_00"  // if diarization enabled
       }
     ],
     "language": "en",
     "duration": 123.45
   }
   ```
5. In transcribeChunked, update timestamp adjustment to work with segments instead of words:
   - Adjust segment.start and segment.end by cumulativeDuration
6. In merged result, change from flatMap of words to flatMap of segments
7. Update return structure: replace `words` with `segments` throughout
  </action>
  <verify>
Service imports correctly: `import TranscriptionService from './services/transcriptionService.js'`
Check that model string contains 'gpt-4o-transcribe'
  </verify>
  <done>TranscriptionService uses gpt-4o-transcribe model and returns segments array instead of words array</done>
</task>

<task type="auto">
  <name>Task 2: Update TranscriptController for segment-based display</name>
  <files>src/controllers/transcriptController.js</files>
  <action>
Update the controller to render and navigate using segments instead of words:

1. In renderTranscript():
   - Change check from `this.transcript.words` to `this.transcript.segments`
   - Create segment divs instead of word spans:
     ```javascript
     const div = document.createElement('div');
     div.className = 'transcript-segment';
     div.textContent = segment.text;
     div.setAttribute('data-start', segment.start);
     div.setAttribute('data-end', segment.end);
     if (segment.speaker) {
       div.setAttribute('data-speaker', segment.speaker);
       // Optionally prepend speaker label
       const label = document.createElement('span');
       label.className = 'speaker-label';
       label.textContent = segment.speaker + ': ';
       div.prepend(label);
     }
     ```

2. In setupClickToSeek():
   - Change selector from '.transcript-word' to '.transcript-segment'

3. In onTimeUpdate():
   - Change guard check from `this.transcript.words` to `this.transcript.segments`
   - Update findCurrentWordIndex call to work with segments

4. Rename findCurrentWordIndex to findCurrentSegmentIndex:
   - Update to use `this.transcript.segments`
   - Logic stays the same (start <= currentTime < end)

5. In updateHighlight():
   - Works the same way, just operates on segment elements instead of word elements

6. Update cleanup() if it references words
  </action>
  <verify>
Open app, load audio file, generate transcript - should show segments with speaker labels (if diarization present)
Click on segment should seek to that timestamp
Playback should highlight current segment
  </verify>
  <done>Transcript displays as segments, click-to-seek works, time-based highlighting works with segment boundaries</done>
</task>

<task type="auto">
  <name>Task 3: Add CSS for segment display</name>
  <files>index.html</files>
  <action>
Add or update CSS styles for segment-based transcript display:

1. Add styles for .transcript-segment:
   ```css
   .transcript-segment {
     padding: 8px 12px;
     margin: 4px 0;
     border-radius: 4px;
     cursor: pointer;
     transition: background-color 0.15s;
   }

   .transcript-segment:hover {
     background-color: #f0f0f0;
   }

   .transcript-segment.active {
     background-color: #ffd700;
   }

   .speaker-label {
     font-weight: 600;
     color: #666;
     margin-right: 8px;
   }
   ```

2. Remove or update .transcript-word styles if they exist (can keep for backwards compatibility or remove entirely)
  </action>
  <verify>
Visual inspection: segments should have padding, hover state, and gold highlight when active
Speaker labels should be bold and slightly muted
  </verify>
  <done>CSS styles support segment-based display with speaker labels and active highlighting</done>
</task>

</tasks>

<verification>
1. Open app and load an audio file
2. Click "Generate Transcript"
3. Verify transcript appears as segments (not individual words)
4. Click a segment - audio should seek to that timestamp
5. Play audio - current segment should highlight and auto-scroll
6. If speaker diarization is present, speaker labels should appear
</verification>

<success_criteria>
- Transcription API uses gpt-4o-transcribe model
- Transcript displays as segments with timestamps
- Speaker labels appear if diarization data present
- Click-to-seek works on segments
- Time-based highlighting follows segment boundaries
- Auto-scroll during playback works with segments
</success_criteria>

<output>
After completion, create `.planning/quick/002-switch-from-whisper-1-to-gpt-4o-transcri/002-SUMMARY.md`
</output>
