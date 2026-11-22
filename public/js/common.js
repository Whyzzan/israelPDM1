// Funções usadas por várias páginas.
const STATUS = { quero_ler: 'Quero ler', lendo: 'Lendo', lido: 'Lido' };

// Chama a API e devolve o JSON; lança Error com a mensagem do servidor se falhar.
async function api(url, metodo = 'GET', corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    credentials: 'same-origin',
  });
  let dados = {};
  try { dados = await r.json(); } catch { /* sem corpo */ }
  if (r.status === 401 && !/login|registro/.test(location.pathname)) location.href = '/login.html';
  if (!r.ok) throw new Error(dados.erro || 'Erro inesperado. Tente novamente.');
  return dados;
}

// O banco guarda datas em UTC ("2026-11-22 14:30:00").
const dataBR = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
const estrelas = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : 'sem nota');

function aviso(msg, tipo = 'erro') {
  const el = document.getElementById('aviso');
  el.textContent = msg; el.className = 'aviso ' + tipo; el.hidden = !msg;
}

// Cria um elemento com texto (textContent evita injeção de HTML).
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// Menu superior das páginas internas.
function montarMenu(ativo) {
  const topo = document.createElement('header');
  topo.className = 'topo';
  topo.innerHTML = '<strong>📚 Minha Estante</strong><nav>' +
    `<a href="/livros.html"${ativo === 'livros' ? ' class="ativo"' : ''}>Livros</a>` +
    `<a href="/relatorio.html"${ativo === 'relatorio' ? ' class="ativo"' : ''}>Relatório</a>` +
    '<button type="button" id="sair">Sair</button></nav>';
  document.body.prepend(topo);
  document.getElementById('sair').onclick = async () => {
    await api('/api/auth/logout', 'POST').catch(() => { });
    location.href = '/login.html';
  };
}
