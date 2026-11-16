/* =========================================================
   PROPOSTAS e CAPEX — controle, formulário e detalhe
   Mesma base (tabela "propostas"), distinguida por "categoria"
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Chips, Money, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi } = UI;

  const ehAdmin = () => !!DB.cfg('admin', false);
  const statusExib = p => p.categoria === 'CAPEX' ? (p.statusCapex || 'Capex') : p.status;
  const cidadeUF = p => R.localSede(p.sedeId) || (() => { const c = R.cliente(p.clienteId); return c ? [c.cidade, c.uf].filter(Boolean).join('/') : ''; })();
  const ufDe = p => { const s = R.sede(p.sedeId); if (s && s.uf) return s.uf; const c = R.cliente(p.clienteId); return c ? c.uf : ''; };
  CRM.ufProposta = ufDe;

  /* ---------- Filtro comum de propostas (usado também nos indicadores) ---------- */
  CRM.filtrarPropostas = (categoria, f) => {
    const t = U.normTxt(f.q || '');
    return DB.all('propostas').filter(p => {
      if (p.categoria !== categoria) return false;
      if (p.arquivada && !f.arquivadas) return false;
      if (!R.doUsuario(p)) return false;
      const ano = R.anoProposta(p);
      if (f.ano && f.ano !== 'todos' && ano !== Number(f.ano)) return false;
      if ((f.ini || f.fim) && !U.noPeriodo(p.dataEntrada, f.ini, f.fim)) return false;
      if (f.vend && p.vendedorId !== f.vend) return false;
      if (f.cli && p.clienteId !== f.cli) return false;
      if (f.status && statusExib(p) !== f.status) return false;
      if (f.res && R.resultado(p) !== f.res) return false;
      if (f.seg) { const op = DB.get('oportunidades', p.oportunidadeId); const c = R.cliente(p.clienteId); if ((op ? op.segmentoId : c && c.segmentoId) !== f.seg) return false; }
      if (f.linha && !(p.linhas || []).includes(f.linha)) return false;
      if (f.uf && ufDe(p) !== f.uf) return false;
      if (t && !U.normTxt([p.codigo, p.descricao, R.nomeCliente(p.clienteId), p.observacoes].join(' ')).includes(t)) return false;
      return true;
    });
  };
  CRM.segmentoProposta = p => { const op = DB.get('oportunidades', p.oportunidadeId); if (op && op.segmentoId) return op.segmentoId; const c = R.cliente(p.clienteId); return c ? c.segmentoId : ''; };

  /* ---------- Exportação no formato da planilha original ---------- */
  CRM.exportarPropostas = (rows, categoria, nome) => {
    const linhas = R.lista('produto', true);
    const op = p => DB.get('oportunidades', p.oportunidadeId) || {};
    const colunas = categoria === 'CAPEX' ? [
      { t: 'STATUS DA ATIVIDADE CAPEX', v: p => p.statusCapex }, { t: 'CÓDIGO', v: p => p.codigo }, { t: 'DESCRIÇÃO', v: p => p.descricao }, { t: 'EMPRESA', v: p => R.nomeCliente(p.clienteId) },
      { t: 'CIDADE/UF', v: cidadeUF }, { t: 'DATA DE ENTRADA', v: p => p.dataEntrada }, { t: 'DATA LIMITE', v: p => p.dataLimite }, { t: 'DATA DE ENVIO', v: p => p.dataEnvio }, { t: 'RESPONSÁVEL', v: p => R.nomeUsuario(p.vendedorId) },
      { t: 'FUNIL DE VENDAS', v: p => R.nomeLista(op(p).etapaId) }, { t: 'RESPONSÁVEL (Cliente)', v: p => R.nomeContato(p.contatoId) }, { t: 'PREÇO CAPEX', v: R.valorTotal }, { t: 'OBSERVAÇÕES', v: p => p.observacoes }, { t: 'SEGMENTO', v: p => R.nomeLista(CRM.segmentoProposta(p)) },
    ] : [
      { t: 'STATUS DA PROPOSTA', v: p => p.status }, { t: 'CÓDIGO', v: p => p.codigo }, { t: 'DESCRIÇÃO', v: p => p.descricao }, { t: 'EMPRESA', v: p => R.nomeCliente(p.clienteId) },
      { t: 'CIDADE', v: p => (R.sede(p.sedeId) || {}).cidade || '' }, { t: 'UF', v: ufDe }, { t: 'DATA DE ENTRADA', v: p => p.dataEntrada }, { t: 'DATA LIMITE', v: p => p.dataLimite }, { t: 'DATA DE ENVIO', v: p => p.dataEnvio },
      { t: 'ENTRADA PEDIDO', v: p => p.dataPedido }, { t: 'RESPONSÁVEL', v: p => R.nomeUsuario(p.vendedorId) }, { t: 'STATUS ATIVIDADE', v: p => p.statusElaboracao }, { t: 'FUNIL DE VENDAS', v: p => R.nomeLista(op(p).etapaId) },
      { t: 'TIPO DA PROPOSTA', v: p => (p.linhas || []).map(R.nomeLista).join(', ') }, { t: 'PROB. DE FECH. (%)', v: p => R.probOp(op(p)) },
      { t: 'RESPONSÁVEL (Cliente)', v: p => R.nomeContato(p.contatoId) }, { t: 'CONTATO', v: p => { const c = DB.get('contatos', p.contatoId); return c ? c.celular || c.telefone : ''; } }, { t: 'E-MAIL', v: p => { const c = DB.get('contatos', p.contatoId); return c ? c.email : ''; } },
      ...linhas.map(l => ({ t: 'PREÇO ' + l.nome.toUpperCase(), v: p => (p.valores || {})[l.id] || '' })), { t: 'VALOR NÃO DETALHADO', v: p => (p.valores || {}).nd || '' },
      { t: 'PREÇO TOTAL PROPOSTA', v: R.valorTotal }, { t: 'ENTRADA DO LEAD', v: p => R.nomeLista(op(p).origemId) }, { t: 'OBSERVAÇÕES', v: p => p.observacoes }, { t: 'SEGMENTO', v: p => R.nomeLista(CRM.segmentoProposta(p)) },
      { t: 'RESULTADO', v: p => R.ROTULO_RESULTADO[R.resultado(p)] }, { t: 'VALOR FECHADO', v: p => p.valorFechado }, { t: 'MOTIVO DA PERDA', v: p => R.nomeLista(p.motivoPerdaId) }, { t: 'DIAS DE ELABORAÇÃO', v: R.diasElaboracao },
    ];
    U.exportarExcel((nome || (categoria === 'CAPEX' ? 'Controle_Propostas_CAPEX' : 'Controle_de_Propostas')) + '_' + U.hoje() + '.xlsx', [{ nome: categoria === 'CAPEX' ? 'CAPEX' : 'Controle de propostas', colunas, linhas: rows }]);
  };

  /* ---------- Ações comuns ---------- */
  CRM.acoesProposta = {
    duplicar: p => CRM.abrir('propostaForm', { duplicarDe: p.id }),
    arquivar: async p => {
      const arq = !p.arquivada;
      if (arq && !await UI.confirmar(`Arquivar a proposta ${p.codigo}?\nEla deixa de aparecer nos controles e indicadores, mas o histórico é preservado e pode ser restaurada.`, { ok: 'Arquivar' })) return;
      DB.save('propostas', { ...p, arquivada: arq, historico: (p.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: arq ? 'Arquivada' : 'Restaurada' }) }, { resumo: (arq ? 'Arquivada ' : 'Restaurada ') + p.codigo });
      UI.toast(arq ? 'Proposta arquivada.' : 'Proposta restaurada.', 'ok');
    },
    excluir: async p => {
      if (!ehAdmin()) return UI.toast('Exclusão definitiva disponível apenas no modo administrador (Backup e dados › Preferências). Use "Arquivar".', 'err');
      if (!await UI.confirmar(`Excluir definitivamente a proposta ${p.codigo}?\nA exclusão fica registrada no histórico de alterações.`, { perigo: true, palavra: 'EXCLUIR', ok: 'Excluir' })) return;
      const outras = (R.idx().propostasPorOp[p.oportunidadeId] || []).filter(x => x.id !== p.id);
      DB.saveMany('atividades', DB.all('atividades').filter(a => a.propostaId === p.id).map(a => ({ ...a, propostaId: '' })), { semAuditoria: true });
      DB.saveMany('stos', DB.all('stos').filter(s => s.propostaId === p.id).map(s => ({ ...s, propostaId: '', situacao: 'Em elaboração' })), { semAuditoria: true });
      DB.remove('propostas', p.id, { resumo: 'Proposta excluída: ' + p.codigo + ' — ' + p.descricao });
      if (!outras.length && p.oportunidadeId && !(R.idx().stosPorOp[p.oportunidadeId] || []).length) DB.remove('oportunidades', p.oportunidadeId, { resumo: 'Oportunidade excluída com a proposta ' + p.codigo });
      UI.toast('Proposta excluída.', 'ok');
    },
  };

  /* ---------- Controle de propostas ---------- */
  const GRUPOS = [{ v: 'class', l: 'Classificação' }, { v: 'com', l: 'Comercial' }, { v: 'acomp', l: 'Acompanhamento' }, { v: 'res', l: 'Resultado' }];
  function Controle({ categoria }) {
    DB.useDB();
    const capex = categoria === 'CAPEX';
    const anos = R.anosDisponiveis(categoria);
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: capex ? 'todos' : new Date().getFullYear(), q: '', vend: '', cli: '', status: '', res: '', seg: '', linha: '', uf: '', ini: '', fim: '', arquivadas: false }, 'ctrl' + categoria);
    const [grupos, setGrupos] = useState(capex ? ['com', 'acomp'] : ['class', 'com', 'acomp', 'res']);
    const rows = useMemo(() => CRM.filtrarPropostas(categoria, f), [DB.version, f, categoria]);
    const op = p => DB.get('oportunidades', p.oportunidadeId) || {};
    const statusOpts = capex ? R.lista('statusCapex').map(x => x.nome) : R.lista('statusProposta').map(x => x.nome);
    const tot = U.sum(rows, R.valorTotal), apr = U.sum(rows, R.valorAprovado), and = rows.filter(p => R.resultado(p) === 'aberta');
    const g = k => grupos.includes(k);
    const cols = [
      { k: 'codigo', grp: 'Identificação', t: 'Código', r: p => html`<span class="num small strong">${p.codigo || html`<span class="muted">—</span>`}</span>` },
      { k: 'dataEntrada', grp: 'Identificação', t: 'Entrada', r: p => U.data(p.dataEntrada) },
      { k: 'cliente', grp: 'Identificação', t: 'Cliente', v: p => R.nomeCliente(p.clienteId), r: p => html`<div style=${{ maxWidth: 190 }}><div class="ellipsis strong">${R.nomeCliente(p.clienteId)}</div><div class="small muted ellipsis">${cidadeUF(p)}</div></div>` },
      { k: 'descricao', grp: 'Identificação', t: 'Descrição', r: p => html`<div class="ellipsis" style=${{ maxWidth: 260 }} title=${p.descricao}>${p.descricao}</div>` },
      { k: 'vend', grp: 'Identificação', t: 'Responsável', v: p => R.nomeUsuario(p.vendedorId), r: p => R.curtoUsuario(p.vendedorId) },
      ...(g('class') && !capex ? [
        { k: 'linhas', grp: 'Classificação', t: 'Tipo', v: p => (p.linhas || []).map(R.nomeLista).join(', '), r: p => html`<span class="small">${(p.linhas || []).map(R.nomeLista).join(', ')}</span>` },
        { k: 'seg', grp: 'Classificação', t: 'Segmento', v: p => R.nomeLista(CRM.segmentoProposta(p)), r: p => html`<span class="small">${R.nomeLista(CRM.segmentoProposta(p))}</span>` },
        { k: 'origem', grp: 'Classificação', t: 'Origem', v: p => R.nomeLista(op(p).origemId), r: p => html`<span class="small">${R.nomeLista(op(p).origemId)}</span>` }] : []),
      ...(g('com') ? [
        { k: 'valor', grp: 'Comercial', t: capex ? 'Valor CAPEX' : 'Valor proposto', al: 'r', v: R.valorTotal, r: p => html`<${UI.Money$} v=${R.valorTotal(p) || null}/>` },
        { k: 'dataLimite', grp: 'Comercial', t: 'Data limite', r: p => html`<span class=${R.resultado(p) === 'aberta' && !p.dataEnvio && p.dataLimite && p.dataLimite < U.hoje() ? 'delta-down' : ''}>${U.data(p.dataLimite)}</span>` },
        { k: 'dataEnvio', grp: 'Comercial', t: 'Envio', r: p => U.data(p.dataEnvio) }] : []),
      ...(g('acomp') ? [
        { k: 'status', grp: 'Acompanhamento', t: capex ? 'Status atividade' : 'Status', v: statusExib, r: p => html`<${Status} s=${statusExib(p)}/>` },
        ...(!capex ? [{ k: 'elab', grp: 'Acompanhamento', t: 'Elaboração', v: p => p.statusElaboracao, r: p => p.statusElaboracao ? html`<${Status} s=${p.statusElaboracao}/>` : html`<span class="muted">—</span>` }] : []),
        { k: 'etapa', grp: 'Acompanhamento', t: 'Funil', v: p => R.ordemEtapa(op(p).etapaId), r: p => html`<span class="small">${R.nomeLista(op(p).etapaId)}</span>` }] : []),
      ...(g('res') && !capex ? [
        { k: 'resultado', grp: 'Resultado', t: 'Resultado', v: R.resultado, r: p => html`<${Status} s=${R.resultado(p)}/>` },
        { k: 'fechado', grp: 'Resultado', t: 'Valor fechado', al: 'r', v: R.valorAprovado, r: p => R.resultado(p) === 'ganha' ? html`<${UI.Money$} v=${R.valorAprovado(p)}/>` : html`<span class="muted">—</span>` },
        { k: 'motivo', grp: 'Resultado', t: 'Motivo da perda', v: p => R.nomeLista(p.motivoPerdaId), r: p => html`<span class="small">${R.nomeLista(p.motivoPerdaId)}</span>` }] : []),
      { k: 'acoes', t: '', nosort: true, r: p => html`<${Btn} sm v="ghost" icon="eye" title="Detalhes" onClick=${() => CRM.abrir('propostaDetalhe', { id: p.id })}/><${Btn} sm v="ghost" icon="edit" title="Editar" onClick=${() => CRM.abrir('propostaForm', { id: p.id })}/>
        <${Btn} sm v="ghost" icon="copy" title="Duplicar" onClick=${() => CRM.acoesProposta.duplicar(p)}/><${Btn} sm v="ghost" icon=${p.arquivada ? 'restore' : 'archive'} title=${p.arquivada ? 'Restaurar' : 'Arquivar'} onClick=${() => CRM.acoesProposta.arquivar(p)}/>
        ${ehAdmin() && html`<${Btn} sm v="ghost" icon="trash" title="Excluir" onClick=${() => CRM.acoesProposta.excluir(p)}/>`}` },
    ];
    return html`<div>
      <div class="row mb"><${UI.Anos} value=${f.ano} onChange=${v => set('ano', v)} anos=${anos}/>
        <div class="spacer"></div>
        ${!capex && html`<${Btn} icon="chart" onClick=${() => { sessionStorage.setItem('ind:comparar', '1'); CRM.irPara('propostas/indicadores'); }}>Comparar anos</${Btn}>`}
        <${Btn} icon="download" onClick=${() => CRM.exportarPropostas(rows, categoria)}>Exportar Excel</${Btn}>
        <${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('propostaForm', { inicial: { categoria } })}>${capex ? 'Nova proposta CAPEX' : 'Nova proposta'}</${Btn}></div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Código, descrição, cliente ou observação"/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${FSel} label="Responsável" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label=${capex ? 'Status atividade' : 'Status'} value=${f.status} onChange=${v => set('status', v)} options=${statusOpts}/>
        ${!capex && html`<${FSel} label="Resultado" value=${f.res} onChange=${v => set('res', v)} options=${[{ v: 'aberta', l: 'Em andamento' }, { v: 'ganha', l: 'Aprovada' }, { v: 'perdida', l: 'Perdida' }]}/>`}
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        ${!capex && html`<${FSel} label="Tipo" value=${f.linha} onChange=${v => set('linha', v)} options=${R.opts('produto')}/>`}
        <${FSel} label="UF" value=${f.uf} onChange=${v => set('uf', v)} options=${U.UFS}/>
        <${UI.FPeriodo} label="Período (entrada)" ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
        <div class="field" style=${{ minWidth: 0, flex: '0 0 auto', justifyContent: 'flex-end' }}><${Check} checked=${f.arquivadas} onChange=${v => set('arquivadas', v)} label="Arquivadas"/></div>
      </${Filtros}>
      <div class="grid g4 mb">
        <${Kpi} label="Propostas" value=${U.int(rows.length)} foot=${f.ano === 'todos' ? 'todos os anos' : 'ano ' + f.ano}/>
        <${Kpi} label=${capex ? 'Potencial CAPEX' : 'Valor proposto'} value=${U.brlK(tot)} small/>
        <${Kpi} label="Em andamento" value=${U.int(and.length)} foot=${U.brlK(U.sum(and, R.valorTotal))}/>
        ${capex ? html`<${Kpi} label="Concluídas / enviadas" value=${U.int(rows.filter(p => ['Concluído', 'Entregue/Enviado'].includes(p.statusCapex)).length)}/>` : html`<${Kpi} label="Valor aprovado" value=${U.brlK(apr)} small accent foot=${rows.filter(p => R.resultado(p) === 'ganha').length + ' aprovada(s) entre as propostas do filtro'}/>`}
      </div>
      <${Card} pad=${false} title=${capex ? 'Controle de propostas CAPEX' : 'Controle de propostas'} sub="Clique na linha para ver os detalhes · clique no cabeçalho para ordenar"
        right=${!capex && html`<span class="small muted">Colunas:</span><${Chips} value=${grupos} onChange=${setGrupos} options=${GRUPOS}/>`}>
        <${Table} cols=${cols} rows=${rows} sortInicial=${{ k: 'dataEntrada', d: 'desc' }} onRow=${p => CRM.abrir('propostaDetalhe', { id: p.id })} rowClass=${p => p.arquivada ? 'arch' : ''}
          footer=${rows.length ? cols.map(c => html`<td key=${c.k} style=${{ textAlign: c.al === 'r' ? 'right' : 'left' }}>${c.k === 'codigo' ? 'Total' : c.k === 'valor' ? U.brl(tot) : c.k === 'fechado' ? U.brl(apr) : ''}</td>`) : null}/>
      </${Card}>
    </div>`;
  }

  /* ---------- Formulário de proposta ---------- */
  function PropostaForm({ id, inicial, duplicarDe, onClose, onSalvo }) {
    DB.useDB();
    const orig = id ? DB.get('propostas', id) : null;
    const base = duplicarDe ? DB.get('propostas', duplicarDe) : null;
    const [f, setF] = useState(() => {
      if (orig) return JSON.parse(JSON.stringify(orig));
      const cat = (inicial && inicial.categoria) || (base && base.categoria) || 'Comercial';
      const p = { categoria: cat, codigo: '', oportunidadeId: '', stoId: '', clienteId: '', sedeId: '', contatoId: '', vendedorId: R.vendoComo() || '', responsavelElaboracaoId: '', responsavelAcompId: '', descricao: '', linhas: cat === 'CAPEX' ? [R.idLista('produto', 'Capex')].filter(Boolean) : [], valores: {}, moeda: 'BRL', condicoesComerciais: '', validadeProposta: '', status: cat === 'CAPEX' ? '' : 'Recebida', statusElaboracao: 'Não iniciado', statusCapex: cat === 'CAPEX' ? 'Não iniciado' : '', dataEntrada: U.hoje(), dataLimite: '', dataEnvio: '', dataPedido: '', valorFechado: null, motivoPerdaId: '', margemMeta: null, margemProposta: null, margemFechada: null, justificativaMargem: '', revisao: '', linkProposta: '', linkPasta: '', ocCliente: '', faixaEstimadaId: '', contratoId: '', observacoes: '', arquivada: false, historico: [] };
      if (base) Object.assign(p, JSON.parse(JSON.stringify(base)), { id: undefined, codigo: '', status: cat === 'CAPEX' ? '' : 'Recebida', statusElaboracao: 'Não iniciado', dataEntrada: U.hoje(), dataEnvio: '', dataPedido: '', valorFechado: null, motivoPerdaId: '', arquivada: false, historico: [], criadoEm: undefined, legado: undefined, origemDado: undefined, stoId: '' });
      const out = { ...p, ...(inicial || {}) };
      if (out.clienteId && !out.codigo) out.codigo = R.novoCodigoProposta(out.clienteId, out.dataEntrada);
      if (out.clienteId && !out.sedeId) { const s = (R.idx().sedesPorCliente[out.clienteId] || []).find(x => x.ativo !== false); if (s) out.sedeId = s.id; }
      if (out.clienteId && !out.vendedorId) { const c = R.cliente(out.clienteId); if (c) out.vendedorId = c.vendedorId || ''; }
      return out;
    });
    const opOrig = f.oportunidadeId ? DB.get('oportunidades', f.oportunidadeId) : null;
    const [op, setOp] = useState(() => ({ etapaId: (opOrig && opOrig.etapaId) || R.idLista('etapa', 'Entrada de lead e qualificação'), probabilidade: opOrig ? opOrig.probabilidade : null, origemId: (opOrig && opOrig.origemId) || '', segmentoId: (opOrig && opOrig.segmentoId) || '', natureza: (opOrig && opOrig.natureza) || 'Proposta efetiva', valorEstimado: opOrig ? opOrig.valorEstimado : null, previsaoFechamento: (opOrig && opOrig.previsaoFechamento) || '', concorrentes: (opOrig && opOrig.concorrentes) || '' }));
    const [vinc, setVinc] = useState(f.oportunidadeId ? 'existente' : 'nova');
    const [prox, setProx] = useState({ acao: '', data: '' });
    const [err, setErr] = useState({});
    const capex = f.categoria === 'CAPEX';
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const setO = (k, v) => setOp(x => ({ ...x, [k]: v }));
    const total = R.valorTotal(f);
    const resultado = R.resultado(f);
    const cli = R.cliente(f.clienteId);
    const oppsCli = f.clienteId ? (R.idx().oppsPorCliente[f.clienteId] || []).filter(o => R.situacaoOp(o) === 'Aberta' || o.id === f.oportunidadeId).map(o => ({ v: o.id, l: o.titulo + ' — ' + R.nomeLista(o.etapaId) })) : [];
    const stosCli = f.clienteId ? (R.idx().stosPorCliente[f.clienteId] || []).filter(s => !s.propostaId || s.propostaId === id || s.id === f.stoId).map(s => ({ v: s.id, l: s.numero + ' — ' + (s.atividade || 'sem atividade') })) : [];
    const ctsCli = f.clienteId ? (R.idx().contratosPorCliente[f.clienteId] || []).map(c => ({ v: c.id, l: c.numero + ' — ' + c.descricao })) : [];

    const escolherCliente = v => {
      const c = R.cliente(v); const s = (R.idx().sedesPorCliente[v] || []).filter(x => x.ativo !== false);
      setF(x => ({ ...x, clienteId: v, sedeId: s[0] ? s[0].id : '', contatoId: '', stoId: '', contratoId: '', oportunidadeId: '', vendedorId: x.vendedorId || (c && c.vendedorId) || '', codigo: !id && v ? R.novoCodigoProposta(v, x.dataEntrada) : x.codigo }));
      setOp(o => ({ ...o, segmentoId: o.segmentoId || (c && c.segmentoId) || '', origemId: o.origemId || (c && c.origemId) || '' })); setVinc('nova');
    };
    const salvar = () => {
      const e = {};
      if (!f.clienteId) e.clienteId = 'Selecione o cliente (cadastro mestre)';
      if (!(f.codigo || '').trim()) e.codigo = 'Obrigatório';
      else if (R.codigoDuplicado(f.codigo, id)) e.codigo = 'Já existe proposta com este código';
      if (!(f.descricao || '').trim()) e.descricao = 'Obrigatório';
      if (!f.vendedorId) e.vendedorId = 'Obrigatório';
      if (!f.dataEntrada) e.dataEntrada = 'Obrigatório';
      ['dataEntrada', 'dataLimite', 'dataEnvio', 'dataPedido', 'validadeProposta'].forEach(k => { if (!U.dataValida(f[k])) e[k] = 'Data inválida'; });
      if (!U.dataValida(op.previsaoFechamento)) e.previsaoFechamento = 'Data inválida';
      if (!U.dataValida(prox.data)) e.prox = 'Data inválida';
      if (!capex && !f.status) e.status = 'Obrigatório';
      if (!capex && !(f.linhas || []).length) e.linhas = 'Selecione ao menos um tipo';
      if (f.dataEnvio && f.dataEntrada && f.dataEnvio < f.dataEntrada) e.dataEnvio = 'Envio anterior à entrada';
      const mudouStatus = !orig || orig.status !== f.status;
      if (!capex && resultado === 'perdida' && mudouStatus && !f.motivoPerdaId) e.motivoPerdaId = 'Informe o motivo da perda';
      if (vinc === 'existente' && !f.oportunidadeId) e.oportunidadeId = 'Selecione a oportunidade';
      setErr(e); if (Object.keys(e).length) { UI.toast('Verifique os campos destacados.', 'err'); return; }
      // oportunidade (criada automaticamente quando não vinculada)
      const oport = vinc === 'existente' ? DB.get('oportunidades', f.oportunidadeId) : (orig && orig.oportunidadeId ? DB.get('oportunidades', orig.oportunidadeId) : null);
      let etapaId = op.etapaId;
      const ganhou = !capex && resultado === 'ganha' && (!orig || R.resultado(orig) !== 'ganha');
      const etapaAprov = R.idLista('etapa', 'Concluído Aprovado');
      if (ganhou && etapaAprov && R.ordemEtapa(etapaId) < R.ordemEtapa(etapaAprov)) etapaId = etapaAprov;
      const hist = (oport && oport.historicoEtapas) || [];
      const opRec = { ...(oport || { titulo: f.descricao, historicoEtapas: [], qualificacao: { escopo: false, demanda: false, decisor: false, pedido: false }, perdida: false }), clienteId: f.clienteId, sedeId: f.sedeId, contatoId: f.contatoId, vendedorId: f.vendedorId, segmentoId: op.segmentoId, origemId: op.origemId, etapaId, probabilidade: op.probabilidade, natureza: op.natureza, valorEstimado: op.valorEstimado, previsaoFechamento: op.previsaoFechamento, concorrentes: op.concorrentes,
        historicoEtapas: (!oport || oport.etapaId !== etapaId) ? hist.concat({ etapaId, data: U.hoje(), usuario: DB.usuarioAtual() }) : hist };
      const opSalva = DB.save('oportunidades', opRec, { resumo: (oport ? 'Oportunidade atualizada pela proposta ' : 'Oportunidade criada pela proposta ') + f.codigo, silencioso: true });
      // histórico de alterações da proposta
      const mud = [];
      if (!orig) mud.push(duplicarDe ? 'Criada por duplicação de ' + (base && base.codigo) : 'Proposta cadastrada');
      else {
        if (orig.status !== f.status) mud.push(`Status: ${orig.status || '—'} → ${f.status}`);
        if (orig.statusCapex !== f.statusCapex) mud.push(`Status CAPEX: ${orig.statusCapex || '—'} → ${f.statusCapex}`);
        if (orig.statusElaboracao !== f.statusElaboracao) mud.push(`Elaboração: ${orig.statusElaboracao || '—'} → ${f.statusElaboracao}`);
        if (R.valorTotal(orig) !== total) mud.push(`Valor: ${U.brl(R.valorTotal(orig))} → ${U.brl(total)}`);
        if (orig.dataEnvio !== f.dataEnvio && f.dataEnvio) mud.push('Enviada em ' + U.data(f.dataEnvio));
        if (opOrig && opOrig.etapaId !== etapaId) mud.push(`Funil: ${R.nomeLista(opOrig.etapaId)} → ${R.nomeLista(etapaId)}`);
        if (!mud.length) mud.push('Dados atualizados');
      }
      const rec = { ...f, codigo: f.codigo.trim(), oportunidadeId: opSalva.id, historico: (f.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: mud[0], detalhe: mud.slice(1).join(' · ') }) };
      const salva = DB.save('propostas', rec, { resumo: (orig ? 'Proposta alterada ' : 'Proposta incluída ') + rec.codigo });
      // vínculo do STO
      if (orig && orig.stoId && orig.stoId !== f.stoId) { const s = DB.get('stos', orig.stoId); if (s) DB.save('stos', { ...s, propostaId: '', situacao: 'Em elaboração' }, { semAuditoria: true }); }
      if (f.stoId) { const s = DB.get('stos', f.stoId); if (s && s.propostaId !== salva.id) DB.save('stos', { ...s, propostaId: salva.id, oportunidadeId: opSalva.id, situacao: 'Proposta emitida' }, { resumo: 'STO vinculado à proposta ' + salva.codigo }); }
      if (prox.acao && prox.data) DB.save('atividades', { categoria: 'Follow-up', titulo: prox.acao, clienteId: f.clienteId, propostaId: salva.id, oportunidadeId: opSalva.id, responsavelId: f.responsavelAcompId || f.vendedorId, data: prox.data, prioridade: 'Média', status: 'A fazer', recorrencia: 'Nenhuma', descricao: '', resultado: '', observacoes: '' }, { resumo: 'Follow-up agendado para ' + salva.codigo });
      if (ganhou) UI.toast('Proposta aprovada — pós-venda agendado conforme a cadência cadastrada.', 'ok');
      else UI.toast(orig ? 'Proposta atualizada.' : 'Proposta cadastrada: ' + salva.codigo, 'ok');
      onSalvo && onSalvo(salva); onClose();
    };
    const linhasOpts = R.opts('produto');
    const etapas = R.etapas();
    return html`<${Modal} size="lg" icon=${capex ? 'trending' : 'file'} title=${(orig ? 'Editar proposta ' + orig.codigo : duplicarDe ? 'Duplicar proposta ' + (base && base.codigo) : capex ? 'Nova proposta CAPEX' : 'Nova proposta')} sub=${capex ? 'Controle de propostas CAPEX' : 'Controle de propostas comerciais'} onClose=${onClose}
      footer=${html`<span class="small muted"><span style=${{ color: 'var(--orange)' }}>*</span> obrigatório</span><div class="spacer"></div><${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${salvar}>Salvar proposta</${Btn}>`}>
      <div class="form-section"><h4>Identificação</h4><div class="form-grid">
        <${Field} c="8" label="Cliente" req err=${err.clienteId}><${UI.ClienteSelect} value=${f.clienteId} onChange=${escolherCliente} err=${err.clienteId}/></${Field}>
        <${Field} c="4" label="Número da proposta" req err=${err.codigo} hint="Padrão: código do cliente + sequência + ano"><div class="row" style=${{ flexWrap: 'nowrap' }}><${Inp} value=${f.codigo} onChange=${v => set('codigo', v)} err=${err.codigo}/><${Btn} sm title="Gerar código" onClick=${() => f.clienteId ? set('codigo', R.novoCodigoProposta(f.clienteId, f.dataEntrada)) : UI.toast('Selecione o cliente.', 'err')}>Gerar</${Btn}></div></${Field}>
        <${Field} c="4" label="Sede / unidade"><${Sel} value=${f.sedeId} onChange=${v => set('sedeId', v)} options=${R.optsSedes(f.clienteId)} placeholder=${f.clienteId ? 'Selecione…' : 'Selecione o cliente'}/></${Field}>
        <${Field} c="4" label="Contato (responsável no cliente)"><${Sel} value=${f.contatoId} onChange=${v => set('contatoId', v)} options=${R.optsContatos(f.clienteId, f.sedeId)} placeholder=${f.clienteId ? 'Selecione…' : '—'}/></${Field}>
        <${Field} c="4" label="Data de emissão / entrada" req err=${err.dataEntrada}><${Inp} type="date" value=${f.dataEntrada} onChange=${v => set('dataEntrada', v)} err=${err.dataEntrada}/></${Field}>
        <${Field} c="12" label="Descrição / objeto da proposta" req err=${err.descricao}><${Inp} value=${f.descricao} onChange=${v => set('descricao', v)} err=${err.descricao}/></${Field}>
        <${Field} c="4" label="Responsável comercial" req err=${err.vendedorId}><${Sel} value=${f.vendedorId} onChange=${v => set('vendedorId', v)} options=${R.optsUsuarios(f.vendedorId)} err=${err.vendedorId}/></${Field}>
        <${Field} c="4" label="Responsável pela elaboração"><${Sel} value=${f.responsavelElaboracaoId} onChange=${v => set('responsavelElaboracaoId', v)} options=${R.optsUsuarios(f.responsavelElaboracaoId)}/></${Field}>
        <${Field} c="4" label="Revisão"><${Inp} value=${f.revisao} onChange=${v => set('revisao', v)} placeholder="ex.: Rev. 02"/></${Field}>
      </div></div>
      ${!capex && html`<div class="form-section"><h4>Classificação</h4><div class="form-grid">
        <${Field} c="12" label="Tipo da proposta (produtos e serviços)" req err=${err.linhas} hint="Seleção múltipla — o valor é informado por tipo"><${Chips} value=${f.linhas || []} onChange=${v => set('linhas', v)} options=${linhasOpts}/></${Field}>
        <${Field} c="4" label="Segmento"><${Sel} value=${op.segmentoId} onChange=${v => setO('segmentoId', v)} options=${R.opts('segmento', op.segmentoId)} placeholder=${cli ? 'Do cliente: ' + R.nomeLista(cli.segmentoId) : 'Selecione…'}/></${Field}>
        <${Field} c="4" label="Origem da oportunidade"><${Sel} value=${op.origemId} onChange=${v => setO('origemId', v)} options=${R.opts('origem', op.origemId)}/></${Field}>
        <${Field} c="4" label="Natureza"><${Sel} value=${op.natureza} onChange=${v => setO('natureza', v)} options=${R.NATUREZAS} vazio=${false}/></${Field}>
      </div></div>`}
      <div class="form-section"><h4>Informações comerciais</h4><div class="form-grid">
        ${capex ? html`<${Field} c="4" label="Valor CAPEX (R$)"><${Money} value=${(f.valores || {})[f.linhas[0] || 'nd']} onChange=${v => set('valores', { [f.linhas[0] || 'nd']: v })}/></${Field}>`
          : html`${(f.linhas || []).map(l => html`<${Field} key=${l} c="3" label=${'Valor ' + R.nomeLista(l) + ' (R$)'}><${Money} value=${(f.valores || {})[l]} onChange=${v => set('valores', { ...f.valores, [l]: v })}/></${Field}>`)}
            ${(f.valores || {}).nd ? html`<${Field} c="3" label="Valor não detalhado (R$)" hint="Histórico sem detalhamento por tipo"><${Money} value=${f.valores.nd} onChange=${v => set('valores', { ...f.valores, nd: v })}/></${Field}>` : null}
            ${Object.keys(f.valores || {}).filter(k => k !== 'nd' && !(f.linhas || []).includes(k) && f.valores[k]).map(k => html`<${Field} key=${k} c="3" label=${'Valor ' + R.nomeLista(k) + ' (tipo desmarcado)'}><${Money} value=${f.valores[k]} onChange=${v => set('valores', { ...f.valores, [k]: v })}/></${Field}>`)}
            <${Field} c="3" label="Valor total da proposta"><div class="inp num" style=${{ background: 'var(--navy-softer)', fontWeight: 600 }}>${U.brl(total)}</div></${Field}>`}
        <${Field} c="3" label="Moeda"><${Sel} value=${f.moeda} onChange=${v => set('moeda', v)} options=${R.MOEDAS} vazio=${false}/></${Field}>
        <${Field} c="3" label="Estimativa anterior (R$)" hint=${op.valorEstimado ? (R.faixaValor(op.valorEstimado) || {}).nome : R.nomeLista(f.faixaEstimadaId)}><${Money} value=${op.valorEstimado} onChange=${v => setO('valorEstimado', v)}/></${Field}>
        <${Field} c="3" label="Data limite (cliente)" err=${err.dataLimite}><${Inp} type="date" value=${f.dataLimite} onChange=${v => set('dataLimite', v)}/></${Field}>
        <${Field} c="3" label="Data de envio" err=${err.dataEnvio}><${Inp} type="date" value=${f.dataEnvio} onChange=${v => set('dataEnvio', v)} err=${err.dataEnvio}/></${Field}>
        <${Field} c="3" label="Validade da proposta"><${Inp} type="date" value=${f.validadeProposta} onChange=${v => set('validadeProposta', v)}/></${Field}>
        <${Field} c="3" label="Previsão de fechamento"><${Inp} type="date" value=${op.previsaoFechamento} onChange=${v => setO('previsaoFechamento', v)}/></${Field}>
        <${Field} c="12" label="Condições comerciais"><${Inp} value=${f.condicoesComerciais} onChange=${v => set('condicoesComerciais', v)} placeholder="Pagamento, frete, prazo de entrega…"/></${Field}>
      </div></div>
      <div class="form-section"><h4>Acompanhamento</h4><div class="form-grid">
        ${capex ? html`<${Field} c="4" label="Status da atividade CAPEX"><${Sel} value=${f.statusCapex} onChange=${v => set('statusCapex', v)} options=${R.lista('statusCapex').map(x => x.nome)}/></${Field}>`
          : html`<${Field} c="4" label="Status da proposta" req err=${err.status}><${Sel} value=${f.status} onChange=${v => set('status', v)} options=${R.lista('statusProposta').map(x => x.nome)} err=${err.status}/></${Field}>
            <${Field} c="4" label="Status da atividade (elaboração)"><${Sel} value=${f.statusElaboracao} onChange=${v => set('statusElaboracao', v)} options=${R.lista('statusElaboracao').map(x => x.nome)}/></${Field}>`}
        <${Field} c="4" label="Etapa do funil"><${Sel} value=${op.etapaId} onChange=${v => setO('etapaId', v)} options=${etapas.map(e => ({ v: e.id, l: e.nome }))} vazio=${false}/></${Field}>
        <${Field} c="4" label="Probabilidade de fechamento (%)" hint=${'Padrão da etapa: ' + U.num((DB.get('listas', op.etapaId) || {}).prob) + '%'}><${Inp} type="number" min="0" max="100" value=${op.probabilidade} onChange=${v => setO('probabilidade', v)}/></${Field}>
        <${Field} c="4" label="Responsável pelo acompanhamento"><${Sel} value=${f.responsavelAcompId} onChange=${v => set('responsavelAcompId', v)} options=${R.optsUsuarios(f.responsavelAcompId)} placeholder="Mesmo do comercial"/></${Field}>
        <${Field} c="4" label="Última atualização"><div class="inp" style=${{ background: 'var(--navy-softer)' }}>${orig ? U.dataHora(orig.atualizadoEm) : 'automática'}</div></${Field}>
        <${Field} c="8" label="Próxima ação" hint="Cria um follow-up na Agenda"><${Inp} value=${prox.acao} onChange=${v => setProx(x => ({ ...x, acao: v }))} placeholder="ex.: Ligar para confirmar recebimento"/></${Field}>
        <${Field} c="4" label="Data da próxima ação" err=${err.prox}><${Inp} type="date" value=${prox.data} onChange=${v => setProx(x => ({ ...x, data: v }))}/></${Field}>
        <${Field} c="6" label="Proposta enviada (link do arquivo)"><${Inp} value=${f.linkProposta} onChange=${v => set('linkProposta', v)} placeholder="URL (SharePoint/OneDrive)"/></${Field}>
        <${Field} c="6" label="Pasta na nuvem (link)"><${Inp} value=${f.linkPasta} onChange=${v => set('linkPasta', v)}/></${Field}>
        <${Field} c="12" label="Observações"><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)} rows=${2}/></${Field}>
      </div></div>
      ${!capex && html`<div class="form-section"><h4>Resultado</h4><div class="form-grid">
        <div class="field c12"><span><${Status} s=${resultado}/> <span class="small muted">definido pelo status da proposta</span></span></div>
        <${Field} c="3" label="Entrada do pedido" err=${err.dataPedido}><${Inp} type="date" value=${f.dataPedido} onChange=${v => set('dataPedido', v)}/></${Field}>
        <${Field} c="3" label="Valor fechado (R$)" hint="Se vazio, usa o valor proposto"><${Money} value=${f.valorFechado} onChange=${v => set('valorFechado', v)}/></${Field}>
        <${Field} c="3" label="Nº OC / contrato do cliente"><${Inp} value=${f.ocCliente} onChange=${v => set('ocCliente', v)}/></${Field}>
        <${Field} c="3" label="Motivo da perda" req=${resultado === 'perdida'} err=${err.motivoPerdaId}><${Sel} value=${f.motivoPerdaId} onChange=${v => set('motivoPerdaId', v)} options=${R.opts('motivoPerda', f.motivoPerdaId)} err=${err.motivoPerdaId} disabled=${resultado !== 'perdida' && !f.motivoPerdaId}/></${Field}>
        <${Field} c="3" label="Margem meta (%)"><${Inp} type="number" value=${f.margemMeta} onChange=${v => set('margemMeta', v)}/></${Field}>
        <${Field} c="3" label="Margem proposta (%)"><${Inp} type="number" value=${f.margemProposta} onChange=${v => set('margemProposta', v)}/></${Field}>
        <${Field} c="3" label="Margem fechada (%)"><${Inp} type="number" value=${f.margemFechada} onChange=${v => set('margemFechada', v)}/></${Field}>
        <${Field} c="3" label="Concorrentes"><${Inp} value=${op.concorrentes} onChange=${v => setO('concorrentes', v)}/></${Field}>
        ${(f.margemProposta !== null && f.margemMeta !== null && f.margemProposta !== undefined && f.margemProposta < f.margemMeta) && html`<${Field} c="12" label="Justificativa do desvio de margem"><${Inp} value=${f.justificativaMargem} onChange=${v => set('justificativaMargem', v)}/></${Field}>`}
      </div></div>`}
      <div class="form-section"><h4>Vínculos</h4><div class="form-grid">
        <${Field} c="4" label="Oportunidade (funil)"><${UI.Seg} value=${vinc} onChange=${setVinc} options=${[{ v: 'nova', l: orig && orig.oportunidadeId ? 'Manter atual' : 'Criar automaticamente' }, { v: 'existente', l: 'Vincular existente' }]}/></${Field}>
        ${vinc === 'existente' ? html`<${Field} c="8" label="Oportunidade do cliente" err=${err.oportunidadeId}><${Sel} value=${f.oportunidadeId} onChange=${v => { set('oportunidadeId', v); const o = DB.get('oportunidades', v); if (o) setOp(x => ({ ...x, etapaId: o.etapaId, probabilidade: o.probabilidade, origemId: o.origemId, segmentoId: o.segmentoId })); }} options=${oppsCli} placeholder=${oppsCli.length ? 'Selecione…' : 'Nenhuma oportunidade aberta'}/></${Field}>`
          : html`<div class="field c8 small muted" style=${{ justifyContent: 'flex-end' }}>${orig && orig.oportunidadeId ? 'Mantém a oportunidade vinculada: ' + ((DB.get('oportunidades', orig.oportunidadeId) || {}).titulo || '') : 'Uma oportunidade será criada no Funil de Vendas com os dados desta proposta (sem digitação dupla).'}</div>`}
        <${Field} c="6" label="STO vinculada"><${Sel} value=${f.stoId} onChange=${v => set('stoId', v)} options=${stosCli} placeholder=${stosCli.length ? 'Nenhuma' : 'Nenhuma STO disponível para o cliente'}/></${Field}>
        ${!capex && html`<${Field} c="6" label="Demanda de contrato guarda-chuva"><${Sel} value=${f.contratoId} onChange=${v => set('contratoId', v)} options=${ctsCli} placeholder=${ctsCli.length ? 'Não é demanda de contrato' : 'Cliente sem contrato'}/></${Field}>`}
      </div></div>
    </${Modal}>`;
  }
  CRM.MODAIS.propostaForm = PropostaForm;

  /* ---------- Detalhe da proposta ---------- */
  function PropostaDetalhe({ id, onClose }) {
    DB.useDB();
    const p = DB.get('propostas', id);
    if (!p) return html`<${Modal} title="Proposta não encontrada" onClose=${onClose}>O registro pode ter sido excluído.</${Modal}>`;
    const op = DB.get('oportunidades', p.oportunidadeId) || {};
    const sto = DB.get('stos', p.stoId); const ct = DB.get('contratos', p.contratoId);
    const ctOrigem = DB.all('contratos').find(c => c.propostaOrigemId === p.id);
    const ativs = (R.idx().atividadesPorProposta[p.id] || []).slice().sort((a, b) => U.cmp(b.data, a.data));
    const contato = DB.get('contatos', p.contatoId); const capex = p.categoria === 'CAPEX';
    const kv = (l, v) => html`<dt>${l}</dt><dd>${v === undefined || v === null || v === '' ? '—' : v}</dd>`;
    const gerarContrato = () => CRM.abrir('contrato', { inicial: { clienteId: p.clienteId, sedeId: p.sedeId, propostaOrigemId: p.id, numero: p.codigo, descricao: p.descricao, teto: R.valorAprovado(p), vendedorId: p.vendedorId, vigenciaInicio: p.dataPedido || U.hoje() } });
    return html`<${Modal} size="lg" icon=${capex ? 'trending' : 'file'} title=${'Proposta ' + (p.codigo || '')} sub=${R.nomeCliente(p.clienteId) + ' · ' + p.descricao} onClose=${onClose}
      footer=${html`<${Btn} icon=${p.arquivada ? 'restore' : 'archive'} onClick=${() => CRM.acoesProposta.arquivar(p)}>${p.arquivada ? 'Restaurar' : 'Arquivar'}</${Btn}>${ehAdmin() && html`<${Btn} v="danger" icon="trash" onClick=${async () => { await CRM.acoesProposta.excluir(p); if (!DB.get('propostas', id)) onClose(); }}>Excluir</${Btn}>`}
        <div class="spacer"></div>
        <${Btn} icon="calendar" onClick=${() => CRM.abrir('atividade', { inicial: { categoria: 'Follow-up', clienteId: p.clienteId, propostaId: p.id, oportunidadeId: p.oportunidadeId, responsavelId: p.responsavelAcompId || p.vendedorId, titulo: 'Follow-up proposta ' + p.codigo } })}>Registrar follow-up</${Btn}>
        ${!capex && R.resultado(p) === 'ganha' && !ctOrigem && html`<${Btn} icon="contract" onClick=${gerarContrato}>Gerar contrato</${Btn}>`}
        <${Btn} icon="copy" onClick=${() => CRM.acoesProposta.duplicar(p)}>Duplicar</${Btn}><${Btn} v="primary" icon="edit" onClick=${() => CRM.abrir('propostaForm', { id })}>Editar</${Btn}>`}>
      ${p.arquivada && html`<div class="notice warn mb"><${Icon} n="archive" s=${15}/>Proposta arquivada — não aparece nos controles e indicadores.</div>`}
      <div class="row mb"><${Status} s=${statusExib(p)}/>${!capex && R.ROTULO_RESULTADO[R.resultado(p)] !== p.status && html`<${Status} s=${R.resultado(p)}/>`}${p.statusElaboracao && html`<${Badge}>Elaboração: ${p.statusElaboracao}</${Badge}>`}${capex && html`<${Badge} c="violet">CAPEX</${Badge}>`}
        <span class="spacer"></span><span class="strong num" style=${{ fontSize: 18, color: 'var(--navy)' }}>${U.brl(R.valorTotal(p))}</span></div>
      <div class="grid g2">
        <${Card} title="Identificação e classificação"><dl class="kv">
          ${kv('Cliente', html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('clienteFicha', { id: p.clienteId }); }}>${R.nomeCliente(p.clienteId)}</a>`)}${kv('Sede', R.sede(p.sedeId) ? R.sede(p.sedeId).nome + ' — ' + cidadeUF(p) : cidadeUF(p))}
          ${kv('Contato', contato ? [contato.nome, contato.celular || contato.telefone, contato.email].filter(Boolean).join(' · ') : '')}${kv('Responsável', R.nomeUsuario(p.vendedorId))}${kv('Elaboração', R.nomeUsuario(p.responsavelElaboracaoId))}
          ${!capex && kv('Tipo', (p.linhas || []).map(R.nomeLista).join(', '))}${kv('Segmento', R.nomeLista(CRM.segmentoProposta(p)))}${kv('Origem', R.nomeLista(op.origemId))}${kv('Natureza', op.natureza)}${kv('Revisão', p.revisao)}
        </dl></${Card}>
        <${Card} title="Datas e valores"><dl class="kv">
          ${kv('Entrada', U.data(p.dataEntrada))}${kv('Data limite', U.data(p.dataLimite))}${kv('Envio', U.data(p.dataEnvio))}${kv('Dias de elaboração', R.diasElaboracao(p))}${kv('Validade', U.data(p.validadeProposta))}
          ${Object.keys(p.valores || {}).filter(k => p.valores[k]).map(k => kv('Valor ' + R.nomeLista(k), U.brl(p.valores[k])))}
          ${kv('Estimativa anterior', op.valorEstimado ? U.brl(op.valorEstimado) : R.nomeLista(p.faixaEstimadaId))}${kv('Condições', p.condicoesComerciais)}
          ${!capex && kv('Entrada do pedido', U.data(p.dataPedido))}${!capex && R.resultado(p) === 'ganha' && kv('Valor fechado', U.brl(R.valorAprovado(p)))}${!capex && R.resultado(p) === 'perdida' && kv('Motivo da perda', R.nomeLista(p.motivoPerdaId))}
          ${(p.margemMeta || p.margemProposta || p.margemFechada) ? kv('Margens (meta/prop./fech.)', [p.margemMeta, p.margemProposta, p.margemFechada].map(x => x === null || x === undefined || x === '' ? '—' : x + '%').join(' / ')) : null}
        </dl></${Card}>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Vínculos"><dl class="kv">
          ${kv('Oportunidade', op.id ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('oportunidade', { id: op.id }); }}>${op.titulo}</a>` : '')}${kv('Etapa do funil', R.nomeLista(op.etapaId) + (op.id ? ' · ' + R.probOp(op) + '%' : ''))}
          ${kv('STO', sto ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('stoForm', { id: sto.id }); }}>${sto.numero}</a>` : '')}
          ${kv('Contrato (demanda)', ct ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('contrato', { id: ct.id }); }}>${ct.numero}</a>` : '')}
          ${ctOrigem && kv('Contrato originado', html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('contrato', { id: ctOrigem.id }); }}>${ctOrigem.numero}</a>`)}
          ${kv('Arquivo da proposta', p.linkProposta ? html`<a href=${p.linkProposta} target="_blank" rel="noopener">abrir ↗</a>` : '')}${kv('Pasta', p.linkPasta ? html`<a href=${p.linkPasta} target="_blank" rel="noopener">abrir ↗</a>` : '')}
          ${kv('Observações', p.observacoes)}${kv('Origem do dado', p.origemDado)}
        </dl></${Card}>
        <${Card} title="Follow-ups e atividades" sub=${ativs.length + ' registro(s)'}>
          ${ativs.length ? ativs.slice(0, 10).map(a => html`<div key=${a.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('atividade', { id: a.id })}><${Status} s=${a.status}/><div style=${{ flex: 1, minWidth: 0 }}><div class="ellipsis">${a.titulo}</div><div class="small muted">${U.data(a.data)} · ${R.curtoUsuario(a.responsavelId)}${a.resultado ? ' · ' + a.resultado : ''}</div></div></div>`) : html`<div class="small muted">Nenhum follow-up registrado.</div>`}
        </${Card}>
      </div>
      <${Card} className="mt" title="Histórico da proposta"><${UI.Timeline} itens=${(p.historico || []).slice().reverse()}/></${Card}>
      ${p.legado && html`<details class="mt small"><summary class="muted">Campos preservados do CRM anterior (legado)</summary><pre style=${{ whiteSpace: 'pre-wrap', fontSize: 11 }}>${JSON.stringify(p.legado, null, 2)}</pre></details>`}
    </${Modal}>`;
  }
  CRM.MODAIS.propostaDetalhe = PropostaDetalhe;

  Object.assign(CRM.ROTAS, {
    'propostas/controle': () => html`<${Controle} categoria="Comercial"/>`,
    'capex/controle': () => html`<${Controle} categoria="CAPEX"/>`,
  });
})();
