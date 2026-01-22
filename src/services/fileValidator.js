// Supported audio formats mapping MIME types to extensions
export const SUPPORTED_AUDIO_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/mp3': ['.mp3'],           // Chrome variation
  'audio/wav': ['.wav'],
  'audio/wave': ['.wav'],          // Alternative
  'audio/x-wav': ['.wav'],         // Legacy
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/aac': ['.aac'],
  'audio/ogg': ['.ogg', '.oga'],
};

// Maximum file size: 500MB (reasonable max for 90-min podcast)
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Validate audio file format and size
 * @param {File} file - File object from input
 * @returns {Object} Validation result with valid flag, errors array, and fileInfo
 */
export function validateAudioFile(file) {
  const errors = [];

  // Check if file exists
  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase();
  if (!SUPPORTED_AUDIO_FORMATS[mimeType]) {
    errors.push(`Unsupported audio format: ${mimeType || 'unknown'}. Supported formats: MP3, WAV, M4A, AAC, OGG`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    errors.push(`File too large: ${sizeMB}MB. Maximum size: 500MB`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Check file extension matches MIME type (optional sanity check)
  const extension = file.name.toLowerCase().split('.').pop();
  const expectedExtensions = SUPPORTED_AUDIO_FORMATS[mimeType] || [];
  const extensionValid = expectedExtensions.some(ext => ext.includes(extension));

  if (mimeType && !extensionValid && errors.length === 0) {
    errors.push(`File extension .${extension} doesn't match MIME type ${mimeType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: mimeType,
      sizeFormatted: formatFileSize(file.size)
    }
  };
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "45.2 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
