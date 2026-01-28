/**
 * AudioProcessingService - Core service for FFmpeg.wasm audio processing
 * Converts cut regions into FFmpeg filter commands and orchestrates processing
 */
class AudioProcessingService {
  /**
   * @param {BrowserCompatibility} browserCompatibility - Browser compatibility service
   */
  constructor(browserCompatibility, options = {}) {
    this.browserCompatibility = browserCompatibility;
    this.ffmpeg = null;
    this.lastLogs = []; // Store recent FFmpeg logs for debugging
    this.timeout = options.timeout || 600000; // Default 10 minutes
    this._isProcessing = false;
    this.cancelRequested = false; // Flag to track cancel state
  }

  /**
   * Check if currently processing
   * @returns {boolean}
   */
  isProcessing() {
    return this._isProcessing;
  }

  /**
   * Cancel the current processing operation
   * @returns {boolean} - true if cancel was initiated, false if no operation running
   */
  cancel() {
    if (!this._isProcessing) {
      return false;
    }
    this.cancelRequested = true;
    // FFmpeg.wasm doesn't have native abort, but we can:
    // 1. Set flag to prevent further progress
    // 2. Let timeout handle cleanup
    // 3. Reject with cancel error in processing loop
    return true;
  }

  /**
   * Ensure FFmpeg is loaded and ready
   * @param {function} onProgress - Optional progress callback for loading UI
   * @returns {Promise<FFmpeg>}
   */
  async ensureFFmpegLoaded(onProgress = null) {
    if (this.ffmpeg) {
      return this.ffmpeg;
    }

    // Wrap BrowserCompatibility progress to remap to 0-10% range
    const wrappedProgress = onProgress ? (bcProgress) => {
      const remappedProgress = Math.floor(bcProgress.progress / 10);
      onProgress({ stage: 'loading', progress: remappedProgress });
    } : null;

    this.ffmpeg = await this.browserCompatibility.loadFFmpeg(wrappedProgress);
    return this.ffmpeg;
  }

  /**
   * Build FFmpeg filter_complex command from cut regions
   * Computes KEEP segments (inverse of cuts) and generates filter string
   *
   * @param {Array<CutRegion>} cutRegions - Array of cut regions to remove
   * @param {number} totalDuration - Total audio duration in seconds
   * @returns {{ filterComplex: string|null, outputCount: number, useDirectCopy: boolean }}
   */
  buildFilterCommand(cutRegions, totalDuration) {
    // Edge case: No cuts - use direct copy
    if (!cutRegions || cutRegions.length === 0) {
      return {
        filterComplex: null,
        outputCount: 0,
        useDirectCopy: true
      };
    }

    // Filter only complete cuts and sort by start time
    const completeCuts = cutRegions
      .filter(cut => cut.isComplete())
      .sort((a, b) => a.startTime - b.startTime);

    // Edge case: No complete cuts
    if (completeCuts.length === 0) {
      return {
        filterComplex: null,
        outputCount: 0,
        useDirectCopy: true
      };
    }

    // Merge overlapping/adjacent cuts
    const mergedCuts = this._mergeOverlappingCuts(completeCuts);

    // Compute KEEP segments (inverse of cuts)
    const keepSegments = this._computeKeepSegments(mergedCuts, totalDuration);

    // Edge case: No segments remain after cuts
    if (keepSegments.length === 0) {
      throw new Error('No audio would remain after cuts');
    }

    // Edge case: Single segment - still need filter but simpler
    if (keepSegments.length === 1) {
      const seg = keepSegments[0];
      const filterComplex = `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[out]`;
      return {
        filterComplex,
        outputCount: 1,
        useDirectCopy: false
      };
    }

    // Multiple segments - build trim + concat filter
    const trimFilters = keepSegments.map((seg, i) =>
      `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`
    ).join(';');

    const streamLabels = keepSegments.map((_, i) => `[a${i}]`).join('');
    const concatFilter = `${streamLabels}concat=n=${keepSegments.length}:v=0:a=1[out]`;

    const filterComplex = `${trimFilters};${concatFilter}`;

    return {
      filterComplex,
      outputCount: keepSegments.length,
      useDirectCopy: false
    };
  }

  /**
   * Merge overlapping or adjacent cut regions
   * @private
   * @param {Array<CutRegion>} sortedCuts - Sorted array of cut regions
   * @returns {Array<{start: number, end: number}>}
   */
  _mergeOverlappingCuts(sortedCuts) {
    if (sortedCuts.length === 0) return [];

    const merged = [];
    let current = {
      start: sortedCuts[0].startTime,
      end: sortedCuts[0].endTime
    };

    for (let i = 1; i < sortedCuts.length; i++) {
      const cut = sortedCuts[i];

      // Check if current cut overlaps or is adjacent to accumulated region
      if (cut.startTime <= current.end) {
        // Merge by extending the end time
        current.end = Math.max(current.end, cut.endTime);
      } else {
        // No overlap - save current and start new region
        merged.push(current);
        current = {
          start: cut.startTime,
          end: cut.endTime
        };
      }
    }

    // Add the last region
    merged.push(current);
    return merged;
  }

