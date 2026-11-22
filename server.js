// Servidor HTTP: entrega os arquivos de /public e encaminha /api/* para src/api.js.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { tratarApi } = require('./src/api');
const { obterUsuario } = require('./src/auth');

const PUBLIC = path.join(__dirname, 'public');
const PORTA = Number(process.env.PORT) || 3000;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/manifest+json',
};
const PROTEGIDAS = new Set(['/livros.html', '/relatorio.html']); // exigem login
const DE_ENTRADA = new Set(['/login.html', '/registro.html']);   // só para quem ainda não entrou

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (url.pathname.startsWith('/api/')) return tratarApi(req, res, url);
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }

  const rota = url.pathname === '/' ? '/livros.html' : decodeURIComponent(url.pathname);
  const logado = !!obterUsuario(req);
  if (PROTEGIDAS.has(rota) && !logado) { res.writeHead(302, { Location: '/login.html' }); return res.end(); }
  if (DE_ENTRADA.has(rota) && logado) { res.writeHead(302, { Location: '/livros.html' }); return res.end(); }

  const arquivo = path.normalize(path.join(PUBLIC, rota));
  if (!arquivo.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); } // anti path traversal
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Página não encontrada'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  });
}).listen(PORTA, () => console.log(`Minha Estante rodando em http://localhost:${PORTA}`));
