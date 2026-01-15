const https = require('https');

const API_BASE = 'https://bdfz.xnykcxt.com:5002';

const handler = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 🔥 关键修复: 使用 req.query.path 而不是 req.url
  const pathSegments = req.query.path || [];
  const targetPath = '/exam/' + pathSegments.join('/');
  
  // 处理查询参数
  const queryParams = { ...req.query };
  delete queryParams.path; // 删除路由参数
  const queryString = new URLSearchParams(queryParams).toString();
  
  const url = API_BASE + targetPath + (queryString ? '?' + queryString : '');
  
  console.log('🔍 Proxying:', req.method, url);

  return new Promise((resolve, reject) => {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Cookie': req.headers.cookie || '',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        host: 'bdfz.xnykcxt.com:5002'
      },
      rejectUnauthorized: false
    };

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

      proxyRes.on('end', () => {
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      console.error('❌ Proxy error:', err.message);
      res.status(500).json({ error: err.message });
      resolve();
    });

    // 🔥 关键修复: 使用 req.body 而不是 req.pipe()
    if (req.method === 'POST' || req.method === 'PUT') {
      // Vercel 默认会解析 body,但我们禁用了 bodyParser
      // 所以需要手动读取 raw body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        if (body) {
          proxyReq.write(body);
        }
        proxyReq.end();
      });
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
