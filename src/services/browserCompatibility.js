/**
 * BrowserCompatibility - Detects browser features required for FFmpeg.wasm
 */
class BrowserCompatibility {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.loadError = null;
  }

  /**
   * Check all required features for FFmpeg.wasm processing
   * @returns {{ supported: boolean, errors: string[], warnings: string[] }}
   */
  checkCompatibility() {
    const errors = [];
    const warnings = [];

    // Check WebAssembly support (required)
    if (typeof WebAssembly === 'undefined') {
      errors.push('WebAssembly is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
    }

    // Check SharedArrayBuffer (required for multi-threading)
    if (typeof SharedArrayBuffer === 'undefined') {
      errors.push('SharedArrayBuffer is not available. This may be due to missing security headers or browser restrictions.');
    }

    // Check crossOriginIsolated (required for SharedArrayBuffer)
    if (!crossOriginIsolated) {
      errors.push('Cross-origin isolation is not enabled. The server must send COOP/COEP headers.');
    }

    // Detect iOS Safari (works but slower - single-thread only)
    const isIOSSafari = this.detectIOSSafari();
    if (isIOSSafari) {
      warnings.push('iOS Safari detected. Audio processing will use single-thread mode and may take 2x longer than desktop browsers.');
    }

    return {
      supported: errors.length === 0,
      errors,
      warnings,
      isIOSSafari
    };
  }

  /**
   * Detect iOS Safari which doesn't support SharedArrayBuffer in Web Workers
   * @returns {boolean}
   */
  detectIOSSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
    return isIOS && isSafari;
  }

  /**
   * Lazy load FFmpeg.wasm library
   * @param {function} onProgress - Optional progress callback for loading UI
   * @returns {Promise<FFmpeg>}
   */
  async loadFFmpeg(onProgress = null) {
    if (this.loaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    if (this.loadError) {
      throw this.loadError;
    }

    try {
      if (onProgress) onProgress({ stage: 'downloading', progress: 0 });

      // Dynamic import - only loads when called
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      this.ffmpeg = new FFmpeg();

      // Set up progress logging
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      if (onProgress) onProgress({ stage: 'loading', progress: 50 });

      // Load the FFmpeg core (multi-threaded if available)
      // Use toBlobURL to load from CDN with proper CORS handling
      const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });

      if (onProgress) onProgress({ stage: 'ready', progress: 100 });

      this.loaded = true;
      return this.ffmpeg;
    } catch (error) {
      this.loadError = error;
      console.error('Failed to load FFmpeg:', error);
      throw new Error(`Failed to load FFmpeg: ${error.message}`);
    }
  }

  /**
   * Check if FFmpeg is loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded && this.ffmpeg !== null;
  }

  /**
   * Get the loaded FFmpeg instance
   * @returns {FFmpeg|null}
   */
  getFFmpeg() {
    return this.ffmpeg;
  }
}

export default BrowserCompatibility;
