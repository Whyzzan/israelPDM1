// Login e criação de conta (a mesma lógica atende as duas páginas).
const $ = (id) => document.getElementById(id);

const formLogin = $('formLogin');
if (formLogin) formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); aviso('');
  try {
    await api('/api/auth/login', 'POST', { email: $('email').value, senha: $('senha').value });
    location.href = '/livros.html';
  } catch (erro) { aviso(erro.message); }
});

const formRegistro = $('formRegistro');
if (formRegistro) formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault(); aviso('');
  if ($('senha').value !== $('senha2').value) return aviso('As senhas não conferem.');
  try {
    await api('/api/auth/registro', 'POST', {
      nome: $('nome').value, email: $('email').value, senha: $('senha').value, meta_livros: $('meta').value,
    });
    location.href = '/relatorio.html'; // mostra os dados do usuário recém-cadastrado
  } catch (erro) { aviso(erro.message); }
});
