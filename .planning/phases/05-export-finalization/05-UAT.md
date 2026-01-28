---
status: testing
phase: 05-export-finalization
source: 05-01-SUMMARY.md
started: 2026-01-23T14:51:00Z
updated: 2026-01-23T14:51:00Z
---

## Current Test

number: 1
name: Export button disabled when no cuts exist
expected: |
  When you load an audio file but haven't marked any cuts yet, the "Export Cuts" button should be disabled (grayed out, not clickable).
awaiting: user response

## Tests

### 1. Export button disabled when no cuts exist
expected: When you load an audio file but haven't marked any cuts yet, the "Export Cuts" button should be disabled (grayed out, not clickable).
result: [pending]

### 2. Export button enabled after marking cuts
expected: After marking at least one cut region (mark start, then mark end), the "Export Cuts" button should become enabled (clickable, blue color visible).
result: [pending]

### 3. Export downloads JSON file with correct filename
expected: Click "Export Cuts" button after marking cuts. Browser should download a JSON file named "[audio-filename]-cuts.json" (e.g., if audio is "podcast.mp3", downloads "podcast-cuts.json").
result: [pending]

### 4. JSON file contains proper structure
expected: Open the downloaded JSON file. Should contain "version" (set to "1.0"), "filename" (original audio filename), "exported_at" (ISO timestamp), and "cuts" array with start/end timestamps as numbers (seconds).
result: [pending]

### 5. Cuts sorted by start time in JSON
expected: If you marked cuts out of order (e.g., cut at 5:00 then cut at 2:00), the exported JSON "cuts" array should list them sorted by start time (2:00 cut first, then 5:00 cut).
result: [pending]

### 6. Export button disabled after deleting all cuts
expected: After exporting, delete all cut regions from the cut list. The "Export Cuts" button should become disabled again.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