  /**
   * Compute KEEP segments (inverse of cuts)
   * @private
   * @param {Array<{start: number, end: number}>} mergedCuts - Merged cut regions
   * @param {number} totalDuration - Total audio duration
   * @returns {Array<{start: number, end: number}>}
   */
  _computeKeepSegments(mergedCuts, totalDuration) {
    const keepSegments = [];
    let currentTime = 0;

    for (const cut of mergedCuts) {
      // Add KEEP segment before this cut (if any duration)
      if (cut.start > currentTime) {
        keepSegments.push({
          start: currentTime,
          end: cut.start
        });
      }

      // Move past this cut
      currentTime = cut.end;
    }

    // Add final KEEP segment after last cut (if any duration remains)
    if (currentTime < totalDuration) {
      keepSegments.push({
        start: currentTime,
        end: totalDuration
      });
    }

    return keepSegments;
  }

  /**
   * Calculate expected output duration after cuts
   * @param {Array<CutRegion>} cutRegions - Array of cut regions
   * @param {number} totalDuration - Total audio duration in seconds
   * @returns {number} - Expected output duration in seconds
   */
  getExpectedOutputDuration(cutRegions, totalDuration) {
    // Filter only complete cuts
    const completeCuts = cutRegions.filter(cut => cut.isComplete());

    if (completeCuts.length === 0) {
      return totalDuration;
    }

    // Merge overlapping cuts to avoid double-counting
    const sortedCuts = completeCuts.sort((a, b) => a.startTime - b.startTime);
    const mergedCuts = this._mergeOverlappingCuts(sortedCuts);

    // Sum up all cut durations
    const totalCutDuration = mergedCuts.reduce((sum, cut) =>
      sum + (cut.end - cut.start), 0
    );

    return totalDuration - totalCutDuration;
  }

  /**
   * Verify output duration matches expected duration
   * Placeholder for Phase 8 when browser playback context is available
   * @param {Uint8Array} outputData - Processed audio data
   * @param {number} expectedDuration - Expected duration in seconds
   * @param {number} tolerance - Acceptable difference in seconds (default 0.5s)
   * @returns {Promise<{valid: boolean, actualDuration: number|null, message: string}>}
   */
  async verifyOutputDuration(outputData, expectedDuration, tolerance = 0.5) {
    // Placeholder - full verification requires browser playback
    return {
      valid: true,
      actualDuration: null,
      message: 'Duration verification requires browser playback'
    };
  }

