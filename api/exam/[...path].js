const https = require('https');

const API_BASE = 'https://bdfz.xnykcxt.com:5002';

const handler = (req, res) => {
  return new Promise((resolve, reject) => {
    // CORS headers - mirroring server.js
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      resolve();
      return;
    }

    // Construct target URL
    // req.url will be something like /api/exam/path/to/resource because of the rewrite.
    // We want to request https://bdfz.xnykcxt.com:5002/exam/path/to/resource
    // So we replace /api/exam with /exam, or just remove /api.
    const targetPath = req.url.replace(/^\/api/, '');
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
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
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
