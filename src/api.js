// API REST: /api/auth/* (conta), /api/livros (CRUD) e /api/relatorio.
// Todas as consultas SQL usam parâmetros (?), o que impede SQL injection.
const db = require('./db');
const auth = require('./auth');

const STATUS = ['quero_ler', 'lendo', 'lido'];
const GENEROS = ['Romance', 'Fantasia', 'Ficção científica', 'Terror', 'Biografia', 'Técnico', 'Autoajuda', 'História', 'Outro'];

function responder(res, status, dados, cabecalhos = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cabecalhos });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let texto = '';
    req.on('data', (c) => { texto += c; if (texto.length > 1e5) { falha(new Error('Corpo muito grande')); req.destroy(); } });
    req.on('end', () => { try { ok(texto ? JSON.parse(texto) : {}); } catch { falha(new Error('JSON inválido')); } });
  });
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// ---------- Validações ----------
function validarConta(d) {
  const nome = texto(d.nome), email = texto(d.email).toLowerCase();
  const senha = typeof d.senha === 'string' ? d.senha : '';
  const meta = Number(d.meta_livros === undefined || d.meta_livros === '' ? 12 : d.meta_livros);
  if (!nome) return { erro: 'Informe seu nome.' };
  if (nome.length > 100) return { erro: 'O nome deve ter no máximo 100 caracteres.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return { erro: 'Informe um e-mail válido.' };
  if (senha.length < 6 || senha.length > 100) return { erro: 'A senha deve ter de 6 a 100 caracteres.' };
  if (!Number.isInteger(meta) || meta < 1 || meta > 365) return { erro: 'A meta deve ser um número de 1 a 365.' };
  return { nome, email, senha, meta };
}

function validarLivro(d) {
  const titulo = texto(d.titulo), autor = texto(d.autor), genero = texto(d.genero), status = texto(d.status);
  const paginas = Number(d.paginas);
  if (!titulo) return { erro: 'Informe o título.' };
  if (titulo.length > 150) return { erro: 'O título deve ter no máximo 150 caracteres.' };
  if (!autor) return { erro: 'Informe o autor.' };
  if (autor.length > 100) return { erro: 'O autor deve ter no máximo 100 caracteres.' };
  if (!GENEROS.includes(genero)) return { erro: 'Escolha um gênero válido.' };
  if (!Number.isInteger(paginas) || paginas < 1 || paginas > 10000) return { erro: 'Páginas: informe um número de 1 a 10000.' };
  if (!STATUS.includes(status)) return { erro: 'Escolha um status válido.' };
  let nota = null;
  if (status === 'lido' && d.nota !== '' && d.nota != null) {
    nota = Number(d.nota);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { erro: 'A nota deve ser de 1 a 5.' };
  }
  return { titulo, autor, genero, paginas, status, nota };
}

// ---------- Limite de tentativas de login (10 erros / 15 min por IP) ----------
const tentativas = new Map();
const bloqueado = (ip) => { const t = tentativas.get(ip); return t && t.ate > Date.now() && t.n >= 10; };
function falhou(ip) {
  const t = tentativas.get(ip);
  if (!t || t.ate <= Date.now()) tentativas.set(ip, { n: 1, ate: Date.now() + 15 * 60000 });
  else t.n += 1;
}

// ---------- Rotas de conta ----------
async function rotasAuth(req, res, acao) {
  const ip = req.socket.remoteAddress || '?';
  const https = req.headers['x-forwarded-proto'] === 'https';

  if (acao === 'registro' && req.method === 'POST') {
    const v = validarConta(await lerCorpo(req));
    if (v.erro) return responder(res, 400, { erro: v.erro });
    if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(v.email)) return responder(res, 409, { erro: 'Já existe uma conta com esse e-mail.' });
    const r = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, meta_livros) VALUES (?, ?, ?, ?)')
      .run(v.nome, v.email, auth.gerarHash(v.senha), v.meta);
    const token = auth.criarSessao(Number(r.lastInsertRowid)); // já entra logado
    return responder(res, 201, { ok: true }, { 'Set-Cookie': auth.cookieSessao(token, https) });
  }

  if (acao === 'login' && req.method === 'POST') {
    if (bloqueado(ip)) return responder(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });
    const d = await lerCorpo(req);
    const email = texto(d.email).toLowerCase(), senha = typeof d.senha === 'string' ? d.senha : '';
    if (!email || !senha) return responder(res, 400, { erro: 'Informe e-mail e senha.' });
    const u = db.prepare('SELECT id, senha_hash FROM usuarios WHERE email = ?').get(email);
    if (!u || !auth.conferir(senha, u.senha_hash)) { falhou(ip); return responder(res, 400, { erro: 'E-mail ou senha incorretos.' }); }
    tentativas.delete(ip);
    return responder(res, 200, { ok: true }, { 'Set-Cookie': auth.cookieSessao(auth.criarSessao(u.id), https) });
  }

  if (acao === 'logout' && req.method === 'POST') {
    auth.encerrarSessao(req);
    return responder(res, 200, { ok: true }, { 'Set-Cookie': auth.COOKIE_LIMPO });
  }

  if (acao === 'eu' && req.method === 'GET') {
    const u = auth.obterUsuario(req);
    return u ? responder(res, 200, u) : responder(res, 401, { erro: 'Faça login para continuar.' });
  }
  return responder(res, 404, { erro: 'Rota não encontrada.' });
}

