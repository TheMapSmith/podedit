---
type: quick
plan: 001
files_modified: [src/services/fileValidator.js]
autonomous: true

must_haves:
  truths:
    - "M4A files with audio/mpeg MIME type are accepted"
    - "Extension validation uses correct string comparison"
  artifacts:
    - path: "src/services/fileValidator.js"
      provides: "Audio file validation with flexible MIME type handling"
---

<objective>
Fix the file extension vs MIME type validation error for M4A files.

Purpose: M4A files may be reported with `audio/mpeg` MIME type by some browsers/servers, causing false validation failures. The extension check also has a bug using `includes()` incorrectly.

Output: Updated fileValidator.js that accepts M4A files regardless of browser-reported MIME type.
</objective>

<context>
@src/services/fileValidator.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix MIME type mapping and extension validation</name>
  <files>src/services/fileValidator.js</files>
  <action>
Two issues to fix in fileValidator.js:

1. **Add M4A to audio/mpeg extensions** (line 3): Some browsers/servers report M4A files with `audio/mpeg` MIME type. Update the mapping:
   ```javascript
   'audio/mpeg': ['.mp3', '.m4a'],
   ```

2. **Fix extension comparison logic** (line 49): The current check `ext.includes(extension)` is backwards - it checks if the extension string `.mp3` contains `mp3`, which works by coincidence. Change to proper equality:
   ```javascript
   const extensionValid = expectedExtensions.some(ext => ext === `.${extension}`);
   ```
   This correctly compares the expected extension (e.g., `.mp3`) with the file's extension prefixed with a dot.
  </action>
  <verify>
Manual test: Create a test that validates an M4A file with various MIME types:
- `audio/mp4` should pass (existing)
- `audio/x-m4a` should pass (existing)
- `audio/mpeg` should pass (fixed)

Or simply verify the code changes are correct by reviewing the updated file.
  </verify>
  <done>
M4A files are accepted regardless of whether the browser reports `audio/mp4`, `audio/x-m4a`, or `audio/mpeg` as the MIME type. Extension validation uses exact string matching.
  </done>
</task>

</tasks>

<verification>
- fileValidator.js updated with both fixes
- No syntax errors (file can be imported)
</verification>

<success_criteria>
- M4A files with `audio/mpeg` MIME type pass validation
- Extension comparison uses correct equality check
</success_criteria>

<output>
After completion, the fix is complete. No summary needed for quick tasks.
</output>
