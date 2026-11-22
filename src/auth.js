// Senhas (hash scrypt) e sessões por cookie.
const crypto = require('node:crypto');
const db = require('./db');

const DIAS = 7;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

function gerarHash(senha) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${crypto.scryptSync(senha, salt, 64).toString('hex')}`;
}

function conferir(senha, guardado) {
  const [salt, hash] = guardado.split(':');
  const esperado = Buffer.from(hash, 'hex');
  const calculado = crypto.scryptSync(senha, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(esperado, calculado);
}

function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + DIAS * 86400000).toISOString();
  db.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)').run(sha(token), usuarioId, expira);
  return token;
}

function lerToken(req) {
  const m = /(?:^|;\s*)sessao=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}

// Devolve o usuário logado (ou null).
function obterUsuario(req) {
  const token = lerToken(req);
  if (!token) return null;
  return db.prepare(
    `SELECT u.id, u.nome, u.email, u.meta_livros, u.criado_em
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_em > ?`
  ).get(sha(token), new Date().toISOString()) || null;
}

function encerrarSessao(req) {
  const token = lerToken(req);
  if (token) db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(sha(token));
}

const cookieSessao = (token, https) =>
  `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DIAS * 86400}${https ? '; Secure' : ''}`;
const COOKIE_LIMPO = 'sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';

module.exports = { gerarHash, conferir, criarSessao, obterUsuario, encerrarSessao, cookieSessao, COOKIE_LIMPO };
