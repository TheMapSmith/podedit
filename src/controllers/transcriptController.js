/**
 * TranscriptController - Manages transcript UI state and interaction with TranscriptionService
 * Handles transcript generation, progress display, and transcript rendering
 */
class TranscriptController {
  /**
   * @param {TranscriptionService} transcriptionService - TranscriptionService instance
   * @param {Object} elements - DOM element references
   * @param {HTMLButtonElement} elements.generateButton
   * @param {HTMLElement} elements.progressContainer
   * @param {HTMLElement} elements.progressBar
   * @param {HTMLElement} elements.progressText
   * @param {HTMLElement} elements.transcriptContainer
   * @param {HTMLElement} elements.errorDisplay
   * @param {AudioService} audioService - AudioService instance for navigation
   */
  constructor(transcriptionService, elements, audioService) {
    this.transcriptionService = transcriptionService;
    this.elements = elements;
    this.audioService = audioService;

    // State
    this.currentFile = null;
    this.transcript = null;
    this.isTranscribing = false;

    // Navigation state
    this.currentSegmentIndex = -1;
    this.activeSegment = null;
    this.userIsScrolling = false;
    this.scrollTimeout = null;

    // Setup navigation
    this.setupClickToSeek();
    this.setupScrollDetection();
  }

  /**
   * Set the current file for transcription
   * @param {File} file - Audio file to transcribe
   */
  setFile(file) {
    this.currentFile = file;

    // Enable generate button
    this.elements.generateButton.disabled = false;

    // Clear previous transcript display
    this.elements.transcriptContainer.innerHTML = '<p class="transcript-placeholder">Click "Generate Transcript" to transcribe the audio.</p>';
    this.transcript = null;

    // Clear any previous errors
    this.elements.errorDisplay.textContent = '';
  }

  /**
   * Generate transcript for the current file
   * Handles progress display and error states
   */
  async generateTranscript() {
    // Guard: prevent concurrent transcription or transcription without file
    if (this.isTranscribing || !this.currentFile) {
      return;
    }

    this.isTranscribing = true;

    // Update UI: disable button, show progress, reset progress to 0%
    this.elements.generateButton.disabled = true;
    this.elements.progressContainer.classList.remove('hidden');
    this.elements.progressBar.style.width = '0%';
    this.elements.progressText.textContent = 'Preparing...';

    // Clear error display
    this.elements.errorDisplay.textContent = '';

    try {
      // Call transcription service with progress callback
      this.transcript = await this.transcriptionService.transcribe(
        this.currentFile,
        this.onProgress.bind(this)
      );

      // Render the transcript
      this.renderTranscript();

    } catch (error) {
      // Display error message to user
      this.elements.errorDisplay.textContent = `Transcription failed: ${error.message}`;
      console.error('Transcription error:', error);

    } finally {
      // Reset UI state
      this.isTranscribing = false;
      this.elements.progressContainer.classList.add('hidden');
      this.elements.generateButton.disabled = false;
    }
  }

  /**
   * Progress callback for transcription
   * @param {number} progress - Progress value between 0 and 1
   */
  onProgress(progress) {
    const percentage = Math.round(progress * 100);

    // Update progress bar width
    this.elements.progressBar.style.width = `${percentage}%`;

    // Update progress text
    if (percentage < 100) {
      this.elements.progressText.textContent = `Transcribing... ${percentage}%`;
    } else {
      this.elements.progressText.textContent = 'Finalizing...';
    }
  }

  /**
   * Render transcript in the UI
   * Creates segment divs with timestamp data attributes
   */
  renderTranscript() {
    // Clear container
    this.elements.transcriptContainer.innerHTML = '';

    // Check if transcript has segments
    if (!this.transcript || !this.transcript.segments || this.transcript.segments.length === 0) {
      this.elements.transcriptContainer.innerHTML = '<p class="transcript-placeholder">No transcript available</p>';
      return;
    }

    // Create segment divs
    for (const segment of this.transcript.segments) {
      const div = document.createElement('div');
      div.className = 'transcript-segment';
      div.setAttribute('data-start', segment.start);
      div.setAttribute('data-end', segment.end);

      // Add speaker label if present
      if (segment.speaker) {
        div.setAttribute('data-speaker', segment.speaker);
        const label = document.createElement('span');
        label.className = 'speaker-label';
        label.textContent = segment.speaker + ': ';
        div.appendChild(label);
      }

      // Add segment text
      const textNode = document.createTextNode(segment.text);
      div.appendChild(textNode);

      this.elements.transcriptContainer.appendChild(div);
    }
  }

  /**
   * Format timestamp for display (seconds to [MM:SS] or [HH:MM:SS])
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted timestamp
   */
  formatTimestamp(seconds) {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '[--:--]';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Format with zero-padding
    const pad = (num) => String(num).padStart(2, '0');

    // Include hours only if >= 1 hour
    if (hours > 0) {
      return `[${hours}:${pad(minutes)}:${pad(secs)}]`;
    }
    return `[${minutes}:${pad(secs)}]`;
  }

