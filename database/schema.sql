-- Usuários. A senha é guardada como hash (scrypt + salt), nunca em texto puro.
CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  meta_livros INTEGER NOT NULL DEFAULT 12,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessões de login (só o hash do token fica no banco).
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em  TEXT NOT NULL
);

-- Livros de cada usuário (o CRUD principal).
CREATE TABLE IF NOT EXISTS livros (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  autor         TEXT NOT NULL,
  genero        TEXT NOT NULL,
  paginas       INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('quero_ler','lendo','lido')),
  nota          INTEGER CHECK (nota BETWEEN 1 AND 5),
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
