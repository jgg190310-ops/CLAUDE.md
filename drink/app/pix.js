/* Drink — Pix de verdade: o código "copia e cola" (BR Code, padrão EMV do Banco Central) e o QR code,
   feitos no aparelho a partir da chave Pix do motorista. O dinheiro vai direto para ele. */
(function () {
  'use strict';

  const TIPOS = {
    cpf: { nome: 'CPF', exemplo: '123.456.789-09', teclado: 'numeric' },
    celular: { nome: 'Celular', exemplo: '(31) 99876-5432', teclado: 'tel' },
    email: { nome: 'E-mail', exemplo: 'voce@email.com', teclado: 'email' },
    cnpj: { nome: 'CNPJ', exemplo: '12.345.678/0001-90', teclado: 'numeric' },
    aleatoria: { nome: 'Chave aleatória', exemplo: '123e4567-e89b-12d3-a456-426614174000', teclado: 'text' },
  };

  const digitos = (s) => String(s).replace(/\D/g, '');
  function cpfValido(c) {
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    const dv = (n) => {
      let s = 0;
      for (let i = 0; i < n; i += 1) s += Number(c[i]) * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  }
  function cnpjValido(c) {
    if (!/^\d{14}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
    const dv = (n) => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = pesos.reduce((acc, p, i) => acc + p * Number(c[i]), 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
  }

  // confere e deixa a chave no formato que o Pix espera; devolve { chave } ou { erro }
  function normalizarChave(tipo, valor) {
    const v = String(valor || '').trim();
    if (tipo === 'cpf') {
      const d = digitos(v);
      return cpfValido(d) ? { chave: d } : { erro: 'Esse CPF não confere. Olha os números de novo.' };
    }
    if (tipo === 'cnpj') {
      const d = digitos(v);
      return cnpjValido(d) ? { chave: d } : { erro: 'Esse CNPJ não confere. Olha os números de novo.' };
    }
    if (tipo === 'celular') {
      let d = digitos(v);
      if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
      return /^[1-9][1-9]9\d{8}$/.test(d) ? { chave: `+55${d}` } : { erro: 'Coloca o celular com DDD, com o 9 na frente.' };
    }
    if (tipo === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 77 ? { chave: v.toLowerCase() } : { erro: 'Esse e-mail parece incompleto.' };
    }
    if (tipo === 'aleatoria') {
      const k = v.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(k) ? { chave: k } : { erro: 'A chave aleatória tem 32 letras e números, com tracinhos.' };
    }
    return { erro: 'Escolhe o tipo da chave.' };
  }

  // chave com o meio escondido, para mostrar na tela
  function mascarar(chave) {
    if (!chave) return '';
    if (chave.includes('@')) {
      const [u, d] = chave.split('@');
      return `${u.slice(0, 2)}•••@${d}`;
    }
    if (chave.startsWith('+55')) return `(${chave.slice(3, 5)}) •••••-${chave.slice(-4)}`;
    if (/^\d{11}$/.test(chave)) return `•••.${chave.slice(3, 6)}.•••-${chave.slice(-2)}`;
    if (/^\d{14}$/.test(chave)) return `${chave.slice(0, 2)}.•••.•••/${chave.slice(8, 12)}-••`;
    return `${chave.slice(0, 8)}…${chave.slice(-4)}`;
  }

  /* ---------- BR Code ---------- */
  const ascii = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;
  function crc16(txt) {
    let crc = 0xFFFF;
    for (let i = 0; i < txt.length; i += 1) {
      crc ^= txt.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function copiaECola({ chave, nome, cidade = 'BELO HORIZONTE', valor, descricao = 'Corrida Drink', txid = '***' }) {
    const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave) + (descricao ? campo('02', ascii(descricao, 40)) : '');
    const corpo = campo('00', '01')
      + campo('26', conta)
      + campo('52', '0000')
      + campo('53', '986')
      + (valor ? campo('54', Number(valor).toFixed(2)) : '')
      + campo('58', 'BR')
      + campo('59', ascii(nome, 25) || 'MOTORISTA DRINK')
      + campo('60', ascii(cidade, 15) || 'BELO HORIZONTE')
      + campo('62', campo('05', txid))
      + '6304';
    return corpo + crc16(corpo);
  }

  /* ---------- QR code em SVG ---------- */
  function qrSvg(texto) {
    const q = qrcode(0, 'M');
    q.addData(texto);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y += 1) {
      let x = 0;
      while (x < n) {
        if (q.isDark(y, x)) {
          const ini = x;
          while (x < n && q.isDark(y, x)) x += 1;
          d += `M${ini} ${y}h${x - ini}v1h-${x - ini}z`;
        } else x += 1;
      }
    }
    return `<svg viewBox="-4 -4 ${n + 8} ${n + 8}" role="img" aria-label="QR code do Pix" shape-rendering="crispEdges"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#FFFFFF"/><path d="${d}" fill="#0E0D12"/></svg>`;
  }

  window.Drink.pix = { TIPOS, normalizarChave, mascarar, copiaECola, crc16, qrSvg, cpfValido };
}());
