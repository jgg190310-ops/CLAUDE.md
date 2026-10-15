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

/* O Google (o mesmo mapa e os mesmos endereços que o pessoal conhece da Uber): com a chave, o mapa, a busca, o
   endereço de onde a pessoa está e a rota passam a ser do Google. A chave é do Google Cloud (console.cloud.google.com),
   com as APIs Maps JavaScript, Places (New), Geocoding e Routes ligadas, e restrita ao site do Drink (ela fica à vista
   no site, como em todo site com mapa do Google: a restrição é que impede outro site de usar). Passo a passo em
   drink/servidor/LEIA-ME.md. Vazio = o app segue no OpenStreetMap, como antes. */
window.DRINK_GOOGLE = {
  chave: '',
};
