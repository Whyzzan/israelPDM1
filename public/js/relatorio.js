// Relatório: dados do usuário + indicadores vindos de GET /api/relatorio.
const $ = (id) => document.getElementById(id);
montarMenu('relatorio');
$('imprimir').onclick = () => window.print();

function campo(rotulo, valor) { $('dadosUsuario').append(el('dt', '', rotulo), el('dd', '', valor)); }

(async () => {
  try {
    const { usuario: u, resumo: r, generos, livros } = await api('/api/relatorio');

    campo('Nome', u.nome); campo('E-mail', u.email);
    campo('Cadastrado em', dataBR(u.criado_em)); campo('Meta de livros', String(u.meta_livros));

    const pct = Math.min(100, Math.round((r.lidos / u.meta_livros) * 100));
    $('textoMeta').textContent = `${r.lidos} de ${u.meta_livros} livros lidos (${pct}%)`;
    $('barraMeta').style.width = pct + '%';

    const numeros = [[r.total, 'Cadastrados'], [r.lidos, 'Lidos'], [r.lendo, 'Lendo'], [r.quero_ler, 'Quero ler'],
    [r.paginas_lidas, 'Páginas lidas'], [r.nota_media ?? '—', 'Nota média']];
    for (const [n, rotulo] of numeros) { const d = el('div', 'numero'); d.append(el('b', '', String(n)), el('span', '', rotulo)); $('numeros').append(d); }

    if (!generos.length) $('generos').append(el('p', 'vazio', 'Cadastre livros para ver o gráfico.'));
    const maximo = Math.max(1, ...generos.map((g) => g.qtd));
    for (const g of generos) {
      const linha = el('div', 'genero'), barra = el('div', 'barra'), i = document.createElement('i');
      i.style.width = (g.qtd / maximo) * 100 + '%'; barra.append(i);
      linha.append(el('span', '', g.genero), barra, el('b', '', String(g.qtd))); $('generos').append(linha);
    }

    if (!livros.length) $('livros').append(el('p', 'vazio', 'Nenhum livro cadastrado.'));
    for (const l of livros) {
      const item = el('div', 'item');
      item.append(el('b', '', l.titulo),
        el('small', '', `${l.autor} · ${l.genero} · ${l.paginas} págs. · ${STATUS[l.status]}${l.status === 'lido' ? ' · ' + estrelas(l.nota) : ''}`),
        el('small', '', 'Cadastrado em ' + dataBR(l.criado_em)));
      $('livros').append(item);
    }
  } catch (e) { aviso(e.message); }
})();