  /**
   * Get current transcript data
   * @returns {Object|null} - Current transcript or null
   */
  getTranscript() {
    return this.transcript;
  }

  /**
   * Setup click-to-seek functionality
   * Uses event delegation on transcript container
   * @private
   */
  setupClickToSeek() {
    this.elements.transcriptContainer.addEventListener('click', (event) => {
      // Find clicked segment using event delegation
      const segmentElement = event.target.closest('.transcript-segment');
      if (!segmentElement) return;

      // Parse start time from data attribute
      const startTime = parseFloat(segmentElement.getAttribute('data-start'));
      if (isNaN(startTime)) return;

      // Seek audio to that timestamp
      this.audioService.seek(startTime);

      // Immediately update highlight on clicked segment
      this.updateHighlight(segmentElement);
    });
  }

  /**
   * Setup scroll detection to pause auto-scroll during manual scrolling
   * @private
   */
  setupScrollDetection() {
    this.elements.transcriptContainer.addEventListener('scroll', () => {
      // Set flag when user scrolls
      this.userIsScrolling = true;

      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Reset flag after 1500ms of no scrolling
      this.scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 1500);
    }, { passive: true });
  }

  /**
   * Called on audio time updates to sync highlight and scroll
   * @param {number} currentTime - Current playback time in seconds
   */
  onTimeUpdate(currentTime) {
    // Guard: no transcript or no segments
    if (!this.transcript || !this.transcript.segments || this.transcript.segments.length === 0) {
      return;
    }

    // Find current segment index
    const newIndex = this.findCurrentSegmentIndex(currentTime);

    // Only update if index changed and is valid
    if (newIndex !== this.currentSegmentIndex && newIndex >= 0) {
      this.currentSegmentIndex = newIndex;

      // Get segment element from container
      const segmentElement = this.elements.transcriptContainer.children[newIndex];
      if (segmentElement) {
        this.updateHighlight(segmentElement);
      }
    }
  }

  /**
   * Find the index of the segment at the current time
   * @param {number} currentTime - Current playback time in seconds
   * @returns {number} - Index of current segment, or -1 if not found
   * @private
   */
  findCurrentSegmentIndex(currentTime) {
    const segments = this.transcript.segments;

    // Linear search through segments
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      // Check if currentTime falls within this segment's range
      if (segment.start <= currentTime && currentTime < segment.end) {
        return i;
      }
    }

    // Fallback: return last segment where start <= currentTime
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].start <= currentTime) {
        return i;
      }
    }

    // No match found
    return -1;
  }

  /**
   * Update highlight to the new active segment
   * @param {HTMLElement} newActiveSegment - New segment element to highlight
   * @private
   */
  updateHighlight(newActiveSegment) {
    // Remove 'active' class from previous segment
    if (this.activeSegment) {
      this.activeSegment.classList.remove('active');
    }

    // Add 'active' class to new segment
    if (newActiveSegment) {
      newActiveSegment.classList.add('active');

      // Auto-scroll if user is not manually scrolling
      if (!this.userIsScrolling) {
        newActiveSegment.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }

    // Store new active segment
    this.activeSegment = newActiveSegment;
  }

  /**
   * Highlight transcript segments that fall within cut regions
   * @param {CutRegion[]} cutRegions - Array of cut regions
   */
  highlightCutRegions(cutRegions) {
    // Guard: no transcript loaded
    if (!this.transcript || !this.transcript.segments) {
      return;
    }

    const segmentElements = this.elements.transcriptContainer.querySelectorAll('.transcript-segment');

    segmentElements.forEach((element, index) => {
      const segment = this.transcript.segments[index];
      if (!segment) return;

      // Check if this segment overlaps with any cut region
      // Note: cut.isComplete() is a method on CutRegion, not a property
      const isInCut = cutRegions.some(cut => {
        if (!cut.isComplete()) {
          return false;
        }
        // Segment overlaps cut if: segment.start < cut.end AND segment.end > cut.start
        return segment.start < cut.endTime && segment.end > cut.startTime;
      });

      // Toggle the in-cut-region class
      if (isInCut) {
        element.classList.add('in-cut-region');
      } else {
        element.classList.remove('in-cut-region');
      }
    });
  }

  /**
   * Clear all cut region highlighting from transcript
   */
  clearCutHighlights() {
    const segmentElements = this.elements.transcriptContainer.querySelectorAll('.transcript-segment');
    segmentElements.forEach(element => {
      element.classList.remove('in-cut-region');
    });
  }

  /**
   * Clean up resources
   * Should be called when done with controller
   */
  cleanup() {
    // Clear scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Clear cut highlights
    this.clearCutHighlights();

    // Reset navigation state
    this.currentSegmentIndex = -1;
    this.activeSegment = null;
    this.userIsScrolling = false;
    this.scrollTimeout = null;

    // Reset other state
    this.currentFile = null;
    this.transcript = null;
    this.isTranscribing = false;
    this.elements.transcriptContainer.innerHTML = '';
  }
}

export default TranscriptController;
