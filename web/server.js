const https = require('https');

const API_BASE = 'https://bdfz.xnykcxt.com:5002';

const handler = (req, res) => {
  return new Promise((resolve, reject) => {
    // CORS headers
    // Set Origin dynamically to allow credentials (cookies) to work
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
    // We need to strip the /api/exam prefix because the upstream server just expects /exam/...
    let targetPath = req.url;
    
    if (targetPath.startsWith('/api/exam')) {
      targetPath = targetPath.replace('/api/exam', '/exam');
    } else if (targetPath.startsWith('/api')) {
      targetPath = targetPath.replace('/api', '');
    }
    
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
      // Forward Set-Cookie headers from upstream
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }
      
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
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
  module.exports = handler;

// Important: Disable body parsing so we can stream the request directly
module.exports.config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
