export default async function handler(req, res) {
  const targetUrl = req.query.url;

  // 1. If no URL is provided, show the "Fake Browser" UI
  if (!targetUrl) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Web Proxy</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f9; text-align: center; margin-top: 10%; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: inline-block; }
            input[type="url"] { width: 350px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; }
            button { padding: 10px 20px; font-size: 16px; background-color: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background-color: #005bb5; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🌐 Unrestricted Web Proxy</h2>
            <form action="/api/proxy" method="GET">
              <input type="url" name="url" placeholder="https://wikipedia.org" required>
              <button type="submit">Browse</button>
            </form>
          </div>
        </body>
      </html>
    `);
  }

  // 2. Fetch the requested URL
  try {
    const urlObj = new URL(targetUrl);
    const baseUrl = urlObj.origin;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': req.headers['accept'] || '*/*'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    // 3. If the page is HTML, we must rewrite the links so the user doesn't escape the proxy
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Basic Regex to find href="..." and src="..." and rewrite them to go through our proxy
      html = html.replace(/(href|src)=["'](.*?)["']/gi, (match, attribute, link) => {
        // Ignore data URIs or empty links
        if (link.startsWith('data:') || link.startsWith('javascript:') || link.startsWith('#')) {
          return match;
        }

        let absoluteUrl = link;
        
        // Convert relative URLs (like /images/logo.png) to absolute URLs
        if (link.startsWith('//')) {
          absoluteUrl = 'https:' + link;
        } else if (link.startsWith('/')) {
          absoluteUrl = baseUrl + link;
        } else if (!link.startsWith('http')) {
          // It's a relative link without a slash
          let path = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
          absoluteUrl = baseUrl + path + link;
        }

        // Wrap the absolute URL in our proxy URL
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        return `${attribute}="${proxiedUrl}"`;
      });

      res.setHeader('Content-Type', 'text/html');
      return res.status(response.status).send(html);
    } 
    
    // 4. If it's an image, CSS, or JS file, pass it through directly
    else {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Pass along the correct content type (e.g., image/png, text/css)
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(buffer);
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send(`<h2>Error fetching the page</h2><p>${error.message}</p>`);
  }
}
