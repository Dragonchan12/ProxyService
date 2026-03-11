export default async function handler(req, res) {
  // Get the target URL from the query string (e.g., /api/proxy?url=https://example.com)
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'A "url" query parameter is required.' });
  }

  try {
    // Fetch the requested URL
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // Pass along safe headers, or set a custom User-Agent
        'User-Agent': 'Vercel-Serverless-Proxy/1.0',
        'Accept': req.headers['accept'] || '*/*'
      }
    });

    // Get the response body
    const data = await response.text();

    // Set CORS headers so your frontend can call this proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Return the status and data
    res.status(response.status).send(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Failed to proxy the request.' });
  }
}
