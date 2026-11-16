/* =========================================================
   Regras de negócio, consultas e cálculos compartilhados
   ========================================================= */
(function () {
  const U = CRM.U, DB = CRM.DB;
  const R = {};

  /* ---------- Tipos de lista (cadastros simples) ---------- */
  R.TIPOS_LISTA = {
    segmento: { nome: 'Segmentos de mercado', extra: ['cor', 'margemMeta'] },
    produto: { nome: 'Produtos e serviços (tipos de proposta)' },
    origem: { nome: 'Origens do lead' },
    etapa: { nome: 'Etapas comerciais (funil)', extra: ['prob'] },
    statusProposta: { nome: 'Status da proposta', extra: ['resultado'] },
    statusElaboracao: { nome: 'Status da atividade (elaboração)' },
    statusCapex: { nome: 'Status da atividade CAPEX' },
    motivoPerda: { nome: 'Motivos de perda' },
    tipoAtividade: { nome: 'Tipos de atividade' },
    tipoVisita: { nome: 'Tipos de visita / contato' },
    statusProspeccao: { nome: 'Status de prospecção' },
    faixaValor: { nome: 'Faixas de valor', extra: ['min', 'max'] },
    categoriaContrato: { nome: 'Categorias de contrato' },
    itemAluguel: { nome: 'Itens de aluguel (STO)' },
    itemManutencao: { nome: 'Itens de manutenção (STO)' },
    tipoProjeto: { nome: 'Tipos de projeto (STO)' },
    tipoFrete: { nome: 'Tipos de frete (STO)' },
    tipoSede: { nome: 'Tipos de sede' },
    areaContato: { nome: 'Áreas do contato' },
    papelContato: { nome: 'Papéis do contato' },
  };
  R.CATEGORIAS_ATIVIDADE = ['Follow-up', 'Visita', 'Pós-venda', 'Tarefa', 'Lembrete'];
  R.PRIORIDADES = ['Alta', 'Média', 'Baixa'];
  R.STATUS_ATIVIDADE = ['A fazer', 'Feito', 'Cancelado'];
  R.RECORRENCIAS = ['Nenhuma', 'Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral'];
  R.STATUS_CLIENTE = ['Prospect', 'Ativo', 'Inativo'];
  R.SITUACOES_STO = ['Aberta', 'Em elaboração', 'Proposta emitida', 'Cancelada'];
  R.POTENCIAIS = ['Alto', 'Médio', 'Baixo'];
  R.NATUREZAS = ['Proposta efetiva', 'Consulta de preço'];
  R.MOEDAS = ['BRL', 'USD', 'EUR'];
  R.PAPEIS_USUARIO = ['Comercial', 'Gerente Comercial', 'Diretor', 'Engenharia', 'Administrativo'];
  R.ESCOPO_STO = [['eletrica', 'Elétrica e automação'], ['civil', 'Civil'], ['montagem', 'Montagem em campo'], ['icamento', 'Equip. de içamento'], ['pneumatica', 'Pneumática'], ['despoeiramento', 'Despoeiramento'], ['instrumentos', 'Instrumentos'], ['telhamento', 'Telhamento'], ['jateamento', 'Jateamento/pintura']];
  R.INFRA_OBRA = [['infraEletrica', 'Infra elétrica'], ['infraConteiner', 'Contêiner'], ['infraBanheiro', 'Banheiro'], ['infraVestiario', 'Vestiário'], ['infraRestaurante', 'Restaurante'], ['infraComiss', 'Teste e comissionamento']];

  /* ---------- Listas ---------- */
  R.lista = (tipo, incluirInativos) => DB.all('listas').filter(x => x.tipo === tipo && (incluirInativos || x.ativo !== false)).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || U.cmp(a.nome, b.nome));
  R.opts = (tipo, atualId) => R.lista(tipo, false).concat(atualId && !R.lista(tipo).some(x => x.id === atualId) && DB.get('listas', atualId) ? [DB.get('listas', atualId)] : []).map(x => ({ v: x.id, l: x.nome + (x.ativo === false ? ' (inativo)' : '') }));
  R.nomeLista = id => { if (id === 'nd') return 'Não detalhado'; const x = DB.get('listas', id); return x ? x.nome : ''; };
  R.idLista = (tipo, nome) => { const n = U.norm(nome); const x = DB.all('listas').find(l => l.tipo === tipo && U.norm(l.nome) === n); return x ? x.id : ''; };
  R.corSegmento = id => { const x = DB.get('listas', id); return (x && x.cor) || '#8A9AA6'; };

  /* ---------- Pessoas ---------- */
  R.usuarios = inativos => DB.all('usuarios').filter(u => inativos || u.ativo !== false).sort((a, b) => U.cmp(a.nome, b.nome));
  R.optsUsuarios = atualId => R.usuarios().concat(atualId && DB.get('usuarios', atualId) && DB.get('usuarios', atualId).ativo === false ? [DB.get('usuarios', atualId)] : []).map(u => ({ v: u.id, l: u.nome }));
  R.nomeUsuario = id => { const u = DB.get('usuarios', id); return u ? u.nome : ''; };
  R.curtoUsuario = id => { const n = R.nomeUsuario(id); return n ? n.split(' ')[0] + (n.split(' ').length > 1 ? ' ' + n.split(' ').slice(-1)[0][0] + '.' : '') : ''; };

  /* ---------- Clientes ---------- */
  R.cliente = id => DB.get('clientes', id);
  R.nomeCliente = id => { const c = DB.get('clientes', id); return c ? c.nomeFantasia || c.razaoSocial : ''; };
  R.optsClientes = (incluirInativos) => DB.all('clientes').filter(c => incluirInativos || c.status !== 'Inativo').sort((a, b) => U.cmp(a.nomeFantasia, b.nomeFantasia))
    .map(c => ({ v: c.id, l: c.nomeFantasia || c.razaoSocial, s: [c.codigo, c.cidade && c.cidade + '/' + c.uf].filter(Boolean).join(' · '), k: U.normTxt([c.nomeFantasia, c.razaoSocial, c.codigo, U.soDigitos(c.cnpj)].join(' ')) }));
  R.sede = id => DB.get('sedes', id);
  R.localSede = id => { const s = DB.get('sedes', id); return s ? [s.cidade, s.uf].filter(Boolean).join('/') : ''; };
  R.optsSedes = clienteId => (R.idx().sedesPorCliente[clienteId] || []).filter(s => s.ativo !== false).map(s => ({ v: s.id, l: s.nome + (s.cidade ? ' — ' + s.cidade + '/' + s.uf : '') }));
  R.optsContatos = (clienteId, sedeId) => (R.idx().contatosPorCliente[clienteId] || []).filter(c => c.ativo !== false).sort((a, b) => (sedeId && b.sedeId === sedeId) - (sedeId && a.sedeId === sedeId) || U.cmp(a.nome, b.nome)).map(c => ({ v: c.id, l: c.nome + (c.cargo ? ' — ' + c.cargo : '') }));
  R.nomeContato = id => { const c = DB.get('contatos', id); return c ? c.nome : ''; };

  /** Código do cliente no padrão existente: 2 letras + "_" + sequência pela 1ª letra (ex.: AM_34). */
  R.novoCodigoCliente = nome => {
    const ws = (nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
    const pre = ws.length ? (ws[0][0] + (ws[1] ? ws[1][0] : ws[0][1] || 'X')).toUpperCase() : 'XX';
    let mx = 0; DB.all('clientes').forEach(c => { const cod = c.codigo || ''; if ((cod[0] || '').toUpperCase() === pre[0]) { const m = /_(\d+)$/.exec(cod); if (m) mx = Math.max(mx, parseInt(m[1], 10)); } });
    return pre + '_' + String(mx + 1).padStart(2, '0');
  };
  /** Verifica duplicidade de clientes por CNPJ, nome normalizado e código. */
  R.duplicidadesCliente = c => {
    const out = []; const cn = U.soDigitos(c.cnpj); const nf = U.norm(c.nomeFantasia); const rz = U.norm(c.razaoSocial);
    DB.all('clientes').forEach(o => {
      if (o.id === c.id) return;
      if (cn && U.soDigitos(o.cnpj) === cn) out.push({ c: o, motivo: 'mesmo CNPJ' });
      else if (nf && (U.norm(o.nomeFantasia) === nf || U.norm(o.razaoSocial) === nf)) out.push({ c: o, motivo: 'mesmo nome' });
      else if (rz && rz !== nf && (U.norm(o.razaoSocial) === rz || U.norm(o.nomeFantasia) === rz)) out.push({ c: o, motivo: 'mesma razão social' });
      else if (c.codigo && o.codigo && o.codigo.toUpperCase() === c.codigo.toUpperCase()) out.push({ c: o, motivo: 'mesmo código' });
    });
    return out;
  };

  /* ---------- Índices derivados (recalculados a cada alteração) ---------- */
  let cacheV = -1, cache = null;
  R.idx = () => {
    if (cacheV === DB.version && cache) return cache;
    const g = (s, k) => U.groupBy(DB.all(s), x => x[k] || '');
    const c = {
      sedesPorCliente: g('sedes', 'clienteId'), contatosPorCliente: g('contatos', 'clienteId'),
      propostasPorOp: g('propostas', 'oportunidadeId'), propostasPorCliente: g('propostas', 'clienteId'), propostasPorContrato: g('propostas', 'contratoId'),
      oppsPorCliente: g('oportunidades', 'clienteId'), stosPorCliente: g('stos', 'clienteId'), stosPorOp: g('stos', 'oportunidadeId'),
      atividadesPorCliente: g('atividades', 'clienteId'), atividadesPorProposta: g('atividades', 'propostaId'), prospPorCliente: g('prospeccoes', 'clienteId'),
      contratosPorCliente: g('contratos', 'clienteId'),
    };
    cache = c; cacheV = DB.version; return c;
  };

  /* ---------- Propostas ---------- */
  R.valorTotal = p => U.sum(Object.values(p.valores || {}));
  R.resultado = p => { // 'aberta' | 'ganha' | 'perdida'
    if (p.categoria === 'CAPEX') { const s = p.statusCapex || ''; return s === 'Declinada' || s === 'Cancelada' ? 'perdida' : p.status === 'Aprovada' ? 'ganha' : 'aberta'; }
    const st = DB.all('listas').find(l => l.tipo === 'statusProposta' && l.nome === p.status);
    return (st && st.resultado) || (p.status === 'Aprovada' ? 'ganha' : ['Reprovada', 'Declinada', 'Cancelada'].includes(p.status) ? 'perdida' : 'aberta');
  };
  R.ROTULO_RESULTADO = { aberta: 'Em andamento', ganha: 'Aprovada', perdida: 'Perdida' };
  R.valorAprovado = p => R.resultado(p) === 'ganha' ? (U.num(p.valorFechado) || R.valorTotal(p)) : 0;
  R.anoProposta = p => U.ano(p.dataEntrada || (p.criadoEm || '').slice(0, 10));
  R.diasElaboracao = p => (p.dataEntrada && p.dataEnvio ? U.dias(p.dataEntrada, p.dataEnvio) : null);
  R.faixaValor = v => { if (!v) return null; return R.lista('faixaValor').find(f => v > U.num(f.min) && (f.max === null || f.max === undefined || f.max === '' || v <= U.num(f.max))) || null; };
  R.propostasAtivas = categoria => DB.all('propostas').filter(p => !p.arquivada && (!categoria || p.categoria === categoria));
  R.etapaDaProposta = p => { const op = DB.get('oportunidades', p.oportunidadeId); return op ? op.etapaId : ''; };

  /** Código da proposta no padrão existente: códigoCliente + sequência (2) + ano (2). Ex.: AM_34 + 01 + 26. */
  R.novoCodigoProposta = (clienteId, dataRef) => {
    const c = DB.get('clientes', clienteId); const base = (c && c.codigo) || 'SC_00';
    const yy = (dataRef || U.hoje()).slice(2, 4);
    const usados = new Set(DB.all('propostas').map(p => (p.codigo || '').toUpperCase()));
    let mx = 0;
    DB.all('propostas').forEach(p => { const cod = (p.codigo || '').toUpperCase(); if (cod.startsWith(base.toUpperCase()) && cod.slice(-2) === yy) { const s = parseInt(cod.slice(base.length, base.length + 2), 10); if (!isNaN(s)) mx = Math.max(mx, s); } });
    let n = mx + 1, cod;
    do { cod = base + String(n).padStart(2, '0') + yy; n++; } while (usados.has(cod.toUpperCase()));
    return cod;
  };
  R.codigoDuplicado = (codigo, id) => !!codigo && DB.all('propostas').some(p => p.id !== id && (p.codigo || '').trim().toUpperCase() === codigo.trim().toUpperCase());

  /* ---------- Oportunidades ---------- */
  R.situacaoOp = op => {
    if (op.perdida) return 'Perdida';
    const ps = (R.idx().propostasPorOp[op.id] || []).filter(p => !p.arquivada);
    if (ps.some(p => R.resultado(p) === 'ganha')) return 'Ganha';
    if (ps.length && ps.every(p => R.resultado(p) === 'perdida')) return 'Perdida';
    return 'Aberta';
  };
  R.valorOp = op => {
    const ps = (R.idx().propostasPorOp[op.id] || []).filter(p => !p.arquivada && R.resultado(p) !== 'perdida');
    const v = ps.length ? Math.max(...ps.map(p => R.valorAprovado(p) || R.valorTotal(p))) : 0;
    return v || U.num(op.valorEstimado);
  };
  R.probOp = op => (op.probabilidade !== null && op.probabilidade !== undefined && op.probabilidade !== '' ? U.num(op.probabilidade) : U.num((DB.get('listas', op.etapaId) || {}).prob));
  R.etapas = () => R.lista('etapa');
  R.ordemEtapa = id => { const e = DB.get('listas', id); return e ? e.ordem : 0; };
  R.anoOp = op => U.ano((op.criadoEm || '').slice(0, 10));

  /* ---------- Contratos ---------- */
  R.consumoContrato = ct => {
    const demandas = (R.idx().propostasPorContrato[ct.id] || []).filter(p => !p.arquivada && p.id !== ct.propostaOrigemId);
    const consumido = U.sum(demandas.filter(p => R.resultado(p) === 'ganha'), R.valorAprovado);
    const teto = U.num(ct.teto); const saldo = teto - consumido;
    return { demandas, consumido, teto, saldo, pct: teto ? consumido / teto : 0 };
  };
  R.situacaoContrato = ct => {
    if (ct.encerrado) return 'Encerrado'; const h = U.hoje();
    if (ct.vigenciaFim && ct.vigenciaFim < h) return 'Vencido';
    if (ct.vigenciaInicio && ct.vigenciaInicio > h) return 'A iniciar';
    return 'Vigente';
  };

  /* ---------- Agenda ---------- */
  R.atrasada = a => a.status === 'A fazer' && a.data && a.data < U.hoje();
  R.pendentes = () => DB.all('atividades').filter(a => a.status === 'A fazer');
  /** Calendário de pós-venda: checkpoints a partir da data do pedido das propostas aprovadas. */
  R.posVendaAgenda = () => {
    const cfg = DB.cfg('posVenda', null); const cps = ((cfg && cfg.checkpoints) || []).slice().sort((a, b) => a.dias - b.dias);
    if (!cps.length) return [];
    const feitos = U.groupBy(DB.all('atividades').filter(a => a.categoria === 'Pós-venda' && a.propostaId && a.checkpointDias), a => a.propostaId);
    const out = [];
    DB.all('propostas').forEach(p => {
      if (p.arquivada || p.posVendaEncerrado || p.categoria !== 'Comercial' || R.resultado(p) !== 'ganha') return;
      const base = p.dataPedido || p.dataEnvio || p.dataEntrada; if (!base) return;
      const f = feitos[p.id] || [];
      const prox = cps.find(c => !f.some(x => Number(x.checkpointDias) === Number(c.dias)));
      if (prox) out.push({ proposta: p, checkpoint: prox, prevista: U.addDias(base, Number(prox.dias)), feitos: f.length, total: cps.length, base });
    });
    return out.sort((a, b) => U.cmp(a.prevista, b.prevista));
  };

  /* ---------- "Vendo como" (filtro de vendedor global) ---------- */
  R.vendoComo = () => DB.cfg('vendoComo', '');
  R.doUsuario = (rec, campo = 'vendedorId') => {
    const v = R.vendoComo(); if (!v) return true;
    if (campo === 'vendedorIds') return (rec.vendedorIds || []).includes(v);
    return rec[campo] === v;
  };

  /* ---------- Anos disponíveis ---------- */
  R.anosDisponiveis = (categoria) => {
    const atual = new Date().getFullYear();
    const anos = new Set([2022, 2023, 2024, 2025, atual, atual + 1]);
    R.propostasAtivas(categoria).forEach(p => { const a = R.anoProposta(p); if (a) anos.add(a); });
    return [...anos].sort();
  };

  CRM.R = R;
})();
