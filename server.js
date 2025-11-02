/**
 * Optional CORS proxy for local LLM servers that don't support CORS
 * Only needed if browser shows CORS errors when connecting to localhost
 *
 * Usage: node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const LLM_ENDPOINT = 'http://localhost:1234';

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve index.html
    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading page');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // Proxy LLM requests
    if (req.method === 'POST' && req.url.startsWith('/v1/')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                hostname: 'localhost',
                port: 1234,
                path: req.url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const proxyReq = http.request(options, proxyRes => {
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'],
                    'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res);
            });

            proxyReq.on('error', err => {
                console.error('Proxy error:', err.message);
                res.writeHead(502);
                res.end(JSON.stringify({ error: 'Failed to connect to LLM server' }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🌟 Cosmic Chat Server Running`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📡 Local:     http://localhost:${PORT}`);
    console.log(`🤖 LLM Proxy: ${LLM_ENDPOINT}`);
    console.log(`\n💡 Tip: If your LLM server supports CORS,`);
    console.log(`   you can open index.html directly!\n`);
});
