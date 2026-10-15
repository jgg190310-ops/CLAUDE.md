/* Drink — onde fica o servidor (Supabase). Preencha com os dados do projeto: no supabase.com, abra o projeto e vá em
   Project Settings > API. "url" é o Project URL e "chave" é a chave "anon public" (ela pode ficar aqui: o banco só
   deixa o app ENVIAR cadastros e relatos; ler e aprovar só a equipe, no painel). Vazio = o app funciona sem servidor,
   como antes (os documentos do motorista ficam só no celular dele). */
window.DRINK_SERVIDOR = {
  url: '',
  chave: '',
};

/* A chave pública do Drink: com ela, o app só deixa ficar online (e o passageiro só aceita) o motorista que o Drink
   autorizou, mesmo sem o servidor. Quem autoriza é o painel (drink/admin/autorizar.html), com a chave privada, que
   fica só com o dono do Drink. Vazio = sem essa trava. */
window.DRINK_AUTORIZACAO = {
  x: 'kxpP-ZF88nj1yMz2VFHA9PnzeUL3e7ZROx_pw7o5EU0',
  y: 'rYY4aRRh6bTxbgssNW-lxkJzOpM4sZKN_ROnOQGJzCg',
};
