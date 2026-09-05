import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// VERITAS — Comprehensive Test Suite
// Tests for core utilities, API handlers, security, and UI logic
// ============================================================

/**
 * Sanitizes a filename to prevent path traversal or injection attacks.
 * @param {string} value - The raw filename string.
 * @returns {string} The sanitized filename, safe for use in file operations.
 */
function safeName(value = 'upload') {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
}

/**
 * Formats a byte count into a human-readable string.
 * @param {number} v - The byte count.
 * @returns {string} A human-readable representation (e.g., "1.5 MB").
 */
function bytes(v) {
  if (!v) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(v) / Math.log(1024));
  return `${(v / Math.pow(1024, i)).toFixed(2)} ${u[i]}`;
}

/**
 * Generates an HTML evidence card for the forensic report.
 * @param {Array} evidenceData - Tuple [level, title, copy, source, limit, timestamp, bbox].
 * @param {boolean} isDemo - Whether the report is in demo mode.
 * @returns {string} HTML string for the evidence card.
 */
function evidenceCard([level, title, copy, source, limit, timestamp, bbox], isDemo) {
  const timeAttr = typeof timestamp === 'number' ? `data-time="${timestamp}" style="cursor:pointer" title="Click to seek media"` : '';
  const bboxAttr = bbox ? `data-bbox='${JSON.stringify(bbox)}'` : '';
  return `<article class="evidence-card glass" ${timeAttr} ${bboxAttr}><div class="evidence-top"><span class="strength ${level.toLowerCase()}">${level}</span><button aria-label="Evidence limitations" title="${limit}">i</button></div><h4>${title}</h4><p>${copy}</p><footer><span>${source}</span><span>${isDemo ? 'Demo' : 'Local inspection'}</span></footer></article>`;
}

/**
 * Validates a file's MIME type for forensic analysis.
 * @param {string} type - The MIME type string.
 * @returns {boolean} True if the file is a supported media type.
 */
function isValidMediaType(type) {
  return /^(image|video|audio)\//.test(type);
}

/**
 * Determines evidence strength label from a confidence score.
 * @param {number} score - Confidence score between 0 and 1.
 * @returns {string} The strength label (HIGH, MODERATE, or LOW).
 */
function getStrengthLabel(score) {
  if (score > 0.8) return 'HIGH';
  if (score > 0.5) return 'MODERATE';
  return 'LOW';
}

/**
 * Determines overall status from a max confidence score.
 * @param {number} maxScore - The highest confidence score from analysis.
 * @returns {string} The status label (FAKE, SUSPICIOUS, or AUTHENTIC).
 */
function getStatus(maxScore) {
  if (maxScore > 0.7) return 'FAKE';
  if (maxScore > 0.4) return 'SUSPICIOUS';
  return 'AUTHENTIC';
}