  /**
   * Process audio file with cuts
   * @param {File} file - Input audio file
   * @param {Array<CutRegion>} cutRegions - Array of cut regions to remove
   * @param {number} totalDuration - Total audio duration in seconds
   * @param {function} onProgress - Optional progress callback
   * @returns {Promise<{data: Uint8Array, mimeType: string, filename: string, expectedDuration: number}>}
   */
  async processAudio(file, cutRegions, totalDuration, onProgress = null) {
    // Validate inputs
    if (!cutRegions || cutRegions.length === 0) {
      throw new Error('No cuts to apply');
    }

    const completeCuts = cutRegions.filter(cut => cut.isComplete());
    if (completeCuts.length === 0) {
      throw new Error('No cuts to apply');
    }

    if (!totalDuration || totalDuration <= 0) {
      throw new Error('Invalid total duration');
    }

    this._isProcessing = true;
    this.cancelRequested = false; // Reset cancel flag at start
    const fileTracker = {
      inputFilename: null,
      outputFilename: null,
      inputWritten: false,
      outputWritten: false
    };
    let timeoutId = null;

    try {
      // Setup timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Processing timeout after ${this.timeout / 1000} seconds`));
        }, this.timeout);
      });

      // Process with timeout wrapper
      const result = await Promise.race([
        this._processAudioInternal(file, cutRegions, totalDuration, onProgress, fileTracker),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      // Check if this was a user cancellation
      if (error.message.toLowerCase().includes('cancelled')) {
        throw new Error('Processing cancelled by user');
      }

      // Map FFmpeg errors to user-friendly messages
      let userMessage = 'Audio processing failed: ';

      if (error.message.includes('timeout')) {
        userMessage += `Operation timed out. Files larger than 50 MB may take several minutes.`;
      } else if (error.message.includes('Exit code: 1') || error.message.includes('Invalid')) {
        userMessage += 'The audio file may be corrupted or in an unsupported format.';
      } else if (error.message.includes('memory') || error.message.includes('Memory')) {
        userMessage += 'Out of memory. Try processing a smaller file.';
      } else {
        userMessage += error.message;
      }

      // Include FFmpeg logs for debugging
      if (this.lastLogs.length > 0) {
        console.error('FFmpeg logs:', this.lastLogs.join('\n'));
      }

      throw new Error(userMessage);
    } finally {
      this._isProcessing = false;
      this.cancelRequested = false; // Reset flag in finally block

      // Cleanup guarantee - only delete files that were written
      try {
        if (fileTracker.inputWritten && fileTracker.inputFilename) {
          await this.ffmpeg.deleteFile(fileTracker.inputFilename);
        }
      } catch (cleanupError) {
        console.warn('Cleanup error (input):', cleanupError);
      }

      try {
        if (fileTracker.outputWritten && fileTracker.outputFilename) {
          await this.ffmpeg.deleteFile(fileTracker.outputFilename);
        }
      } catch (cleanupError) {
        console.warn('Cleanup error (output):', cleanupError);
      }
    }
  }

  /**
   * Internal processing method with progress tracking
   * @private
   */
  async _processAudioInternal(file, cutRegions, totalDuration, onProgress, fileTracker) {
    // Ensure FFmpeg loaded (0-10% progress)
    await this.ensureFFmpegLoaded(onProgress);

    // Check if cancel was requested
    if (this.cancelRequested) {
      throw new Error('Processing cancelled by user');
    }

    // Setup FFmpeg log capture with progress parsing
    this.lastLogs = [];
    this.ffmpeg.on('log', ({ message }) => {
      this.lastLogs.push(message);
      if (this.lastLogs.length > 50) {
        this.lastLogs.shift(); // Keep only last 50 messages
      }

      // Parse time= progress from FFmpeg logs
      // Format: time=00:01:23.45
      const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch && onProgress) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + minutes * 60 + seconds;

        // Calculate progress percentage (15-90% range for processing)
        const progressPercent = Math.min((currentTime / totalDuration) * 100, 100);
        const remappedProgress = 15 + Math.floor(progressPercent * 0.75); // Map to 15-90%

        onProgress({
          stage: 'processing',
          progress: remappedProgress,
          time: currentTime
        });
      }
    });

    // Convert File to Uint8Array
    const inputData = new Uint8Array(await file.arrayBuffer());

    // Determine input filename from file.name or default
    fileTracker.inputFilename = file.name || 'input.mp3';

    // Write input file to virtual filesystem (10-15% progress)
    await this.ffmpeg.writeFile(fileTracker.inputFilename, inputData);
    fileTracker.inputWritten = true;

    if (onProgress) {
      onProgress({ stage: 'processing', progress: 15 });
    }

    // Check if cancel was requested
    if (this.cancelRequested) {
      throw new Error('Processing cancelled by user');
    }

    // Build FFmpeg command
    const { filterComplex, useDirectCopy } = this.buildFilterCommand(cutRegions, totalDuration);

    if (useDirectCopy) {
      throw new Error('No cuts to apply - use direct copy');
    }

    // Determine output filename (preserve format)
    const extension = this._getFileExtension(fileTracker.inputFilename);
    fileTracker.outputFilename = `output.${extension}`;

    // Execute FFmpeg (15-90% progress tracked via logs)
    const args = [
      '-i', fileTracker.inputFilename,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      fileTracker.outputFilename
    ];

    await this.ffmpeg.exec(args);
    fileTracker.outputWritten = true;

    // Check if cancel was requested
    if (this.cancelRequested) {
      throw new Error('Processing cancelled by user');
    }

    if (onProgress) {
      onProgress({ stage: 'processing', progress: 90 });
    }

    // Read output file (90-95% progress)
    const outputData = await this.ffmpeg.readFile(fileTracker.outputFilename);

    if (onProgress) {
      onProgress({ stage: 'processing', progress: 95 });
    }

    // Calculate expected duration
    const expectedDuration = this.getExpectedOutputDuration(cutRegions, totalDuration);

    if (onProgress) {
      onProgress({ stage: 'complete', progress: 100 });
    }

    return {
      data: outputData,
      mimeType: file.type,
      filename: fileTracker.outputFilename,
      expectedDuration
    };
  }

  /**
   * Extract file extension from filename
   * @private
   * @param {string} filename - Input filename
   * @returns {string} - File extension without dot
   */
  _getFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1] : 'mp3';
  }
}

export default AudioProcessingService;
