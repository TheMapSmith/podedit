/**
 * PlayerController - Manages UI state and interaction with AudioService
 * Handles play/pause controls, seek slider, time display, and smooth 60fps updates
 */
class PlayerController {
  /**
   * @param {AudioService} audioService - AudioService instance
   * @param {Object} elements - DOM element references
   * @param {HTMLButtonElement} elements.playButton
   * @param {HTMLInputElement} elements.seekSlider
   * @param {HTMLElement} elements.currentTimeDisplay
   * @param {HTMLElement} elements.durationDisplay
   * @param {HTMLElement} elements.errorDisplay
   */
  constructor(audioService, elements) {
    this.audioService = audioService;
    this.elements = elements;

    // State
    this.isPlaying = false;
    this.isSeeking = false;
    this.animationFrame = null;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners for player controls and audio events
   * @private
   */
  setupEventListeners() {
    // Play/pause button
    this.elements.playButton.addEventListener('click', () => this.togglePlayback());

    // Seek slider - separate input/change for smooth dragging
    this.elements.seekSlider.addEventListener('input', (e) => this.onSeekInput(e));
    this.elements.seekSlider.addEventListener('change', (e) => this.onSeekChange(e));

    // Audio service events
    this.audioService.on('ended', () => this.onPlaybackEnded());
    this.audioService.on('error', (e) => this.onPlaybackError(e));
  }

  /**
   * Toggle between play and pause
   */
  async togglePlayback() {
    if (this.isPlaying) {
      // Pause
      this.audioService.pause();
      this.elements.playButton.textContent = 'Play';
      this.isPlaying = false;
      this.stopUpdating();
    } else {
      // Play
      try {
        await this.audioService.play();
        this.elements.playButton.textContent = 'Pause';
        this.isPlaying = true;
        this.startUpdating();
      } catch (error) {
        // Handle autoplay blocking
        if (error.name === 'NotAllowedError') {
          this.elements.errorDisplay.textContent = 'Playback blocked by browser. Please click the play button to start.';
        } else {
          this.elements.errorDisplay.textContent = `Playback error: ${error.message}`;
        }
        console.error('Playback error:', error);
      }
    }
  }

  /**
   * Handle seek slider input (fires while dragging)
   * @param {Event} event
   * @private
   */
  onSeekInput(event) {
    // Set seeking flag to prevent slider from jumping back
    this.isSeeking = true;

    // Update time display with slider value
    const time = parseInt(event.target.value);
    this.elements.currentTimeDisplay.textContent = this.formatTime(time);
  }

  /**
   * Handle seek slider change (fires when released)
   * @param {Event} event
   * @private
   */
  onSeekChange(event) {
    // Clear seeking flag
    this.isSeeking = false;

    // Actually seek audio to new position
    const time = parseInt(event.target.value);
    this.audioService.seek(time);
  }

  /**
   * Start the requestAnimationFrame update loop
   */
  startUpdating() {
    this.updatePlaybackPosition();
  }

  /**
   * Stop the requestAnimationFrame update loop
   */
  stopUpdating() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Update playback position display (called by requestAnimationFrame)
   * Runs at 60fps for smooth slider movement
   * @private
   */
  updatePlaybackPosition() {
    // Only update slider if user is not currently dragging it
    if (!this.isSeeking) {
      const currentTime = this.audioService.getCurrentTime();
      this.elements.seekSlider.value = Math.floor(currentTime);
      this.elements.currentTimeDisplay.textContent = this.formatTime(currentTime);
    }

    // Request next frame
    this.animationFrame = requestAnimationFrame(() => this.updatePlaybackPosition());
  }

  /**
   * Handle audio playback ended event
   * @private
   */
  onPlaybackEnded() {
    this.isPlaying = false;
    this.elements.playButton.textContent = 'Play';
    this.stopUpdating();

    // Reset slider to start
    this.elements.seekSlider.value = 0;
    this.elements.currentTimeDisplay.textContent = '0:00';
  }

  /**
   * Handle audio playback error
   * @param {Error} error
   * @private
   */
  onPlaybackError(error) {
    this.elements.errorDisplay.textContent = 'Error playing audio file';
    console.error('Audio playback error:', error);

    // Reset UI
    this.isPlaying = false;
    this.elements.playButton.textContent = 'Play';
    this.stopUpdating();
  }

  /**
   * Called when new file is loaded
   * Updates UI with file duration and enables controls
   * @param {number} duration - Duration in seconds
   */
  onFileLoaded(duration) {
    // Set slider max to duration
    this.elements.seekSlider.max = Math.floor(duration);

    // Update duration display
    this.elements.durationDisplay.textContent = this.formatTime(duration);

    // Enable controls
    this.elements.playButton.disabled = false;
    this.elements.seekSlider.disabled = false;

    // Reset playback state
    this.elements.playButton.textContent = 'Play';
    this.elements.seekSlider.value = 0;
    this.elements.currentTimeDisplay.textContent = '0:00';
    this.isPlaying = false;
  }

  /**
   * Format time helper (moved from utils to avoid circular dependency)
   * @param {number} seconds
   * @returns {string}
   * @private
   */
  formatTime(seconds) {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '--:--';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Format with zero-padding
    const pad = (num) => String(num).padStart(2, '0');

    // Include hours only if >= 1 hour
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${minutes}:${pad(secs)}`;
  }

  /**
   * Clean up resources
   * Should be called when done with player
   */
  cleanup() {
    this.stopUpdating();
    this.audioService.cleanup();
  }
}

export default PlayerController;
