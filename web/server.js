const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_BASE = 'https://bdfz.xnykcxt.com:5002';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy API requests
  if (req.url.startsWith('/exam/')) {
    proxyRequest(req, res);
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(data);
  });
});

function proxyRequest(req, res) {
  const url = API_BASE + req.url;
  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: 'bdfz.xnykcxt.com:5002'
    },
    rejectUnauthorized: false // Skip SSL verification for internal system
  };

  // Forward cookies
  if (req.headers.cookie) {
    options.headers.cookie = req.headers.cookie;
  }

  const proxyReq = https.request(url, options, (proxyRes) => {
    // Forward Set-Cookie headers
    if (proxyRes.headers['set-cookie']) {
      res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
    }
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });

  if (req.method === 'POST' || req.method === 'PUT') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('API proxy: /exam/* -> ' + API_BASE);
});
