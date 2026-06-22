/* ════════════════════════════════════════════════════════════════════
   CONFIGURAÇÃO DO FIREBASE (login na mesma conta em qualquer dispositivo)

   Cole aqui o firebaseConfig do seu projeto e o login de e-mail/senha
   passa a funcionar igual no celular e no PC, automaticamente.

   Onde achar: console.firebase.google.com  >  (seu projeto)  >
   ⚙ Configurações do projeto  >  Seus apps  >  SDK do Firebase  >  Config.

   Enquanto estiver null, o app continua funcionando só localmente
   (cada aparelho com seus próprios dados).
   ════════════════════════════════════════════════════════════════════ */
window.DEFAULT_FB_CONFIG = null;

/* Quando tiver a chave, troque a linha acima por algo assim:

window.DEFAULT_FB_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  databaseURL: "https://SEU-PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU-PROJETO",
  appId: "1:1234567890:web:abcdef"
};
*/
