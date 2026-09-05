const API_BASE = 'https://api.prd.realitydefender.xyz/api';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  const apiKey = process.env.REALITY_DEFENDER_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Live detector is not configured.' });
  
  try {
    const requestId = req.query.requestId;
    if (!requestId || !/^[a-zA-Z0-9_-]+$/.test(requestId)) throw new Error('Invalid analysis ID.');
    const response = await fetch(`${API_BASE}/media/users/${requestId}`, { headers: { 'x-api-key': apiKey, 'content-type': 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || data?.error?.message || `Reality Defender request failed (${response.status}).`);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Unable to retrieve live analysis.' });
  }
}
