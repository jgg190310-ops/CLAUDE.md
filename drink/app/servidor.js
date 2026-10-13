/* Drink — o servidor (Supabase): o cadastro do motorista vai para a equipe aprovar, e os relatos de problema ficam
   guardados para a equipe. Só funciona quando config-servidor.js (ou o ajuste de testes) tem a url e a chave; sem
   isso, nada sai do celular e o app funciona como antes. Fala com o Supabase direto pela API (sem biblioteca). */
(function () {
  const S = window.Drink.servicos;
  const conf = () => S.cfg.supabase || window.DRINK_SERVIDOR || {};
  const ligado = () => { const c = conf(); return Boolean(c && c.url && c.chave); };
  const raiz = () => String(conf().url).replace(/\/$/, '');
  const cab = (extra = {}) => ({ apikey: conf().chave, Authorization: `Bearer ${conf().chave}`, ...extra });
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

  async function sha256(txt) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function aleatorio(n = 24) {
    const b = crypto.getRandomValues(new Uint8Array(n));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  }));
  function erro(onde, r) { const e = new Error(`${onde} ${r.status}`); e.status = r.status; return e; }

  // um arquivo no bucket fechado "documentos", na pasta do cadastro
  async function subir(id, nome, blob) {
    const tipo = blob.type === 'image/jpg' ? 'image/jpeg' : blob.type;
    const ext = EXT[tipo];
    if (!ext) { const e = new Error('tipo'); e.tipo = tipo; throw e; }
    const caminho = `${id}/${nome}.${ext}`;
    const r = await fetch(`${raiz()}/storage/v1/object/documentos/${caminho}`, {
      method: 'POST', headers: cab({ 'Content-Type': tipo, 'x-upsert': 'false' }), body: blob,
    });
    if (!r.ok) throw erro('arquivo', r);
    return caminho;
  }

  // manda o cadastro inteiro: selfie, foto da CNH, certidão e os dados. Devolve o id e o segredo (que fica só no
  // celular: com ele o motorista consulta o próprio resultado; o servidor guarda só o resumo dele)
  async function enviarCadastro(dados, arquivos) {
    const id = uuid();
    const segredo = aleatorio();
    const selfie = await subir(id, 'selfie', arquivos.selfie);
    const cnhFoto = arquivos.cnh ? await subir(id, 'cnh', arquivos.cnh) : null;
    const antecedentes = arquivos.antecedentes ? await subir(id, 'antecedentes', arquivos.antecedentes) : null;
    const r = await fetch(`${raiz()}/rest/v1/motoristas_cadastro`, {
      method: 'POST', headers: cab({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ id, ...dados, selfie, cnh_foto: cnhFoto, antecedentes, segredo_hash: await sha256(segredo) }),
    });
    if (!r.ok) throw erro('cadastro', r);
    return { id, segredo };
  }

  // o resultado da análise: em_analise, aprovado ou recusado (com o motivo)
  async function status(v) {
    if (!v || !v.id || !v.segredo) return null;
    const r = await fetch(`${raiz()}/rest/v1/rpc/status_cadastro`, {
      method: 'POST', headers: cab({ 'Content-Type': 'application/json' }), body: JSON.stringify({ p_id: v.id, p_segredo: v.segredo }),
    });
    if (!r.ok) throw erro('status', r);
    const l = await r.json();
    return Array.isArray(l) && l[0] ? l[0] : null;
  }

  async function relato(obj) {
    const r = await fetch(`${raiz()}/rest/v1/relatos`, {
      method: 'POST', headers: cab({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify(obj),
    });
    if (!r.ok) throw erro('relato', r);
  }

  // a volta de um bar parceiro, confirmada por quem dirigiu (só motorista aprovado): é ela que libera o benefício
  async function confirmarVolta(v, volta) {
    if (!v || !v.id || !v.segredo) return false;
    const r = await fetch(`${raiz()}/rest/v1/rpc/confirmar_volta`, {
      method: 'POST', headers: cab({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_id: v.id, p_segredo: v.segredo, p_bar: volta.bar, p_corrida: volta.corrida, p_cupom: volta.cupom }),
    });
    if (!r.ok) throw erro('volta', r);
    return (await r.json()) === true;
  }
  // o bar confere o código do recibo: 'vale' (e já fica usado), 'usado', 'nao' ou 'segredo' (outro aparelho é o dono)
  async function conferirVolta(bar, segredo, cupom) {
    const r = await fetch(`${raiz()}/rest/v1/rpc/conferir_volta`, {
      method: 'POST', headers: cab({ 'Content-Type': 'application/json' }), body: JSON.stringify({ p_bar: bar, p_segredo: segredo, p_cupom: cupom }),
    });
    if (!r.ok) throw erro('conferir', r);
    const l = await r.json();
    return Array.isArray(l) && l[0] ? l[0] : null;
  }

  window.Drink.servidor = { ligado, enviarCadastro, status, relato, sha256, confirmarVolta, conferirVolta };
}());
