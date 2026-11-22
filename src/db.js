// Conexão com o SQLite (módulo nativo do Node.js 22+, não precisa instalar nada).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const arquivo = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'estante.db'));
fs.mkdirSync(path.dirname(arquivo), { recursive: true });

const db = new DatabaseSync(arquivo);
db.exec('PRAGMA foreign_keys = ON');
// Cria as tabelas automaticamente na primeira execução.
db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));

module.exports = db;
