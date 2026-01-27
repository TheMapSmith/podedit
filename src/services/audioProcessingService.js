/**
 * AudioProcessingService - Core service for FFmpeg.wasm audio processing
 * Converts cut regions into FFmpeg filter commands and orchestrates processing
 */
class AudioProcessingService {
  /**
   * @param {BrowserCompatibility} browserCompatibility - Browser compatibility service
   */
  constructor(browserCompatibility) {
    this.browserCompatibility = browserCompatibility;
    this.ffmpeg = null;
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

    this.ffmpeg = await this.browserCompatibility.loadFFmpeg(onProgress);
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

    let inputFilename = null;
    let outputFilename = null;

    try {
      // Ensure FFmpeg loaded
      await this.ensureFFmpegLoaded(onProgress);

      // Convert File to Uint8Array
      const inputData = new Uint8Array(await file.arrayBuffer());

      // Determine input filename from file.name or default
      inputFilename = file.name || 'input.mp3';

      // Write input file to virtual filesystem
      await this.ffmpeg.writeFile(inputFilename, inputData);

      if (onProgress) {
        onProgress({ stage: 'processing', progress: 10 });
      }

      // Build FFmpeg command
      const { filterComplex, useDirectCopy } = this.buildFilterCommand(cutRegions, totalDuration);

      if (useDirectCopy) {
        throw new Error('No cuts to apply - use direct copy');
      }

      // Determine output filename (preserve format)
      const extension = this._getFileExtension(inputFilename);
      outputFilename = `output.${extension}`;

      // Execute FFmpeg
      const args = [
        '-i', inputFilename,
        '-filter_complex', filterComplex,
        '-map', '[out]',
        outputFilename
      ];

      await this.ffmpeg.exec(args);

      if (onProgress) {
        onProgress({ stage: 'processing', progress: 80 });
      }

      // Read output file
      const outputData = await this.ffmpeg.readFile(outputFilename);

      // Calculate expected duration
      const expectedDuration = this.getExpectedOutputDuration(cutRegions, totalDuration);

      // Cleanup virtual filesystem
      try {
        if (inputFilename) {
          await this.ffmpeg.deleteFile(inputFilename);
        }
        if (outputFilename) {
          await this.ffmpeg.deleteFile(outputFilename);
        }
      } catch (cleanupError) {
        // Don't fail on cleanup errors
        console.warn('Cleanup error:', cleanupError);
      }

      if (onProgress) {
        onProgress({ stage: 'complete', progress: 100 });
      }

      return {
        data: outputData,
        mimeType: file.type,
        filename: outputFilename,
        expectedDuration
      };
    } catch (error) {
      // Attempt cleanup even on error
      try {
        if (inputFilename) {
          await this.ffmpeg.deleteFile(inputFilename);
        }
        if (outputFilename) {
          await this.ffmpeg.deleteFile(outputFilename);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors during error handling
      }

      throw new Error(`Audio processing failed: ${error.message}`);
    }
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