// ---------- Roteador principal ----------
async function tratarApi(req, res, url) {
  const partes = url.pathname.split('/').filter(Boolean); // ['api','livros','3']
  try {
    if (partes[1] === 'auth') return await rotasAuth(req, res, partes[2]);

    const usuario = auth.obterUsuario(req);
    if (!usuario) return responder(res, 401, { erro: 'Faça login para continuar.' });

    if (partes[1] === 'generos' && req.method === 'GET') return responder(res, 200, GENEROS);

    // READ (lista)
    if (partes[1] === 'livros' && partes.length === 2 && req.method === 'GET') {
      return responder(res, 200, db.prepare(
        'SELECT id, titulo, autor, genero, paginas, status, nota, criado_em FROM livros WHERE usuario_id = ? ORDER BY id DESC'
      ).all(usuario.id));
    }

    // CREATE
    if (partes[1] === 'livros' && partes.length === 2 && req.method === 'POST') {
      const v = validarLivro(await lerCorpo(req));
      if (v.erro) return responder(res, 400, { erro: v.erro });
      const r = db.prepare('INSERT INTO livros (usuario_id, titulo, autor, genero, paginas, status, nota) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(usuario.id, v.titulo, v.autor, v.genero, v.paginas, v.status, v.nota);
      return responder(res, 201, { id: Number(r.lastInsertRowid) });
    }

    // UPDATE e DELETE: /api/livros/:id
    if (partes[1] === 'livros' && partes.length === 3) {
      const id = Number(partes[2]);
      if (!Number.isInteger(id) || id < 1) return responder(res, 400, { erro: 'ID inválido.' });
      if (!db.prepare('SELECT id FROM livros WHERE id = ? AND usuario_id = ?').get(id, usuario.id)) return responder(res, 404, { erro: 'Livro não encontrado.' });

      if (req.method === 'PUT') {
        const v = validarLivro(await lerCorpo(req));
        if (v.erro) return responder(res, 400, { erro: v.erro });
        db.prepare("UPDATE livros SET titulo=?, autor=?, genero=?, paginas=?, status=?, nota=?, atualizado_em=datetime('now') WHERE id=? AND usuario_id=?")
          .run(v.titulo, v.autor, v.genero, v.paginas, v.status, v.nota, id, usuario.id);
        return responder(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') {
        db.prepare('DELETE FROM livros WHERE id = ? AND usuario_id = ?').run(id, usuario.id);
        return responder(res, 200, { ok: true });
      }
    }

    // RELATÓRIO: dados do usuário + indicadores calculados na hora
    if (partes[1] === 'relatorio' && req.method === 'GET') {
      const resumo = db.prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(status = 'lido'), 0) AS lidos,
                COALESCE(SUM(status = 'lendo'), 0) AS lendo,
                COALESCE(SUM(status = 'quero_ler'), 0) AS quero_ler,
                COALESCE(SUM(CASE WHEN status = 'lido' THEN paginas END), 0) AS paginas_lidas,
                ROUND(AVG(CASE WHEN status = 'lido' THEN nota END), 1) AS nota_media
           FROM livros WHERE usuario_id = ?`
      ).get(usuario.id);
      const generos = db.prepare('SELECT genero, COUNT(*) AS qtd FROM livros WHERE usuario_id = ? GROUP BY genero ORDER BY qtd DESC, genero').all(usuario.id);
      const livros = db.prepare('SELECT titulo, autor, genero, paginas, status, nota, criado_em FROM livros WHERE usuario_id = ? ORDER BY titulo COLLATE NOCASE').all(usuario.id);
      return responder(res, 200, { usuario, resumo, generos, livros });
    }

    return responder(res, 404, { erro: 'Rota não encontrada.' });
  } catch (e) {
    if (e.message === 'JSON inválido' || e.message === 'Corpo muito grande') return responder(res, 400, { erro: e.message });
    console.error(e);
    return responder(res, 500, { erro: 'Erro interno do servidor.' });
  }
}

module.exports = { tratarApi };
