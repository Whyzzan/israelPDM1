// CRUD de livros: cadastrar, listar, editar e excluir.
const $ = (id) => document.getElementById(id);
let livros = [];
montarMenu('livros');

function atualizarNota() {
  const lido = $('status').value === 'lido';
  $('nota').disabled = !lido;
  if (!lido) $('nota').value = '';
}
$('status').addEventListener('change', atualizarNota);
$('filtro').addEventListener('change', desenhar);

function limparForm() {
  $('formLivro').reset(); $('id').value = '';
  $('tituloForm').textContent = 'Cadastrar livro';
  $('salvar').textContent = 'Salvar livro'; $('cancelar').hidden = true;
  atualizarNota();
}
$('cancelar').onclick = () => { limparForm(); aviso(''); };

function editar(l) {
  $('id').value = l.id; $('titulo').value = l.titulo; $('autor').value = l.autor;
  $('genero').value = l.genero; $('paginas').value = l.paginas; $('status').value = l.status;
  atualizarNota(); $('nota').value = l.nota || '';
  $('tituloForm').textContent = 'Editar livro';
  $('salvar').textContent = 'Salvar alterações'; $('cancelar').hidden = false;
  aviso(''); window.scrollTo({ top: 0, behavior: 'smooth' }); $('titulo').focus();
}

async function excluir(l) {
  if (!confirm(`Excluir "${l.titulo}"?`)) return;
  try { await api('/api/livros/' + l.id, 'DELETE'); if ($('id').value == l.id) limparForm(); await carregar(); aviso('Livro excluído.', 'ok'); }
  catch (e) { aviso(e.message); }
}

function desenhar() {
  const filtro = $('filtro').value;
  const lista = livros.filter((l) => !filtro || l.status === filtro);
  const area = $('lista'); area.replaceChildren();
  if (!lista.length) { area.append(el('p', 'vazio', livros.length ? 'Nenhum livro com esse status.' : 'Nenhum livro cadastrado ainda. Use o formulário acima.')); return; }
  for (const l of lista) {
    const c = el('article', 'livro');
    c.append(el('h3', '', l.titulo), el('small', '', `${l.autor} · ${l.genero} · ${l.paginas} págs.`),
      el('span', 'selo ' + l.status, STATUS[l.status]));
    if (l.status === 'lido') c.append(el('span', 'estrelas', estrelas(l.nota)));
    const acoes = el('div', 'acoes');
    const bEd = el('button', 'btn sec', 'Editar'); bEd.type = 'button'; bEd.onclick = () => editar(l);
    const bEx = el('button', 'btn perigo', 'Excluir'); bEx.type = 'button'; bEx.onclick = () => excluir(l);
    acoes.append(bEd, bEx); c.append(acoes); area.append(c);
  }
}

async function carregar() { livros = await api('/api/livros'); desenhar(); }

$('formLivro').addEventListener('submit', async (e) => {
  e.preventDefault(); aviso('');
  const dados = {
    titulo: $('titulo').value, autor: $('autor').value, genero: $('genero').value,
    paginas: $('paginas').value, status: $('status').value, nota: $('nota').value
  };
  try {
    const id = $('id').value;
    if (id) await api('/api/livros/' + id, 'PUT', dados); else await api('/api/livros', 'POST', dados);
    limparForm(); await carregar(); aviso(id ? 'Livro atualizado.' : 'Livro cadastrado.', 'ok');
  } catch (erro) { aviso(erro.message); }
});

(async () => {
  try {
    const generos = await api('/api/generos');
    for (const g of generos) { const o = el('option', '', g); o.value = g; $('genero').append(o); }
    await carregar();
  } catch (e) { aviso(e.message); }
})();
