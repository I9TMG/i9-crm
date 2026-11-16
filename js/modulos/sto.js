/* =========================================================
   STO — Solicitação Técnica de Orçamento
   Vinculada ao cadastro de clientes e de equipamentos
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Chips, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Seg } = UI;

  const tem = (s, nome) => (s.tipos || []).includes(R.idLista('produto', nome));
  /** Pendências obrigatórias (ISO 9001) para emitir proposta — regra herdada do CRM R17. */
  R.stoFaltando = s => {
    const m = [];
    if (!s.atividade) m.push('atividade');
    if (!(s.tipos || []).length) m.push('tipo de orçamento');
    if (tem(s, 'Fabricação') && !(s.equipamentos || []).length) m.push('equipamentos (fabricação)');
    if (tem(s, 'Projeto') && !(s.projeto || {}).tipoId) m.push('tipo de projeto');
    const c = s.condicoes || {}; if (!(c.financeira || c.fabril || c.qualidade || c.legal)) m.push('condições de atender');
    if (!(s.revisoes || []).length) m.push('revisão');
    return m;
  };
  const novoNumero = clienteId => {
    const c = R.cliente(clienteId); const base = ((c && c.codigo) || 'STO') + '_STO';
    const usados = new Set(DB.all('stos').map(s => s.numero)); let n = 1, num;
    do { num = base + String(n).padStart(2, '0'); n++; } while (usados.has(num));
    return num;
  };

  /* ---------- Lista de STO ---------- */
  function StoLista() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', cli: '', equip: '', resp: '', sit: '', comp: '', ini: '', fim: '' }, 'sto');
    const rows = useMemo(() => {
      const t = U.normTxt(f.q);
      return DB.all('stos').filter(s => (!t || U.normTxt([s.numero, s.atividade, R.nomeCliente(s.clienteId), (DB.get('propostas', s.propostaId) || {}).codigo].join(' ')).includes(t))
        && (!f.cli || s.clienteId === f.cli) && (!f.equip || (s.equipamentos || []).some(e => e.equipamentoId === f.equip)) && (!f.resp || s.responsavelId === f.resp) && (!f.sit || s.situacao === f.sit)
        && (!f.comp || (f.comp === 'ok' ? !R.stoFaltando(s).length : R.stoFaltando(s).length > 0)) && (!(f.ini || f.fim) || U.noPeriodo(s.dataAbertura, f.ini, f.fim)) && R.doUsuario(s, 'responsavelId'));
    }, [DB.version, f]);
    const incompletas = rows.filter(s => R.stoFaltando(s).length && s.situacao !== 'Cancelada');
    const cols = [
      { k: 'numero', t: 'Nº STO', r: s => html`<span class="small num strong">${s.numero}</span>` }, { k: 'dataAbertura', t: 'Abertura', r: s => U.data(s.dataAbertura) },
      { k: 'cli', t: 'Cliente', v: s => R.nomeCliente(s.clienteId), r: s => html`<div><div class="strong">${R.nomeCliente(s.clienteId)}</div><div class="small muted">${R.localSede(s.sedeId)}</div></div>` },
      { k: 'atividade', t: 'Atividade', r: s => html`<span class="ellipsis" style=${{ maxWidth: 240, display: 'inline-block' }} title=${s.atividade}>${s.atividade || html`<span class="muted">—</span>`}</span>` },
      { k: 'tipos', t: 'Tipo de orçamento', v: s => (s.tipos || []).map(R.nomeLista).join(', '), r: s => html`<span class="small">${(s.tipos || []).map(R.nomeLista).join(', ')}</span>` },
      { k: 'equip', t: 'Equipamentos', v: s => (s.equipamentos || []).length, r: s => html`<span class="small">${(s.equipamentos || []).map(e => e.nome).join(', ') || '—'}</span>` },
      { k: 'resp', t: 'Responsável', v: s => R.nomeUsuario(s.responsavelId), r: s => R.curtoUsuario(s.responsavelId) },
      { k: 'comp', t: 'ISO', v: s => R.stoFaltando(s).length, r: s => { const m = R.stoFaltando(s); return m.length ? html`<${Badge} c="amber" title=${'Falta: ' + m.join(', ')}>Incompleta (${m.length})</${Badge}>` : html`<${Badge} c="green">Completa</${Badge}>`; } },
      { k: 'situacao', t: 'Situação', r: s => html`<${Status} s=${s.situacao}/>` },
      { k: 'prop', t: 'Proposta', v: s => (DB.get('propostas', s.propostaId) || {}).codigo, r: s => { const p = DB.get('propostas', s.propostaId); return p ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('propostaDetalhe', { id: p.id }); }}>${p.codigo}</a>` : html`<span class="muted">—</span>`; } },
    ];
    const exportar = () => U.exportarExcel('STO_' + U.hoje() + '.xlsx', [{ nome: 'STO', linhas: rows, colunas: [{ t: 'Nº STO', v: s => s.numero }, { t: 'Abertura', v: s => s.dataAbertura }, { t: 'Cliente', v: s => R.nomeCliente(s.clienteId) }, { t: 'Sede', v: s => R.localSede(s.sedeId) }, { t: 'Atividade', v: s => s.atividade }, { t: 'Data prevista', v: s => s.dataPrevista }, { t: 'Local', v: s => s.local }, { t: 'Frete', v: s => R.nomeLista(s.freteId) },
      { t: 'Tipo de orçamento', v: s => (s.tipos || []).map(R.nomeLista).join(', ') }, { t: 'Equipamentos', v: s => (s.equipamentos || []).map(e => e.nome).join(', ') }, { t: 'Responsável', v: s => R.nomeUsuario(s.responsavelId) }, { t: 'Situação', v: s => s.situacao }, { t: 'Pendências ISO', v: s => R.stoFaltando(s).join(', ') }, { t: 'Revisão atual', v: s => (s.revisoes || []).length ? 'Rev ' + s.revisoes[s.revisoes.length - 1].rev : '' }, { t: 'Proposta', v: s => (DB.get('propostas', s.propostaId) || {}).codigo }] }]);
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} icon="download" onClick=${exportar}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('stoForm', {})}>Nova STO</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Nº, atividade, cliente ou proposta"/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${FSel} label="Equipamento" value=${f.equip} onChange=${v => set('equip', v)} options=${DB.all('equipamentos').slice().sort((a, b) => U.cmp(a.nome, b.nome)).map(e => ({ v: e.id, l: e.nome }))}/>
        <${FSel} label="Responsável" value=${f.resp} onChange=${v => set('resp', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Situação" value=${f.sit} onChange=${v => set('sit', v)} options=${R.SITUACOES_STO}/>
        <${FSel} label="Completude ISO" value=${f.comp} onChange=${v => set('comp', v)} options=${[{ v: 'ok', l: 'Completas' }, { v: 'pend', l: 'Com pendências' }]}/>
        <${UI.FPeriodo} label="Período (abertura)" ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
      </${Filtros}>
      <div class="grid g4 mb"><${Kpi} label="STO no filtro" value=${U.int(rows.length)}/><${Kpi} label="Em elaboração" value=${U.int(rows.filter(s => ['Aberta', 'Em elaboração'].includes(s.situacao)).length)}/>
        <${Kpi} label="Com proposta emitida" value=${U.int(rows.filter(s => s.propostaId).length)}/><${Kpi} label="Pendências ISO" value=${U.int(incompletas.length)} foot="obrigatório antes de emitir proposta" accent/></div>
      <${Card} pad=${false} title="Solicitações Técnicas de Orçamento" sub="Clique para abrir, atualizar e consultar o histórico"><${Table} cols=${cols} rows=${rows} sortInicial=${{ k: 'dataAbertura', d: 'desc' }} onRow=${s => CRM.abrir('stoForm', { id: s.id })}/></${Card}>
    </div>`;
  }

  /* ---------- Formulário de STO ---------- */
  function StoForm({ id, inicial, onClose }) {
    DB.useDB();
    const orig = id ? DB.get('stos', id) : null;
    const [f, setF] = useState(() => orig ? JSON.parse(JSON.stringify(orig)) : { numero: '', oportunidadeId: '', propostaId: '', clienteId: '', sedeId: '', responsavelId: R.vendoComo() || '', dataAbertura: U.hoje(), dataPrevista: '', atividade: '', local: '', freteId: '', tipos: [], consulta: false, produto: '', densidade: '', granulometria: '', umidade: '', info: '', equipamentos: [], peca: { equipamentos: '', itens: '' }, manutencao: { equipamentos: [], itens: '' }, aluguel: { itemId: '', obs: '' }, obra: { inicio: '', fim: '', infra: [], obs: '' }, projeto: { tipoId: '', premissa: '' }, treinamentos: '', maoObra: { funcoes: '', periodo: '' }, escopo: [], escopoObs: '', condicoes: { financeira: false, fabril: false, qualidade: false, legal: false, outros: '' }, revisoes: [], situacao: 'Aberta', atualizacoes: [], observacoes: '', ...(inicial || {}) });
    const [err, setErr] = useState({}); const [todosEq, setTodosEq] = useState(false); const [nota, setNota] = useState('');
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const setSub = (o, k, v) => setF(x => ({ ...x, [o]: { ...(x[o] || {}), [k]: v } }));
    const cli = R.cliente(f.clienteId);
    const falta = R.stoFaltando(f);
    const eqDisp = DB.all('equipamentos').filter(e => e.ativo !== false && (todosEq || !cli || !(e.segmentoIds || []).length || (e.segmentoIds || []).includes(cli.segmentoId))).sort((a, b) => U.cmp(a.nome, b.nome));
    const prop = DB.get('propostas', f.propostaId);
    const salvar = (fechar = true) => {
      const e = {};
      if (!f.clienteId) e.clienteId = 'Selecione o cliente';
      if (!(f.atividade || '').trim()) e.atividade = 'Obrigatório';
      if (!f.responsavelId) e.responsavelId = 'Obrigatório';
      if (!f.dataAbertura) e.dataAbertura = 'Obrigatório';
      setErr(e); if (Object.keys(e).length) { UI.toast('Preencha os campos obrigatórios.', 'err'); return null; }
      let rec = { ...f, numero: f.numero || novoNumero(f.clienteId) };
      if (!rec.oportunidadeId) {
        const op = DB.save('oportunidades', { titulo: rec.atividade, clienteId: rec.clienteId, sedeId: rec.sedeId, contatoId: '', vendedorId: (cli && cli.vendedorId) || rec.responsavelId, segmentoId: cli ? cli.segmentoId : '', origemId: cli ? cli.origemId : '', etapaId: R.idLista('etapa', 'Diagnóstico e visita técnica') || R.etapas()[0].id, probabilidade: null, valorEstimado: null, natureza: rec.consulta ? 'Consulta de preço' : 'Proposta efetiva', qualificacao: { escopo: false, demanda: false, decisor: false, pedido: false }, perdida: false, historicoEtapas: [{ etapaId: R.idLista('etapa', 'Diagnóstico e visita técnica'), data: U.hoje(), usuario: DB.usuarioAtual() }] }, { resumo: 'Oportunidade criada pela STO ' + rec.numero, silencioso: true });
        rec.oportunidadeId = op.id;
      }
      if (nota.trim()) rec.atualizacoes = (rec.atualizacoes || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), texto: nota.trim() });
      if (orig && orig.situacao !== rec.situacao) rec.atualizacoes = (rec.atualizacoes || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), texto: 'Situação: ' + orig.situacao + ' → ' + rec.situacao });
      if (!orig) rec.atualizacoes = (rec.atualizacoes || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), texto: 'STO aberta' });
      const s = DB.save('stos', rec, { resumo: (orig ? 'STO alterada ' : 'STO aberta ') + rec.numero });
      setNota(''); UI.toast(orig ? 'STO atualizada.' : 'STO criada: ' + s.numero, 'ok');
      if (fechar) onClose(); else setF(JSON.parse(JSON.stringify(s)));
      return s;
    };
    const gerarProposta = () => {
      if (falta.length) return UI.toast('STO incompleta (ISO 9001) — falta: ' + falta.join(', '), 'err');
      const s = salvar(false); if (!s) return;
      onClose();
      CRM.abrir('propostaForm', { inicial: { clienteId: s.clienteId, sedeId: s.sedeId, stoId: s.id, oportunidadeId: s.oportunidadeId, descricao: s.atividade, linhas: (s.tipos || []).filter(t => t !== R.idLista('produto', 'Capex')), vendedorId: (cli && cli.vendedorId) || s.responsavelId, responsavelElaboracaoId: s.responsavelId, categoria: tem(s, 'Capex') && (s.tipos || []).length === 1 ? 'CAPEX' : 'Comercial' } });
    };
    const excluir = async () => {
      if (prop) return UI.toast('STO vinculada à proposta ' + prop.codigo + '. Altere a situação para "Cancelada" ou desvincule na proposta.', 'err');
      if (!await UI.confirmar('Excluir esta STO?', { perigo: true, ok: 'Excluir' })) return;
      DB.remove('stos', id, { resumo: 'STO excluída: ' + f.numero }); UI.toast('STO excluída.', 'ok'); onClose();
    };
    const novaRev = () => setF(x => ({ ...x, revisoes: (x.revisoes || []).concat({ rev: (x.revisoes || []).length ? Math.max(...x.revisoes.map(r => Number(r.rev) || 0)) + 1 : 0, data: U.hoje(), usuario: DB.usuarioAtual(), obs: '' }) }));
    const addEq = eid => { const e = DB.get('equipamentos', eid); if (!e) return; setF(x => ({ ...x, equipamentos: (x.equipamentos || []).concat({ equipamentoId: e.id, nome: e.nome, premissas: {}, obs: '' }) })); };
    const setEq = (i, k, v) => setF(x => ({ ...x, equipamentos: x.equipamentos.map((e, j) => j === i ? { ...e, premissas: { ...e.premissas, [k]: v } } : e) }));
    return html`<${Modal} size="lg" icon="wrench" title=${orig ? 'STO ' + orig.numero : 'Nova STO'} sub=${cli ? cli.nomeFantasia : 'Solicitação Técnica de Orçamento'} onClose=${onClose}
      footer=${html`${orig && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}<div class="spacer"></div>
        ${prop ? html`<${Btn} icon="file" onClick=${() => CRM.abrir('propostaDetalhe', { id: prop.id })}>Ver proposta ${prop.codigo}</${Btn}>` : html`<${Btn} icon="file" onClick=${gerarProposta} title="Exige STO completa (ISO 9001)">Gerar proposta</${Btn}>`}
        <${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${() => salvar(true)}>Salvar STO</${Btn}>`}>
      ${falta.length > 0 ? html`<div class="notice warn mb"><${Icon} n="alert" s=${15}/><div><b>STO incompleta (ISO 9001)</b> — obrigatório para emitir proposta. Falta: ${falta.join(', ')}.</div></div>` : html`<div class="notice mb"><${Icon} n="check" s=${15} c="var(--green)"/>STO completa — pronta para gerar a proposta.</div>`}
      <div class="form-section"><h4>Identificação</h4><div class="form-grid">
        <${Field} c="8" label="Cliente" req err=${err.clienteId}><${UI.ClienteSelect} value=${f.clienteId} onChange=${v => { const s = (R.idx().sedesPorCliente[v] || [])[0]; setF(x => ({ ...x, clienteId: v, sedeId: s ? s.id : '' })); }} err=${err.clienteId} disabled=${!!prop}/></${Field}>
        <${Field} c="4" label="Nº da STO" hint="Gerado automaticamente"><${Inp} value=${f.numero} onChange=${v => set('numero', v)} placeholder="automático"/></${Field}>
        <${Field} c="4" label="Sede"><${Sel} value=${f.sedeId} onChange=${v => set('sedeId', v)} options=${R.optsSedes(f.clienteId)}/></${Field}>
        <${Field} c="4" label="Responsável" req err=${err.responsavelId}><${Sel} value=${f.responsavelId} onChange=${v => set('responsavelId', v)} options=${R.optsUsuarios(f.responsavelId)} err=${err.responsavelId}/></${Field}>
        <${Field} c="2" label="Abertura" req err=${err.dataAbertura}><${Inp} type="date" value=${f.dataAbertura} onChange=${v => set('dataAbertura', v)}/></${Field}>
        <${Field} c="2" label="Data prevista"><${Inp} type="date" value=${f.dataPrevista} onChange=${v => set('dataPrevista', v)}/></${Field}>
        <${Field} c="12" label="Atividade / descrição da solicitação" req err=${err.atividade}><${Inp} value=${f.atividade} onChange=${v => set('atividade', v)} err=${err.atividade}/></${Field}>
        <${Field} c="5" label="Local da atividade"><${Inp} value=${f.local} onChange=${v => set('local', v)}/></${Field}>
        <${Field} c="3" label="Tipo de frete"><${Sel} value=${f.freteId} onChange=${v => set('freteId', v)} options=${R.opts('tipoFrete', f.freteId)}/></${Field}>
        <${Field} c="4" label="Situação"><${Sel} value=${f.situacao} onChange=${v => set('situacao', v)} options=${R.SITUACOES_STO} vazio=${false}/></${Field}>
        <div class="field c12"><${Check} checked=${f.consulta} onChange=${v => set('consulta', v)} label="Consulta de preço (gera consulta, não proposta efetiva)"/></div>
      </div></div>
      <div class="form-section"><h4>Tipo de orçamento</h4><${Chips} value=${f.tipos} onChange=${v => set('tipos', v)} options=${R.opts('produto')}/></div>
      <div class="form-section"><h4>Contexto do produto</h4><div class="form-grid">
        <${Field} c="3" label="Produto"><${Inp} value=${f.produto} onChange=${v => set('produto', v)}/></${Field}><${Field} c="3" label="Densidade"><${Inp} value=${f.densidade} onChange=${v => set('densidade', v)}/></${Field}>
        <${Field} c="3" label="Granulometria"><${Inp} value=${f.granulometria} onChange=${v => set('granulometria', v)}/></${Field}><${Field} c="3" label="Umidade"><${Inp} value=${f.umidade} onChange=${v => set('umidade', v)}/></${Field}>
        <${Field} c="12" label="Informações técnicas adicionais"><${Txt} value=${f.info} onChange=${v => set('info', v)} rows=${2}/></${Field}></div></div>
      <div class="form-section"><h4>Equipamentos <span class="spacer"></span><${Check} checked=${todosEq} onChange=${setTodosEq} label="ver todos os segmentos"/></h4>
        ${(f.equipamentos || []).map((e, i) => { const cat = DB.get('equipamentos', e.equipamentoId); const prem = (cat && cat.premissas) || []; return html`<div key=${i} class="card" style=${{ padding: 10, marginBottom: 8 }}>
          <div class="row"><b>${e.nome}</b>${!cat && html`<${Badge} c="amber">fora do catálogo</${Badge}>`}<div class="spacer"></div><${Btn} sm v="ghost" icon="trash" onClick=${() => setF(x => ({ ...x, equipamentos: x.equipamentos.filter((_, j) => j !== i) }))}/></div>
          <div class="form-grid mt">${prem.map(p => html`<${Field} key=${p.k} c="3" label=${p.l}>${p.t === 's' ? html`<${Sel} value=${(e.premissas || {})[p.k]} onChange=${v => setEq(i, p.k, v)} options=${p.o || []}/>` : html`<${Inp} type=${p.t === 'n' ? 'number' : 'text'} value=${(e.premissas || {})[p.k]} onChange=${v => setEq(i, p.k, v)}/>`}</${Field}>`)}
            ${!prem.length && html`<${Field} c="12" label="Premissas (texto livre)"><${Inp} value=${(e.premissas || {}).texto} onChange=${v => setEq(i, 'texto', v)}/></${Field}>`}
            ${Object.keys(e.premissas || {}).filter(k => k !== 'texto' && !prem.some(p => p.k === k)).map(k => html`<${Field} key=${k} c="3" label=${k + ' (anterior)'}><${Inp} value=${e.premissas[k]} onChange=${v => setEq(i, k, v)}/></${Field}>`)}</div></div>`; })}
        <div class="row"><${Sel} value="" onChange=${addEq} options=${eqDisp.map(e => ({ v: e.id, l: e.nome }))} placeholder="+ Adicionar equipamento do cadastro…" style=${{ maxWidth: 380 }}/>
          ${tem(f, 'Fabricação') && !(f.equipamentos || []).length && html`<span class="small" style=${{ color: 'var(--amber)' }}>Obrigatório para Fabricação.</span>`}</div></div>
      ${tem(f, 'Obra') && html`<div class="form-section"><h4>Obra</h4><div class="form-grid">
        <${Field} c="3" label="Início previsto"><${Inp} type="date" value=${f.obra.inicio} onChange=${v => setSub('obra', 'inicio', v)}/></${Field}><${Field} c="3" label="Fim previsto"><${Inp} type="date" value=${f.obra.fim} onChange=${v => setSub('obra', 'fim', v)}/></${Field}>
        <${Field} c="12" label="Infraestrutura necessária"><${Chips} value=${f.obra.infra || []} onChange=${v => setSub('obra', 'infra', v)} options=${R.INFRA_OBRA.map(([v, l]) => ({ v, l }))}/></${Field}>
        <${Field} c="12" label="Observações da obra"><${Txt} value=${f.obra.obs} onChange=${v => setSub('obra', 'obs', v)} rows=${2}/></${Field}></div></div>`}
      ${tem(f, 'Projeto') && html`<div class="form-section"><h4>Projeto</h4><div class="form-grid">
        <${Field} c="4" label="Tipo de projeto"><${Sel} value=${f.projeto.tipoId} onChange=${v => setSub('projeto', 'tipoId', v)} options=${R.opts('tipoProjeto', f.projeto.tipoId)}/></${Field}>
        <${Field} c="8" label="Premissa para proposta técnica e comercial"><${Inp} value=${f.projeto.premissa} onChange=${v => setSub('projeto', 'premissa', v)}/></${Field}></div></div>`}
      ${tem(f, 'Peça de Reposição') && html`<div class="form-section"><h4>Peça de reposição</h4><div class="form-grid">
        <${Field} c="6" label="Equipamento"><${Inp} value=${f.peca.equipamentos} onChange=${v => setSub('peca', 'equipamentos', v)}/></${Field}><${Field} c="6" label="Itens a substituir"><${Inp} value=${f.peca.itens} onChange=${v => setSub('peca', 'itens', v)} placeholder="ex.: canecas, correia, mancais…"/></${Field}></div></div>`}
      ${tem(f, 'Manutenção') && html`<div class="form-section"><h4>Manutenção</h4><div class="form-grid">
        <${Field} c="12" label="Itens de manutenção"><${Chips} value=${(f.manutencao.itensIds || [])} onChange=${v => setSub('manutencao', 'itensIds', v)} options=${R.opts('itemManutencao')}/></${Field}>
        <${Field} c="12" label="Equipamentos e detalhes"><${Inp} value=${f.manutencao.itens} onChange=${v => setSub('manutencao', 'itens', v)}/></${Field}></div></div>`}
      ${tem(f, 'Aluguel') && html`<div class="form-section"><h4>Aluguel</h4><div class="form-grid">
        <${Field} c="5" label="Item a alugar"><${Sel} value=${f.aluguel.itemId} onChange=${v => setSub('aluguel', 'itemId', v)} options=${R.opts('itemAluguel', f.aluguel.itemId)}/></${Field}><${Field} c="7" label="Especificação / período"><${Inp} value=${f.aluguel.obs} onChange=${v => setSub('aluguel', 'obs', v)}/></${Field}></div></div>`}
      ${tem(f, 'Treinamentos') && html`<div class="form-section"><h4>Treinamentos</h4><${Inp} value=${f.treinamentos} onChange=${v => set('treinamentos', v)} placeholder="Treinamentos a ministrar"/></div>`}
      ${tem(f, 'Mão de Obra') && html`<div class="form-section"><h4>Mão de obra</h4><div class="form-grid">
        <${Field} c="8" label="Funções a mobilizar"><${Inp} value=${f.maoObra.funcoes} onChange=${v => setSub('maoObra', 'funcoes', v)} placeholder="ex.: soldador, montador…"/></${Field}><${Field} c="4" label="Período esperado"><${Inp} value=${f.maoObra.periodo} onChange=${v => setSub('maoObra', 'periodo', v)} placeholder="ex.: 45 dias"/></${Field}></div></div>`}
      <div class="form-section"><h4>Escopo incluso</h4><${Chips} value=${f.escopo} onChange=${v => set('escopo', v)} options=${R.ESCOPO_STO.map(([v, l]) => ({ v, l }))}/>
        <div class="mt"><${Inp} value=${f.escopoObs} onChange=${v => set('escopoObs', v)} placeholder="Informações adicionais do escopo"/></div></div>
      <div class="form-section"><h4>Condições de atender o cliente</h4><div class="row" style=${{ gap: 18 }}>
        <${Check} checked=${f.condicoes.financeira} onChange=${v => setSub('condicoes', 'financeira', v)} label="Capacidade financeira"/><${Check} checked=${f.condicoes.fabril} onChange=${v => setSub('condicoes', 'fabril', v)} label="Fabril e produção"/>
        <${Check} checked=${f.condicoes.qualidade} onChange=${v => setSub('condicoes', 'qualidade', v)} label="Qualidade"/><${Check} checked=${f.condicoes.legal} onChange=${v => setSub('condicoes', 'legal', v)} label="Requisitos legais"/></div>
        <div class="mt"><${Inp} value=${f.condicoes.outros} onChange=${v => setSub('condicoes', 'outros', v)} placeholder="Outros (qual?)"/></div></div>
      <div class="grid g2">
        <div class="form-section"><h4>Revisões <span class="spacer"></span><${Btn} sm icon="plus" onClick=${novaRev}>Nova revisão</${Btn}></h4>
          ${(f.revisoes || []).length ? f.revisoes.map((r, i) => html`<div key=${i} class="list-item"><${Badge} c="navy">Rev ${r.rev}</${Badge}><span class="small">${U.data(r.data)} · ${r.usuario || '—'}</span></div>`) : html`<div class="small muted">Nenhuma revisão (obrigatório: Rev 0).</div>`}</div>
        <div class="form-section"><h4>Atualizações e histórico</h4>
          <div class="row" style=${{ flexWrap: 'nowrap' }}><${Inp} value=${nota} onChange=${setNota} placeholder="Registrar atualização (salva com a STO)"/></div>
          <div class="mt" style=${{ maxHeight: 180, overflow: 'auto' }}>${(f.atualizacoes || []).slice().reverse().map((a, i) => html`<div key=${i} class="small" style=${{ padding: '4px 0', borderBottom: '1px solid var(--line-2)' }}><span class="muted">${U.dataHora(a.data)} · ${a.usuario}</span><div>${a.texto}</div></div>`)}</div></div>
      </div>
      <div class="form-section"><h4>Observações</h4><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)} rows=${2}/></div>
    </${Modal}>`;
  }
  CRM.MODAIS.stoForm = StoForm;

  CRM.ROTAS['sto'] = StoLista;
})();
