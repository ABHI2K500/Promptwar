import { defineConfig, loadEnv } from 'vite';

const API_BASE = 'https://api.prd.realitydefender.xyz/api';
const MAX_BYTES = 10 * 1024 * 1024;

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

function safeName(value = 'upload') {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
}

function realityDefenderPlugin(apiKey) {
  return {
    name: 'veritas-reality-defender',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        if (!apiKey) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Live detector is not configured.' })); return; }
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
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ requestId }));
        } catch (error) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message || 'Unable to start live analysis.' })); }
      });
      server.middlewares.use('/api/analysis', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        try {
          const requestId = new URL(req.url, 'http://localhost').searchParams.get('requestId');
          if (!requestId || !/^[a-zA-Z0-9_-]+$/.test(requestId)) throw new Error('Invalid analysis ID.');
          const response = await fetch(`${API_BASE}/media/users/${requestId}`, { headers: { 'x-api-key': apiKey, 'content-type': 'application/json' } });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data?.message || data?.error?.message || `Reality Defender request failed (${response.status}).`);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data));
        } catch (error) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message || 'Unable to retrieve live analysis.' })); }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [realityDefenderPlugin(env.REALITY_DEFENDER_API_KEY)] };
});
