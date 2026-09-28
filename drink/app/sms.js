/* Drink — SMS de verdade no cadastro, pelo Firebase (Google): o código de 6 números chega no app de
   mensagens do celular. Liga quando a configuração do projeto do Firebase está em servicos.js (cfg.firebase);
   sem ela, o código de 4 números chega como notificação neste celular (avisos.js). */
(function () {
  'use strict';

  const { cfg } = window.Drink.servicos;
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
  const ativo = () => Boolean(cfg.firebase && cfg.firebase.apiKey);

  let pronto = null;
  let verificador = null;
  let confirmacao = null;

  function script(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => falha(Object.assign(new Error('sem internet'), { code: 'auth/network-request-failed' }));
      document.head.appendChild(s);
    });
  }
  function carregar() {
    if (!pronto) {
      pronto = script(`${SDK}/firebase-app-compat.js`)
        .then(() => script(`${SDK}/firebase-auth-compat.js`))
        .then(() => {
          const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg.firebase);
          const auth = app.auth();
          auth.languageCode = 'pt-BR';
          return auth;
        })
        .catch((e) => { pronto = null; throw e; });
    }
    return pronto;
  }

  const MOTIVOS = {
    'auth/invalid-phone-number': 'Esse número não parece um celular. Confere o DDD e o 9 do começo.',
    'auth/missing-phone-number': 'Coloca o número do celular com DDD.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espera uns minutos e tenta de novo.',
    'auth/quota-exceeded': 'Acabou o limite de SMS de hoje. Tenta amanhã.',
    'auth/captcha-check-failed': 'O site ainda não foi liberado para mandar SMS.',
    'auth/unauthorized-domain': 'O site ainda não foi liberado para mandar SMS.',
    'auth/invalid-app-credential': 'O site ainda não foi liberado para mandar SMS.',
    'auth/operation-not-allowed': 'O envio de SMS ainda não foi ligado no Firebase.',
    'auth/billing-not-enabled': 'O envio de SMS ainda não foi ligado no Firebase.',
    'auth/network-request-failed': 'Sem internet agora. Confere a conexão e tenta de novo.',
    'auth/invalid-verification-code': 'Código errado. Confere no SMS e tenta de novo.',
    'auth/code-expired': 'Esse código venceu. Toca em Reenviar código.',
    'auth/session-expired': 'Esse código venceu. Toca em Reenviar código.',
  };
  const explicar = (e) => MOTIVOS[(e && e.code) || ''] || 'Não deu pra mandar o SMS agora. Tenta de novo daqui a pouco.';

  // manda o SMS; a verificação de robô do Google fica invisível
  async function enviar(celular) {
    const auth = await carregar();
    if (verificador) { try { verificador.clear(); } catch (e) { /* já saiu */ } verificador = null; }
    const caixa = document.getElementById('en-recaptcha');
    caixa.textContent = '';
    const alvo = document.createElement('div');
    caixa.appendChild(alvo);
    verificador = new window.firebase.auth.RecaptchaVerifier(alvo, { size: 'invisible' });
    confirmacao = await auth.signInWithPhoneNumber(`+55${celular}`, verificador);
  }

  // confere o código digitado; devolve o identificador da pessoa no Firebase
  async function conferir(codigo) {
    if (!confirmacao) throw Object.assign(new Error('sem envio'), { code: 'auth/code-expired' });
    const r = await confirmacao.confirm(codigo);
    return r && r.user ? r.user.uid : null;
  }

  window.Drink.sms = { ativo, enviar, conferir, explicar, digitos: () => (ativo() ? 6 : 4) };
}());
