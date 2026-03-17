const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

function handleProxy(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  // Notion API proxy
  if (pathname === '/api/notion' && req.method === 'POST') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(Buffer.concat(body).toString());
        
        const options = {
          hostname: 'api.notion.com',
          path: '/v1/pages',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + data.token,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          }
        };
        
        const postData = JSON.stringify({
          parent: { database_id: data.dbId },
          properties: {
            'Name': { title: [{ text: { content: (data.title || '').substring(0, 100) } }] },
            'Subreddit': { rich_text: [{ text: { content: data.subreddit || '' } }] },
            'URL': { url: data.url || '' },
            'Score': { number: data.score || 0 },
            'Problem': { rich_text: [{ text: { content: (data.problem || '').substring(0, 2000) } }] },
            'Workaround': { rich_text: [{ text: { content: (data.workaround || '').substring(0, 2000) } }] },
            'AI Score': { number: data.aiScore || 0 },
            'Status': { select: { name: 'New' } }
          }
        });
        
        const proxyReq = https.request(options, (proxyRes) => {
          let responseData = '';
          proxyRes.on('data', chunk => responseData += chunk);
          proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(responseData);
          });
        });
        
        proxyReq.on('error', (e) => {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        });
        
        proxyReq.write(postData);
        proxyReq.end();
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }
  
  // Reddit API proxy
  if (pathname.startsWith('/api/reddit/')) {
    const target = pathname.replace('/api/reddit/', '');
    const targetUrl = target.includes('.json') 
      ? `https://www.reddit.com/${target}`
      : `https://www.reddit.com/r/${target}/new.json?limit=25`;
    
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return true;
  }
  
  // Reddit user API proxy
  if (pathname.startsWith('/api/user/')) {
    const username = pathname.replace('/api/user/', '').replace('/about.json', '');
    const targetUrl = `https://www.reddit.com/user/${username}/about.json`;
    
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return true;
  }
  
  return false;
}

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  if (handleProxy(req, res)) return;
  
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'popup.html' : req.url);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + req.url);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('===========================================');
  console.log('Pain Point Scanner - Local Server');
  console.log('===========================================');
  console.log('Server:       http://localhost:' + PORT);
  console.log('Notion Proxy: http://localhost:' + PORT + '/api/notion');
  console.log('Reddit Proxy: http://localhost:' + PORT + '/api/reddit/[subreddit]');
  console.log('===========================================');
});
