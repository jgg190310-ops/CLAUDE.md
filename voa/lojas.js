/*
  Lojas da VOA
  ============
  Por enquanto nenhuma loja está cadastrada: a lista no fim do arquivo está vazia de propósito.

  Para cadastrar uma loja, copie o exemplo abaixo para dentro dos colchetes de
  window.VOA_LOJAS e preencha. A loja entra sozinha nos setores certos:

    Shopping ............. quando tipo = 'shopping'
    Lojas de rua ......... quando tipo = 'rua'
    Troca de presente .... quando a loja tem o campo `troca`
    Última hora .......... quando a loja tem o campo `ultimaHora`

  Exemplo:

  {
    id: 'livraria-exemplo',
    nome: 'Livraria Exemplo',
    categoria: 'livraria',          // moda, calcados, beleza, eletronicos, casa, livraria,
                                    // brinquedos, esportes, joias, chocolates, flores, bebidas
    tipo: 'shopping',               // 'shopping' ou 'rua'

    shopping: 'Shopping Exemplo',   // só para tipo 'shopping'
    piso: 'L2',
    numero: '214',

    endereco: 'Rua Exemplo, 123',   // só para tipo 'rua'
    bairro: 'Centro',
    cidade: 'São Paulo',

    horario: {                      // 'HH:MM-HH:MM'; deixe o dia de fora se a loja fecha
      seg: '10:00-22:00', ter: '10:00-22:00', qua: '10:00-22:00', qui: '10:00-22:00',
      sex: '10:00-22:00', sab: '10:00-22:00', dom: '14:00-20:00'
    },

    precoMin: 30,                   // presente mais barato, em reais
    embrulho: true,                 // embrulha para presente
    entrega: true,                  // faz entrega
    estacionamento: false,

    troca: { prazoDias: 30, semNota: false, qualquerUnidade: true, online: false },
    ultimaHora: { entregaHoje: true, retirada1h: true },

    telefone: '(11) 0000-0000',
    instagram: '@livrariaexemplo',
    site: 'https://exemplo.com.br'
  }
*/
window.VOA_LOJAS = [];
