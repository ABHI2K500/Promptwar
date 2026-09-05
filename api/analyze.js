export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb'
  },
};

/**
 * Base API URL for Reality Defender.
 * @constant {string}
 */
const API_BASE = 'https://api.prd.realitydefender.xyz/api';

/**
 * Maximum allowed payload size in bytes (10 MB).
 * @constant {number}
 */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Reads and buffers the incoming HTTP request body.
 * @param {import('http').IncomingMessage} request - The HTTP request object.
 * @returns {Promise<Buffer>} The buffered request body.
 * @throws {Error} If the payload exceeds MAX_BYTES.
 */
function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) { reject(new Error('The file exceeds the 10 MB live-analysis limit.')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

/**
 * Sanitizes a filename to prevent path traversal or injection.
 * @param {string} value - The raw filename string.
 * @returns {string} The sanitized filename.
 */
function safeName(value = 'upload') {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
}

/**
 * Vercel Serverless Function to initialize Reality Defender analysis.
 * @param {import('http').IncomingMessage} req - The incoming request.
 * @param {import('http').ServerResponse} res - The outgoing response.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const apiKey = process.env.REALITY_DEFENDER_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Live detector is not configured.' });
  
  try {
    const fileName = safeName(decodeURIComponent(req.headers['x-veritas-filename'] || 'upload'));
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream');
    const binary = await readBody(req);
    const response = await fetch(`${API_BASE}/files/aws-presigned`, { method: 'POST', headers: { 'x-api-key': apiKey, 'content-type': 'application/json' }, body: JSON.stringify({ fileName }) });
    const signed = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(signed?.message || signed?.error?.message || `Reality Defender request failed (${response.status}).`);
    const uploadUrl = signed.response?.signedUrl || signed.url || signed.presignedUrl || signed.uploadUrl;
    const requestId = signed.requestId || signed.request_id || signed.id;
    if (!uploadUrl || !requestId) throw new Error('Reality Defender returned an incomplete upload response.');
    const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': mimeType }, body: binary });
    if (!upload.ok) throw new Error(`Secure media upload failed (${upload.status}).`);
    return res.status(202).json({ requestId });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Unable to start live analysis.' });
  }
}
