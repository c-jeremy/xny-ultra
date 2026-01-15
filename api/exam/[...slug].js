const https = require('https');

const API_BASE = 'https://bdfz.xnykcxt.com:5002';

const handler = (req, res) => {
  return new Promise((resolve, reject) => {
    // CORS headers
    // Mirroring server.js but fixing Origin for Credentials support
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      resolve();
      return;
    }

    // Construct target URL
    // Handle both /api/exam/... (rewritten) and /exam/... (if passed directly)
    let targetPath = req.url;

    // If the request comes via rewrite /exam/* -> /api/exam/*, req.url might be /api/exam/...
    // If we want to support direct access or different rewrite behaviors, be flexible.
    if (targetPath.startsWith('/api/exam')) {
      targetPath = targetPath.replace('/api/exam', '/exam');
    } else if (targetPath.startsWith('/api')) {
      targetPath = targetPath.replace('/api', '');
    }

    // Fallback: if somehow we still don't have /exam prefix (e.g. /login...), prepend it?
    // But upstream expects /exam/... usually.
    // Based on server.js: proxyRequest is called for /exam/*.

    const url = API_BASE + targetPath;

    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        host: 'bdfz.xnykcxt.com:5002'
      },
      rejectUnauthorized: false // Skip SSL verification for internal system
    };

    const proxyReq = https.request(url, options, (proxyRes) => {
      // Forward Set-Cookie headers
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }

      // server.js only sends these specific headers on response
      // We already set CORS on the response object above, but to match server.js behavior of sending it with response:
      // (Note: res.setHeader above sets it on the response to be sent)

      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        // 'Access-Control-Allow-Origin': ... (Already set via setHeader)
      });

      proxyRes.pipe(res);

      proxyRes.on('end', () => {
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.status(500).json({ error: err.message });
      resolve();
    });

    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
};

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
