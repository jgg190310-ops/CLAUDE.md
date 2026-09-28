/* Drink — o carro do passageiro: modelos que rodam no Brasil, as cores, e a placa (Mercosul ou a antiga, cinza),
   conferida no formato e desenhada como a de verdade para o motorista achar o carro na rua. */
(function () {
  'use strict';

  const MODELOS = {
    Chevrolet: 'Onix|Onix Plus|Prisma|Cobalt|Spin|Tracker|Cruze|Celta|Classic|Corsa|Agile|Montana|S10|Equinox|Trailblazer|Captiva|Astra|Vectra|Zafira|Meriva|Sonic|Spark EUV',
    Fiat: 'Uno|Mobi|Argo|Cronos|Palio|Siena|Grand Siena|Strada|Toro|Pulse|Fastback|Punto|Linea|Idea|Doblò|Fiorino|Bravo|Stilo|500|Palio Weekend|Titano',
    Volkswagen: 'Gol|Voyage|Fox|CrossFox|Polo|Virtus|T-Cross|Nivus|Taos|Tiguan|Jetta|Golf|Saveiro|Amarok|Up!|SpaceFox|Parati|Passat|Tera',
    Ford: 'Ka|Ka Sedan|Fiesta|Focus|EcoSport|Fusion|Ranger|Territory|Bronco Sport|Maverick|Edge|Courier',
    Hyundai: 'HB20|HB20S|HB20X|Creta|Tucson|ix35|Santa Fe|i30|Azera|Elantra|Kona',
    Toyota: 'Corolla|Corolla Cross|Yaris|Yaris Sedan|Etios|Etios Sedan|Hilux|SW4|RAV4|Camry|Prius',
    Honda: 'Civic|City|City Hatchback|Fit|HR-V|WR-V|CR-V|Accord|ZR-V',
    Renault: 'Sandero|Stepway|Logan|Kwid|Duster|Captur|Oroch|Clio|Mégane|Fluence|Symbol|Kardian|Boreal',
    Nissan: 'Kicks|Versa|March|Sentra|Frontier|Livina|Tiida',
    Jeep: 'Renegade|Compass|Commander|Wrangler|Cherokee',
    Peugeot: '208|2008|3008|207|206|308|408|5008|Partner',
    'Citroën': 'C3|C3 Aircross|C4 Cactus|C4 Lounge|Aircross|Basalt|Xsara Picasso',
    Mitsubishi: 'L200 Triton|Pajero|Pajero Sport|Outlander|ASX|Eclipse Cross|Lancer',
    Kia: 'Sportage|Cerato|Picanto|Soul|Sorento|Stonic|Niro',
    BYD: 'Dolphin|Dolphin Mini|Song Plus|Song Pro|Seal|Yuan Plus|King|Shark',
    'Caoa Chery': 'Tiggo 5x|Tiggo 7|Tiggo 8|Arrizo 6|QQ|Celer',
    GWM: 'Haval H6|Haval H9|Ora 03|Poer',
    BMW: '320i|X1|X3|X5|118i|iX1',
    'Mercedes-Benz': 'Classe A|Classe C|GLA|GLC|Classe E',
    Audi: 'A3|A4|Q3|Q5|Q7',
    Volvo: 'XC40|XC60|XC90|EX30',
    'Land Rover': 'Range Rover Evoque|Discovery Sport|Defender|Range Rover Velar',
    Suzuki: 'Jimny|Vitara|Swift|S-Cross',
    RAM: 'Rampage|1500|2500',
  };
  const LISTA = Object.entries(MODELOS).flatMap(([marca, txt]) => txt.split('|').map((modelo) => ({ marca, modelo })));
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // os modelos que batem com o que foi digitado: primeiro os que começam igual, depois os que contêm
  function buscar(texto, max = 6) {
    const t = semAcento(texto).replace(/\s+/g, ' ');
    if (!t) return [];
    // vale o começo do modelo, da marca ou de uma palavra do nome ("cross" acha T-Cross e Corolla Cross)
    const palavra = (txt) => txt.split(/[\s-]+/).some((w) => w.startsWith(t));
    const pontuar = ({ marca, modelo }) => {
      const m = semAcento(modelo);
      const tudo = `${semAcento(marca)} ${m}`;
      if (m === t) return 0;
      if (m.startsWith(t)) return 1;
      if (tudo.startsWith(t)) return 2;
      if (palavra(m)) return 3;
      if (t.length >= 4 && m.includes(t)) return 4;
      return 9;
    };
    return LISTA.map((c) => ({ ...c, p: pontuar(c) })).filter((c) => c.p < 9)
      .sort((a, b) => a.p - b.p || a.modelo.length - b.modelo.length).slice(0, max)
      .map(({ marca, modelo }) => ({ marca, modelo }));
  }
  // o modelo exato da lista, se o texto for um deles ("onix" vira Chevrolet Onix)
  function achar(texto) {
    const t = semAcento(texto);
    return LISTA.find((c) => semAcento(c.modelo) === t || semAcento(`${c.marca} ${c.modelo}`) === t) || null;
  }

  const CORES = [
    ['branco', '#F4F4F2'], ['preto', '#15151A'], ['prata', '#B9BEC6'], ['cinza', '#6B7079'], ['vermelho', '#C8252C'],
    ['azul', '#2447A8'], ['verde', '#2F6B3A'], ['bege', '#D8C7A3'], ['marrom', '#6A4630'], ['vinho', '#6B1E2E'],
    ['amarelo', '#F2C230'], ['laranja', '#E86A1E'], ['dourado', '#B8974A'],
  ];

  /* ---------- placa ---------- */
  const limparPlaca = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  const valida = (p) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p);
  const antiga = (p) => /^[A-Z]{3}[0-9]{4}$/.test(p);
  // placas de exemplo, que aparecem em propaganda e em formulário, não são de carro nenhum
  const EXEMPLOS = ['ABC1234', 'ABC1D23', 'BRA2E19', 'BRA0S17', 'AAA0000', 'AAA0A00', 'XXX0000', 'XXX0X00', 'ABC0000', 'ABC0A00'];
  function suspeita(p) {
    if (EXEMPLOS.includes(p)) return true;
    const letras = p.slice(0, 3);
    const numeros = p.slice(3).replace(/[A-Z]/g, '');
    return /^(.)\1\1$/.test(letras) && /^(.)\1+$/.test(numeros);
  }
  function conferir(texto) {
    const p = limparPlaca(texto);
    if (!p) return { erro: 'Coloca a placa do carro: é por ela que o motorista acha o seu carro na rua.' };
    if (p.length < 7) return { erro: 'Faltam letras ou números na placa. Ela tem 7: ABC1D23 (Mercosul) ou ABC-1234 (a antiga, cinza).' };
    if (!valida(p)) return { erro: 'Essa placa não existe nesse formato. Confere: 3 letras, 1 número, 1 letra ou número e mais 2 números.' };
    if (suspeita(p)) return { erro: 'Essa é placa de exemplo. Coloca a placa do seu carro.' };
    return { placa: p };
  }
  const formatar = (p) => (antiga(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p);
  // a placa desenhada: Mercosul (branca, faixa azul com BRASIL e a bandeira) ou a antiga (cinza)
  function html(p, classe = '') {
    const placa = limparPlaca(p);
    if (!placa) return '';
    const velha = antiga(placa);
    return `<span class="placa${velha ? ' placa-antiga' : ''}${classe ? ` ${classe}` : ''}" role="img" aria-label="Placa ${placa.split('').join(' ')}">`
      + (velha ? '' : '<span class="placa-faixa" aria-hidden="true"><b>BRASIL</b><i class="placa-bandeira"></i></span>')
      + `<span class="placa-num" aria-hidden="true">${formatar(placa)}</span></span>`;
  }

  // a placa enquanto é digitada: o que falta aparece apagado
  function previa(texto) {
    const p = limparPlaca(texto);
    if (!p) return '';
    const velha = p.length >= 5 && /[0-9]/.test(p[4]) && /^[A-Z]{3}[0-9]/.test(p);
    const chars = p.padEnd(7, ' ').split('').map((ch) => (ch === ' ' ? '<i class="placa-falta">0</i>' : ch));
    if (velha) chars.splice(3, 0, '-');
    return `<span class="placa placa-grande${velha ? ' placa-antiga' : ''}">`
      + (velha ? '' : '<span class="placa-faixa"><b>BRASIL</b><i class="placa-bandeira"></i></span>')
      + `<span class="placa-num">${chars.join('')}</span></span>`;
  }

  window.Drink.carros = { buscar, achar, CORES, placa: { limpar: limparPlaca, valida, antiga, conferir, formatar, html, previa } };
}());
