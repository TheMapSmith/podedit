/**
 * TranscriptionService - Whisper API integration with chunking support
 * Handles speech-to-text transcription with automatic caching and large file chunking
 */
import { generateFileHash } from '../utils/fileHash.js';
import CacheService from './cacheService.js';

class TranscriptionService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = apiKey;
    this.cacheService = new CacheService();
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
    this.maxChunkSize = 24 * 1024 * 1024; // 24MB - buffer under 25MB API limit
    this.maxChunkDuration = 1200; // 1200 seconds - safe buffer under 1400s API limit
    this.minBitrate = 64000; // 64 kbps - conservative assumption for duration estimation
  }

  /**
   * Estimate audio duration from file size using conservative bitrate assumption
   * Uses low bitrate (64kbps) to over-estimate duration, ensuring we chunk more aggressively
   * @param {File} file - Audio file
   * @returns {number} - Estimated duration in seconds
   */
  estimateDuration(file) {
    // file.size is bytes, minBitrate is bits/second
    // duration = (bytes * 8 bits/byte) / (bits/second)
    return (file.size * 8) / this.minBitrate;
  }

  /**
   * Transcribe audio file with automatic caching and chunking
   * @param {File} file - Audio file to transcribe
   * @param {Function} onProgress - Progress callback (0-1) for chunked transcription
   * @returns {Promise<Object>} - Transcript with text, segments array, and duration
   */
  async transcribe(file, onProgress) {
    try {
      // Generate content-based hash for cache key
      const fileHash = await generateFileHash(file);

      // Check cache first
      const cached = await this.cacheService.get(fileHash);
      if (cached) {
        console.log('Using cached transcript for file hash:', fileHash);
        return cached;
      }

      // Calculate optimal chunk count considering both size and duration limits
      const estimatedDuration = this.estimateDuration(file);
      console.log(`Transcription: ${file.name}, ${(file.size / (1024*1024)).toFixed(2)}MB, ~${Math.round(estimatedDuration)}s estimated`);

      const chunksBySize = Math.ceil(file.size / this.maxChunkSize);
      const chunksByDuration = Math.ceil(estimatedDuration / this.maxChunkDuration);
      const numChunks = Math.max(chunksBySize, chunksByDuration, 1);

      // Determine transcription strategy
      let transcript;
      if (numChunks > 1) {
        console.log(`Chunking: size needs ${chunksBySize} chunks, duration needs ${chunksByDuration} chunks, using ${numChunks}`);
        const chunkSize = Math.ceil(file.size / numChunks);
        transcript = await this.transcribeChunked(file, fileHash, onProgress, chunkSize);
      } else {
        console.log('File under limits, using single transcription');
        transcript = await this.transcribeSingle(file, fileHash);
      }

      // Cache the result
      await this.cacheService.set(fileHash, transcript);

      return transcript;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Transcribe single file (under 24MB)
   * @param {File} file - Audio file
   * @param {string} hash - File hash for logging
   * @returns {Promise<Object>} - Transcript data
   */
  async transcribeSingle(file, hash) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'gpt-4o-transcribe-diarize');
    formData.append('response_format', 'diarized_json');
    formData.append('chunking_strategy', 'auto');

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Transcription API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // Validate response structure
      if (!result.text) {
        throw new Error('Invalid API response: missing text field');
      }

      return result;
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe large file by chunking (>24MB or >1200s)
   * @param {File} file - Audio file
   * @param {string} hash - File hash for caching
   * @param {Function} onProgress - Progress callback
   * @param {number} chunkSize - Chunk size in bytes (dynamically calculated based on constraints)
   * @returns {Promise<Object>} - Merged transcript with continuous timestamps
   */
  async transcribeChunked(file, hash, onProgress, chunkSize = this.maxChunkSize) {
    // Split file into chunks using byte boundaries
    const chunks = [];
    let offset = 0;

    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const chunk = file.slice(offset, end, file.type);
      chunks.push(chunk);
      offset = end;
    }

    console.log(`Split into ${chunks.length} chunks`);

    // Transcribe each chunk
    const results = [];
    let cumulativeDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Transcribing chunk ${i + 1}/${chunks.length}...`);

      // Create File object from Blob chunk with proper name and type
      const extension = file.name.split('.').pop();
      const chunkFile = new File(
        [chunks[i]],
        `chunk_${i}.${extension}`,
        { type: file.type }
      );

      // Transcribe chunk
      const formData = new FormData();
      formData.append('file', chunkFile);
      formData.append('model', 'gpt-4o-transcribe-diarize');
      formData.append('response_format', 'diarized_json');
      formData.append('chunking_strategy', 'auto');

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chunk ${i} transcription failed (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        // Adjust timestamps for continuity
        if (result.segments && Array.isArray(result.segments)) {
          result.segments.forEach(segment => {
            segment.start += cumulativeDuration;
            segment.end += cumulativeDuration;
          });
        }

        results.push(result);

        // Update cumulative duration for next chunk
        // Use duration from API response, fallback to last segment's end time
        if (result.duration) {
          cumulativeDuration += result.duration;
        } else if (result.segments && result.segments.length > 0) {
          const lastSegment = result.segments[result.segments.length - 1];
          cumulativeDuration = lastSegment.end;
        }

        // Report progress
        if (onProgress) {
          onProgress((i + 1) / chunks.length);
        }

      } catch (error) {
        throw new Error(`Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
      }
    }

    // Merge results
    const merged = {
      text: results.map(r => r.text).join(' '),
      segments: results.flatMap(r => r.segments || []),
      duration: cumulativeDuration,
      language: results[0]?.language || 'unknown',
      chunks: chunks.length // Metadata for debugging
    };

    console.log(`Merged ${chunks.length} chunks into single transcript`);

    return merged;
  }

  /**
   * Clear all cached transcripts
   * @returns {Promise<void>}
   */
  async clearCache() {
    return this.cacheService.clear();
  }
}

export default TranscriptionService;
