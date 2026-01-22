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
   */
  constructor(transcriptionService, elements) {
    this.transcriptionService = transcriptionService;
    this.elements = elements;

    // State
    this.currentFile = null;
    this.transcript = null;
    this.isTranscribing = false;
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
   * Creates word spans with timestamp data attributes
   */
  renderTranscript() {
    // Clear container
    this.elements.transcriptContainer.innerHTML = '';

    // Check if transcript has words
    if (!this.transcript || !this.transcript.words || this.transcript.words.length === 0) {
      this.elements.transcriptContainer.innerHTML = '<p class="transcript-placeholder">No transcript available</p>';
      return;
    }

    // Create word spans
    for (const word of this.transcript.words) {
      const span = document.createElement('span');
      span.className = 'transcript-word';
      span.textContent = word.word + ' ';
      span.setAttribute('data-start', word.start);
      span.setAttribute('data-end', word.end);

      // Note: Click-to-seek functionality will be added in Phase 3

      this.elements.transcriptContainer.appendChild(span);
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
   * Clean up resources
   * Should be called when done with controller
   */
  cleanup() {
    this.currentFile = null;
    this.transcript = null;
    this.isTranscribing = false;
    this.elements.transcriptContainer.innerHTML = '';
  }
}

export default TranscriptController;
