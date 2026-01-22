/**
 * AudioService - Manages audio playback with streaming support for large files
 */
class AudioService {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata'; // Critical for large file streaming
    this.listeners = new Map(); // Track listeners for cleanup
  }

  /**
   * Load audio file and wait for metadata
   * @param {File} file - Audio file from input[type="file"]
   * @returns {Promise<{duration: number, seekable: number}>}
   */
  async loadFile(file) {
    // Clean up previous file
    this.cleanup();

    // Create streaming URL - no file copying, just reference
    const url = URL.createObjectURL(file);
    this.audio.src = url;

    return new Promise((resolve, reject) => {
      const onMetadata = () => {
        cleanup();
        resolve({
          duration: this.audio.duration,
          seekable: this.audio.seekable.length > 0
            ? this.audio.seekable.end(0)
            : this.audio.duration
        });
      };

      const onError = (error) => {
        cleanup();
        reject(new Error(`Failed to load audio: ${error.message}`));
      };

      const cleanup = () => {
        this.audio.removeEventListener('loadedmetadata', onMetadata);
        this.audio.removeEventListener('error', onError);
      };

      // Check if metadata already loaded (race condition prevention)
      if (this.audio.readyState > 0) {
        onMetadata();
      } else {
        this.audio.addEventListener('loadedmetadata', onMetadata);
        this.audio.addEventListener('error', onError);
      }
    });
  }

  /**
   * Start playback (requires user gesture due to autoplay policy)
   * @returns {Promise<void>}
   */
  async play() {
    try {
      await this.audio.play();
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('Autoplay blocked - user interaction required');
      } else {
        console.error('Playback failed:', error);
      }
      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    this.audio.pause();
  }

  /**
   * Seek to specific time in seconds
   * @param {number} timeInSeconds
   */
  seek(timeInSeconds) {
    if (timeInSeconds >= 0 && timeInSeconds <= this.audio.duration) {
      this.audio.currentTime = timeInSeconds;
    }
  }

  /**
   * Get current playback position in seconds
   * @returns {number}
   */
  getCurrentTime() {
    return this.audio.currentTime;
  }

  /**
   * Get total duration in seconds
   * @returns {number}
   */
  getDuration() {
    return this.audio.duration;
  }

  /**
   * Check if audio is currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  /**
   * Register event listener
   * @param {string} eventName - Event name (play, pause, timeupdate, etc.)
   * @param {Function} callback
   */
  on(eventName, callback) {
    this.audio.addEventListener(eventName, callback);

    // Store for cleanup
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} eventName
   * @param {Function} callback
   */
  off(eventName, callback) {
    this.audio.removeEventListener(eventName, callback);

    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Clean up resources (call when done with audio)
   * Revokes object URL to prevent memory leak
   */
  cleanup() {
    // Pause and reset
    this.audio.pause();

    // Revoke object URL to prevent memory leak
    if (this.audio.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }

    // Clear source
    this.audio.src = '';

    // Remove all listeners
    this.listeners.forEach((callbacks, eventName) => {
      callbacks.forEach(callback => {
        this.audio.removeEventListener(eventName, callback);
      });
    });
    this.listeners.clear();
  }
}

export default AudioService;