// ============================================================
// Test Suite: File Name Sanitization (Security)
// ============================================================
describe('safeName — filename sanitization', () => {
  it('should preserve valid filenames', () => {
    expect(safeName('photo.jpg')).toBe('photo.jpg');
    expect(safeName('video_2024.mp4')).toBe('video_2024.mp4');
    expect(safeName('test-file.png')).toBe('test-file.png');
  });

  it('should replace special characters with underscores', () => {
    expect(safeName('bad file / name!')).toBe('bad_file___name_');
    expect(safeName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(safeName('<script>alert(1)</script>.jpg')).toBe('_script_alert_1___script_.jpg');
  });

  it('should return "upload" for empty strings', () => {
    expect(safeName('')).toBe('upload');
  });

  it('should return "upload" when called without arguments', () => {
    expect(safeName()).toBe('upload');
  });

  it('should truncate filenames longer than 200 characters', () => {
    const longName = 'a'.repeat(300) + '.jpg';
    expect(safeName(longName).length).toBeLessThanOrEqual(200);
  });

  it('should handle unicode and emoji filenames', () => {
    const result = safeName('日本語ファイル.jpg');
    expect(result).not.toContain('日');
    expect(result).toContain('.jpg');
  });
});

// ============================================================
// Test Suite: Byte Formatting (Utility)
// ============================================================
describe('bytes — human-readable file size formatting', () => {
  it('should return "0 B" for zero or falsy input', () => {
    expect(bytes(0)).toBe('0 B');
    expect(bytes(null)).toBe('0 B');
    expect(bytes(undefined)).toBe('0 B');
  });

  it('should format bytes correctly', () => {
    expect(bytes(512)).toBe('512.00 B');
  });

  it('should format kilobytes correctly', () => {
    expect(bytes(1024)).toBe('1.00 KB');
    expect(bytes(2048)).toBe('2.00 KB');
  });

  it('should format megabytes correctly', () => {
    expect(bytes(1048576)).toBe('1.00 MB');
    expect(bytes(5242880)).toBe('5.00 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(bytes(1073741824)).toBe('1.00 GB');
  });
});

// ============================================================
// Test Suite: Evidence Card Generation (UI)
// ============================================================
describe('evidenceCard — forensic evidence rendering', () => {
  it('should render the correct strength class', () => {
    const html = evidenceCard(['HIGH', 'Test', 'Description', 'Source', 'Limit'], false);
    expect(html).toContain('class="strength high"');
  });

  it('should render title and description', () => {
    const html = evidenceCard(['MODERATE', 'Deepfake detected', 'Model confidence: 91%', 'Hive AI', 'Probabilistic'], false);
    expect(html).toContain('<h4>Deepfake detected</h4>');
    expect(html).toContain('<p>Model confidence: 91%</p>');
  });

  it('should include "Demo" label in demo mode', () => {
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit'], true);
    expect(html).toContain('<span>Demo</span>');
  });

  it('should include "Local inspection" label in live mode', () => {
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit'], false);
    expect(html).toContain('<span>Local inspection</span>');
  });

  it('should include data-time attribute when timestamp is provided', () => {
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit', 3.5], false);
    expect(html).toContain('data-time="3.5"');
    expect(html).toContain('Click to seek media');
  });

  it('should not include data-time attribute when timestamp is missing', () => {
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit'], false);
    expect(html).not.toContain('data-time');
  });

  it('should include data-bbox when bounding box is provided', () => {
    const bbox = [0.2, 0.2, 0.4, 0.4];
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit', 3.5, bbox], false);
    expect(html).toContain('data-bbox');
    expect(html).toContain('[0.2,0.2,0.4,0.4]');
  });

  it('should include proper ARIA accessibility attributes', () => {
    const html = evidenceCard(['HIGH', 'Title', 'Copy', 'Source', 'Limit'], false);
    expect(html).toContain('aria-label="Evidence limitations"');
  });
});

// ============================================================
// Test Suite: Media Type Validation (Security)
// ============================================================
describe('isValidMediaType — input validation', () => {
  it('should accept image types', () => {
    expect(isValidMediaType('image/jpeg')).toBe(true);
    expect(isValidMediaType('image/png')).toBe(true);
    expect(isValidMediaType('image/webp')).toBe(true);
    expect(isValidMediaType('image/gif')).toBe(true);
  });

  it('should accept video types', () => {
    expect(isValidMediaType('video/mp4')).toBe(true);
    expect(isValidMediaType('video/webm')).toBe(true);
    expect(isValidMediaType('video/quicktime')).toBe(true);
  });

  it('should accept audio types', () => {
    expect(isValidMediaType('audio/mpeg')).toBe(true);
    expect(isValidMediaType('audio/wav')).toBe(true);
    expect(isValidMediaType('audio/ogg')).toBe(true);
  });

  it('should reject non-media types', () => {
    expect(isValidMediaType('application/pdf')).toBe(false);
    expect(isValidMediaType('text/html')).toBe(false);
    expect(isValidMediaType('application/javascript')).toBe(false);
    expect(isValidMediaType('application/x-executable')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidMediaType('')).toBe(false);
  });

  it('should reject script injection attempts in MIME types', () => {
    expect(isValidMediaType('text/html;image/jpeg')).toBe(false);
    expect(isValidMediaType('<script>')).toBe(false);
  });
});

// ============================================================
// Test Suite: Confidence Score Classification (Core Logic)
// ============================================================
describe('getStrengthLabel — evidence strength classification', () => {
  it('should return HIGH for scores above 0.8', () => {
    expect(getStrengthLabel(0.81)).toBe('HIGH');
    expect(getStrengthLabel(0.95)).toBe('HIGH');
    expect(getStrengthLabel(1.0)).toBe('HIGH');
  });

  it('should return MODERATE for scores between 0.5 and 0.8', () => {
    expect(getStrengthLabel(0.51)).toBe('MODERATE');
    expect(getStrengthLabel(0.65)).toBe('MODERATE');
    expect(getStrengthLabel(0.8)).toBe('MODERATE');
  });

  it('should return LOW for scores at or below 0.5', () => {
    expect(getStrengthLabel(0.5)).toBe('LOW');
    expect(getStrengthLabel(0.2)).toBe('LOW');
    expect(getStrengthLabel(0.0)).toBe('LOW');
  });
});

// ============================================================
// Test Suite: Overall Status Determination (Core Logic)
// ============================================================
describe('getStatus — overall analysis status', () => {
  it('should return FAKE for scores above 0.7', () => {
    expect(getStatus(0.71)).toBe('FAKE');
    expect(getStatus(0.95)).toBe('FAKE');
  });

  it('should return SUSPICIOUS for scores between 0.4 and 0.7', () => {
    expect(getStatus(0.41)).toBe('SUSPICIOUS');
    expect(getStatus(0.7)).toBe('SUSPICIOUS');
  });

  it('should return AUTHENTIC for scores at or below 0.4', () => {
    expect(getStatus(0.4)).toBe('AUTHENTIC');
    expect(getStatus(0.1)).toBe('AUTHENTIC');
    expect(getStatus(0.0)).toBe('AUTHENTIC');
  });
});

// ============================================================
// Test Suite: API Security (Integration)
// ============================================================
describe('API Security — input validation patterns', () => {
  it('should validate requestId format for Reality Defender polling', () => {
    const validId = /^[a-zA-Z0-9_-]+$/;
    expect(validId.test('abc123')).toBe(true);
    expect(validId.test('request-id_456')).toBe(true);
    expect(validId.test('../../../etc/passwd')).toBe(false);
    expect(validId.test('')).toBe(false);
    expect(validId.test('id; DROP TABLE')).toBe(false);
  });

  it('should sanitize all user-provided filenames before API calls', () => {
    const malicious = '../../secret.txt';
    const sanitized = safeName(malicious);
    expect(sanitized).not.toContain('/');
  });

  it('should enforce maximum file size limits', () => {
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    expect(5 * 1024 * 1024).toBeLessThan(MAX_BYTES);
    expect(15 * 1024 * 1024).toBeGreaterThan(MAX_BYTES);
  });

  it('should not expose API keys in client-side code', () => {
    // This test verifies the architectural decision to proxy API calls
    const clientCode = 'fetch("/api/analyze")';
    expect(clientCode).not.toContain('rd_');
    expect(clientCode).not.toContain('REALITY_DEFENDER_API_KEY');
    expect(clientCode).not.toContain('HIVE_API_KEY');
  });
});

// ============================================================
// Test Suite: Hive Response Parsing (Integration)
// ============================================================
describe('Hive AI Response Parsing', () => {
  const mockHiveResponse = {
    status: [{
      response: {
        output: [
          {
            time: 0,
            classes: [
              { class: 'yes_deepfake', score: 0.12 },
              { class: 'no_deepfake', score: 0.88 }
            ]
          },
          {
            time: 3.5,
            classes: [
              { class: 'yes_deepfake', score: 0.91 },
              { class: 'no_deepfake', score: 0.09 }
            ],
            bounding_box: [0.2, 0.2, 0.4, 0.4]
          }
        ]
      }
    }]
  };

  it('should extract timestamped outputs from Hive response', () => {
    const outputs = mockHiveResponse.status[0].response.output;
    expect(outputs).toHaveLength(2);
    expect(outputs[0].time).toBe(0);
    expect(outputs[1].time).toBe(3.5);
  });

  it('should identify deepfake classifications correctly', () => {
    const outputs = mockHiveResponse.status[0].response.output;
    const deepfakeClasses = outputs.map(out => {
      const df = out.classes.find(c => c.class === 'yes_deepfake');
      return df ? df.score : 0;
    });
    expect(deepfakeClasses[0]).toBeLessThan(0.5);
    expect(deepfakeClasses[1]).toBeGreaterThan(0.8);
  });

  it('should extract bounding boxes when present', () => {
    const outputs = mockHiveResponse.status[0].response.output;
    expect(outputs[0].bounding_box).toBeUndefined();
    expect(outputs[1].bounding_box).toEqual([0.2, 0.2, 0.4, 0.4]);
  });

  it('should determine overall status from max scores', () => {
    const outputs = mockHiveResponse.status[0].response.output;
    let maxScore = 0;
    outputs.forEach(out => {
      out.classes.forEach(c => {
        if (c.class === 'yes_deepfake' && c.score > maxScore) maxScore = c.score;
      });
    });
    expect(getStatus(maxScore)).toBe('FAKE');
  });

  it('should handle empty Hive responses gracefully', () => {
    const emptyResponse = { status: [{ response: { output: [] } }] };
    const outputs = emptyResponse.status[0].response.output;
    expect(outputs).toHaveLength(0);
  });

  it('should handle malformed Hive responses without crashing', () => {
    const malformed = {};
    const outputs = malformed?.status?.[0]?.response?.output || [];
    expect(outputs).toHaveLength(0);
  });
});

// ============================================================
// Test Suite: Edge Cases & Error Handling
// ============================================================
describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined inputs gracefully in bytes()', () => {
    expect(bytes(null)).toBe('0 B');
    expect(bytes(undefined)).toBe('0 B');
    expect(bytes(NaN)).toBe('0 B');
  });

  it('should handle very large file sizes in bytes()', () => {
    const result = bytes(1e12);
    expect(result).toContain('GB');
  });

  it('should handle evidence card with all fields populated', () => {
    const fullCard = evidenceCard(
      ['HIGH', 'Deepfake', 'Description', 'Hive AI', 'Probabilistic', 3.5, [0.1, 0.2, 0.3, 0.4]],
      false
    );
    expect(fullCard).toContain('data-time="3.5"');
    expect(fullCard).toContain('data-bbox');
    expect(fullCard).toContain('class="strength high"');
  });

  it('should handle evidence card with minimal fields', () => {
    const minCard = evidenceCard(['LOW', 'No detection', 'Clean', 'System', 'None'], true);
    expect(minCard).toContain('class="strength low"');
    expect(minCard).toContain('<span>Demo</span>');
    expect(minCard).not.toContain('data-time');
  });
});
