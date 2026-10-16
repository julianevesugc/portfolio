/* =========================================================
   js/auth.js
   Lógica de autenticação compartilhada (login.html e painel.html).
   Requer o Supabase carregado antes por CDN:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ========================================================= */

// Dados públicos do projeto Supabase (a chave anon pode ficar no front-end;
// quem protege os dados são as policies de RLS do setup.sql).
const SUPABASE_URL = 'https://rvoxatmgszofwbkwgcls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3hhdG1nc3pvZndia3dnY2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzE1NzgsImV4cCI6MjEwNjk0NzU3OH0.HViF4MgzGAHVHJjG9uQAWroywjDGxi_VYWrdt-aLKDM';

(function () {
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase não carregou. Confira o <script> da CDN antes de js/auth.js.');
    return;
  }

  // Cliente único, criado uma vez só e reaproveitado pelas páginas.
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Monta a URL de uma página irmã (funciona em subpastas, ex.: GitHub Pages).
  function urlDe(pagina) {
    return new URL(pagina, window.location.href).href;
  }

  // Login com e-mail e senha. Retorna o usuário ou lança um Error amigável.
  async function login(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (/email not confirmed/i.test(error.message)) {
        throw new Error('Confirme seu e-mail antes de entrar.');
      }
      throw new Error('Não foi possível entrar agora. Tente novamente.');
    }
    return data.user;
  }

  // Guarda das páginas protegidas: sem sessão, volta para o login.
  async function checkAuth() {
    const { data, error } = await sb.auth.getSession();
    const sessao = data && data.session;
    if (error || !sessao) {
      window.location.replace(urlDe('login.html'));
      return null;
    }
    return sessao.user;
  }

  // Apenas consulta a sessão, sem redirecionar (usado no login.html).
  async function sessaoAtual() {
    const { data } = await sb.auth.getSession();
    return (data && data.session) || null;
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      window.location.replace(urlDe('login.html'));
    }
  }

  // Envia o e-mail de redefinição. O link do e-mail volta para o login.html,
  // que mostra o formulário de nova senha.
  async function recuperarSenha(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: urlDe('login.html'),
    });
    if (error) throw new Error('Não foi possível enviar o e-mail. Tente novamente em instantes.');
    return true;
  }

  // Define a nova senha depois que o usuário chega pelo link de recuperação.
  async function atualizarSenha(novaSenha) {
    const { error } = await sb.auth.updateUser({ password: novaSenha });
    if (error) throw new Error('Não foi possível salvar a nova senha. Peça um novo link.');
    return true;
  }

  window.Auth = {
    sb,
    login,
    checkAuth,
    sessaoAtual,
    logout,
    recuperarSenha,
    atualizarSenha,
  };
})();
