/* =========================================================
   Camada de dados — IndexedDB + cache em memória
   Cada entidade é uma "tabela" (object store) com id único.
   Estrutura pensada para migração futura a um banco central.
   ========================================================= */
(function () {
  const U = CRM.U;
  const NOME_BANCO = 'crm_i9tmg';
  const VERSAO_BANCO = 1;
  const SCHEMA_VERSION = 1;

  // Tabelas do sistema
  const STORES = {
    // cadastros mestres
    listas: 'Listas (segmentos, origens, etapas, status, motivos…)',
    usuarios: 'Vendedores e usuários',
    equipamentos: 'Equipamentos (catálogo STO)',
    clientes: 'Clientes',
    sedes: 'Sedes dos clientes',
    contatos: 'Contatos dos clientes',
    metas: 'Metas de vendas',
    // operacionais
    oportunidades: 'Oportunidades (funil)',
    propostas: 'Propostas (Comercial e CAPEX)',
    stos: 'STO',
    prospeccoes: 'Prospecções',
    atividades: 'Atividades (agenda)',
    contratos: 'Contratos',
    // sistema
    auditoria: 'Auditoria',
    config: 'Configurações',
  };
  const LOG_IGNORAR = new Set(['auditoria', 'config']);

  const DB = { STORES, SCHEMA_VERSION, d: {}, idx: {}, version: 0, pronto: false, erro: null };
  let idb = null;
  const ouvintes = new Set();

  function abrir() {
    return new Promise((ok, err) => {
      if (!window.indexedDB) return err(new Error('Este navegador não suporta IndexedDB.'));
      const req = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
      req.onupgradeneeded = () => {
        const db = req.result;
        Object.keys(STORES).forEach(s => {
          if (!db.objectStoreNames.contains(s)) {
            const os = db.createObjectStore(s, { keyPath: s === 'config' ? 'k' : 'id' });
            if (['propostas', 'oportunidades', 'stos', 'prospeccoes', 'atividades', 'contratos', 'sedes', 'contatos'].includes(s)) os.createIndex('clienteId', 'clienteId', { unique: false });
          }
        });
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => err(req.error);
      req.onblocked = () => err(new Error('O banco está aberto em outra aba com versão diferente. Feche as outras abas do CRM.'));
    });
  }
  const tx = (stores, modo) => idb.transaction(stores, modo);
  const prom = req => new Promise((ok, err) => { req.onsuccess = () => ok(req.result); req.onerror = () => err(req.error); });
  const fimTx = t => new Promise((ok, err) => { t.oncomplete = ok; t.onerror = () => err(t.error); t.onabort = () => err(t.error || new Error('Transação abortada')); });

  function indexar(store) {
    const m = new Map(); (DB.d[store] || []).forEach(r => m.set(store === 'config' ? r.k : r.id, r)); DB.idx[store] = m;
  }
  function notificar() { DB.version++; ouvintes.forEach(f => { try { f(DB.version); } catch (e) { console.error(e); } }); }
  function falha(e) { console.error(e); window.dispatchEvent(new CustomEvent('crm-erro', { detail: 'Falha ao salvar no armazenamento local: ' + (e && e.message || e) })); }

  DB.init = async function () {
    idb = await abrir();
    const nomes = Object.keys(STORES);
    const t = tx(nomes, 'readonly');
    const res = await Promise.all(nomes.map(s => prom(t.objectStore(s).getAll())));
    nomes.forEach((s, i) => { DB.d[s] = res[i] || []; indexar(s); });
    // pedido de armazenamento persistente (evita limpeza automática do navegador)
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* opcional */ }
    DB.pronto = true; notificar();
  };

  DB.vazio = () => !(DB.d.clientes || []).length && !(DB.d.propostas || []).length && !(DB.d.listas || []).length;
  DB.all = s => DB.d[s] || [];
  DB.get = (s, id) => (id ? DB.idx[s] && DB.idx[s].get(id) : undefined) || null;
  DB.usuarioAtual = () => DB.cfg('usuarioNome', '') || 'Usuário';

  function registrarAuditoria(store, rec, acao, resumo) {
    if (LOG_IGNORAR.has(store)) return;
    const a = { id: U.uid('aud'), store, registroId: rec.id, acao, resumo: resumo || '', usuario: DB.usuarioAtual(), data: U.agora() };
    DB.d.auditoria.push(a); DB.idx.auditoria.set(a.id, a);
    try { tx(['auditoria'], 'readwrite').objectStore('auditoria').put(a); } catch (e) { falha(e); }
  }

  /** Inclui ou atualiza um registro. Retorna o registro salvo. */
  DB.save = function (store, rec, opt = {}) {
    const novo = !rec.id || !DB.idx[store].has(rec.id);
    const r = { ...rec };
    if (!r.id) r.id = U.uid(store.slice(0, 3));
    const agora = U.agora();
    if (novo) r.criadoEm = r.criadoEm || agora;
    r.atualizadoEm = agora;
    if (store !== 'config') r.atualizadoPor = DB.usuarioAtual();
    const arr = DB.d[store];
    if (novo) arr.push(r); else { const i = arr.findIndex(x => x.id === r.id); arr[i] = r; }
    DB.idx[store].set(r.id, r);
    try { tx([store], 'readwrite').objectStore(store).put(r); } catch (e) { falha(e); }
    if (!opt.semAuditoria) registrarAuditoria(store, r, novo ? 'inclusão' : 'alteração', opt.resumo);
    if (!opt.silencioso) notificar();
    return r;
  };
  DB.saveMany = function (store, recs, opt = {}) {
    const out = recs.map(r => DB.save(store, r, { ...opt, silencioso: true }));
    notificar(); return out;
  };
  DB.remove = function (store, id, opt = {}) {
    const r = DB.get(store, id); if (!r) return;
    DB.d[store] = DB.d[store].filter(x => x.id !== id); DB.idx[store].delete(id);
    try { tx([store], 'readwrite').objectStore(store).delete(id); } catch (e) { falha(e); }
    registrarAuditoria(store, r, 'exclusão', opt.resumo);
    if (!opt.silencioso) notificar();
  };

  /* ---- Configurações (chave/valor) ---- */
  DB.cfg = (k, padrao) => { const r = DB.idx.config && DB.idx.config.get(k); return r ? r.v : padrao; };
  DB.setCfg = (k, v) => {
    const r = { k, v }; const arr = DB.d.config; const i = arr.findIndex(x => x.k === k);
    if (i >= 0) arr[i] = r; else arr.push(r); DB.idx.config.set(k, r);
    try { tx(['config'], 'readwrite').objectStore('config').put(r); } catch (e) { falha(e); }
    notificar();
  };

  /** Substitui todas as tabelas (restauração de backup / carga inicial). */
  DB.substituirTudo = async function (stores) {
    const nomes = Object.keys(STORES);
    const t = tx(nomes, 'readwrite');
    nomes.forEach(s => {
      const os = t.objectStore(s); os.clear();
      (stores[s] || []).forEach(r => os.put(r));
    });
    await fimTx(t);
    nomes.forEach(s => { DB.d[s] = (stores[s] || []).slice(); indexar(s); });
    notificar();
  };
  DB.apagarTudo = () => DB.substituirTudo({});

  /** Exporta todas as tabelas em um objeto de backup. */
  DB.exportar = () => ({
    sistema: 'CRM Comercial I9 TMG', schemaVersion: SCHEMA_VERSION, geradoEm: U.agora(), geradoPor: DB.usuarioAtual(),
    contagem: Object.fromEntries(Object.keys(STORES).map(s => [s, DB.all(s).length])),
    stores: Object.fromEntries(Object.keys(STORES).map(s => [s, DB.all(s)])),
  });

  /** Valida um arquivo de backup antes da restauração. */
  DB.validarBackup = obj => {
    const erros = [];
    if (!obj || typeof obj !== 'object' || !obj.stores) erros.push('Arquivo não contém a estrutura "stores" do CRM.');
    else {
      Object.keys(obj.stores).forEach(s => { if (!STORES[s]) erros.push('Tabela desconhecida: ' + s); else if (!Array.isArray(obj.stores[s])) erros.push('Tabela inválida: ' + s); });
      Object.keys(STORES).forEach(s => { (obj.stores[s] || []).forEach((r, i) => { if (!r || (s === 'config' ? !r.k : !r.id)) erros.push(`Registro sem identificador em ${s} (linha ${i + 1}).`); }); });
      if (obj.schemaVersion && obj.schemaVersion > SCHEMA_VERSION) erros.push('Backup gerado por uma versão mais nova do CRM.');
    }
    return erros.slice(0, 20);
  };

  /* ---- Reatividade para React ---- */
  DB.subscribe = f => { ouvintes.add(f); return () => ouvintes.delete(f); };
  DB.useDB = function () {
    const [, setV] = React.useState(DB.version);
    React.useEffect(() => DB.subscribe(v => setV(v)), []);
    return DB.version;
  };

  CRM.DB = DB;
})();
