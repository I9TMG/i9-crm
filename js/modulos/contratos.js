/* =========================================================
   CONTRATOS — guarda-chuva (por demanda), vinculados a propostas
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Money, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi } = UI;

  const filtrar = f => DB.all('contratos').filter(c => {
    const sit = R.situacaoContrato(c); const h = U.hoje();
    return (!f.cli || c.clienteId === f.cli) && (!f.resp || c.vendedorId === f.resp) && (!f.sit || sit === f.sit) && (!f.cat || c.categoriaId === f.cat) && R.doUsuario(c)
      && (!f.q || U.normTxt([c.numero, c.descricao, R.nomeCliente(c.clienteId)].join(' ')).includes(U.normTxt(f.q)))
      && (!f.venc || (f.venc === 'vencidos' ? sit === 'Vencido' : c.vigenciaFim && c.vigenciaFim >= h && c.vigenciaFim <= U.addDias(h, Number(f.venc))));
  });

  function ContratosLista() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', cli: '', resp: '', sit: '', venc: '', cat: '' }, 'contratos');
    const rows = useMemo(() => filtrar(f), [DB.version, f]);
    const cols = [
      { k: 'numero', t: 'Contrato', r: c => html`<span class="num strong">${c.numero}</span>` }, { k: 'cli', t: 'Cliente', v: c => R.nomeCliente(c.clienteId), r: c => R.nomeCliente(c.clienteId) },
      { k: 'descricao', t: 'Descrição', r: c => html`<span class="ellipsis" style=${{ maxWidth: 220, display: 'inline-block' }}>${c.descricao}</span>` }, { k: 'cat', t: 'Categoria', v: c => R.nomeLista(c.categoriaId), r: c => html`<span class="small">${R.nomeLista(c.categoriaId)}</span>` },
      { k: 'prop', t: 'Proposta de origem', v: c => (DB.get('propostas', c.propostaOrigemId) || {}).codigo, r: c => { const p = DB.get('propostas', c.propostaOrigemId); return p ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('propostaDetalhe', { id: p.id }); }}>${p.codigo}</a>` : '—'; } },
      { k: 'vig', t: 'Vigência', v: c => c.vigenciaFim, r: c => html`<span class="small">${U.data(c.vigenciaInicio)} a ${U.data(c.vigenciaFim)}</span>` },
      { k: 'teto', t: 'Teto', al: 'r', v: c => U.num(c.teto), r: c => U.brlK(c.teto) },
      { k: 'cons', t: 'Consumido', al: 'r', v: c => R.consumoContrato(c).consumido, r: c => U.brlK(R.consumoContrato(c).consumido) },
      { k: 'saldo', t: 'Saldo', al: 'r', v: c => R.consumoContrato(c).saldo, r: c => html`<span class=${R.consumoContrato(c).saldo < 0 ? 'delta-down' : ''}>${U.brlK(R.consumoContrato(c).saldo)}</span>` },
      { k: 'pct', t: '% consumido', v: c => R.consumoContrato(c).pct, r: c => { const p = R.consumoContrato(c).pct; return html`<div style=${{ minWidth: 110 }}><div class="small num">${U.pct(p, 0)}</div><${UI.Bar} v=${p} cor=${p >= .8 ? 'var(--orange)' : 'var(--navy)'}/></div>`; } },
      { k: 'resp', t: 'Responsável', r: c => R.curtoUsuario(c.vendedorId) }, { k: 'sit', t: 'Situação', v: R.situacaoContrato, r: c => html`<${Status} s=${R.situacaoContrato(c)}/>` },
    ];
    const exportar = () => U.exportarExcel('Contratos_' + U.hoje() + '.xlsx', [{ nome: 'Contratos', linhas: rows, colunas: [{ t: 'Contrato', v: c => c.numero }, { t: 'Cliente', v: c => R.nomeCliente(c.clienteId) }, { t: 'Descrição', v: c => c.descricao }, { t: 'Categoria', v: c => R.nomeLista(c.categoriaId) }, { t: 'Proposta de origem', v: c => (DB.get('propostas', c.propostaOrigemId) || {}).codigo }, { t: 'Início', v: c => c.vigenciaInicio }, { t: 'Término', v: c => c.vigenciaFim }, { t: 'Teto (R$)', v: c => c.teto }, { t: 'Consumido (R$)', v: c => R.consumoContrato(c).consumido }, { t: 'Saldo (R$)', v: c => R.consumoContrato(c).saldo }, { t: 'Responsável', v: c => R.nomeUsuario(c.vendedorId) }, { t: 'Situação', v: R.situacaoContrato }, { t: 'OC do cliente', v: c => c.ocCliente }] },
      { nome: 'Demandas', linhas: DB.all('propostas').filter(p => p.contratoId && rows.some(c => c.id === p.contratoId)), colunas: [{ t: 'Contrato', v: p => (DB.get('contratos', p.contratoId) || {}).numero }, { t: 'Proposta', v: p => p.codigo }, { t: 'Descrição', v: p => p.descricao }, { t: 'Status', v: p => p.status }, { t: 'Valor', v: R.valorTotal }, { t: 'Valor aprovado', v: R.valorAprovado }] }]);
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} icon="download" onClick=${exportar}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('contrato', {})}>Novo contrato</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Número, descrição ou cliente"/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${FSel} label="Responsável" value=${f.resp} onChange=${v => set('resp', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Situação" value=${f.sit} onChange=${v => set('sit', v)} options=${['Vigente', 'A iniciar', 'Vencido', 'Encerrado']}/>
        <${FSel} label="Vencimento" value=${f.venc} onChange=${v => set('venc', v)} options=${[{ v: '30', l: 'Vence em 30 dias' }, { v: '60', l: 'Vence em 60 dias' }, { v: '90', l: 'Vence em 90 dias' }, { v: 'vencidos', l: 'Vencidos' }]}/>
        <${FSel} label="Categoria" value=${f.cat} onChange=${v => set('cat', v)} options=${R.opts('categoriaContrato')}/>
      </${Filtros}>
      <${Card} pad=${false} title=${rows.length + ' contrato(s)'} sub="Cada demanda é uma proposta vinculada que debita o teto ao ser aprovada"><${Table} rows=${rows} cols=${cols} sortInicial=${{ k: 'vig', d: 'asc' }} onRow=${c => CRM.abrir('contrato', { id: c.id })}
        vazio=${html`Nenhum contrato. Para criar, use "Novo contrato" ou o botão "Gerar contrato" no detalhe de uma proposta aprovada.`}/></${Card}>
    </div>`;
  }

  function Contrato({ id, inicial, onClose }) {
    DB.useDB();
    const orig = id ? DB.get('contratos', id) : null;
    const [f, setF] = useState(() => orig ? { ...orig } : { numero: '', descricao: '', clienteId: '', sedeId: '', propostaOrigemId: '', categoriaId: R.lista('categoriaContrato')[0] ? R.lista('categoriaContrato')[0].id : '', vigenciaInicio: U.hoje(), vigenciaFim: '', teto: null, ocCliente: '', vendedorId: R.vendoComo() || '', encerrado: false, observacoes: '', ...(inicial || {}) });
    const [err, setErr] = useState({}); const [vinc, setVinc] = useState('');
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const cons = orig ? R.consumoContrato(orig) : { demandas: [], consumido: 0, teto: U.num(f.teto), saldo: U.num(f.teto), pct: 0 };
    const propsCli = f.clienteId ? (R.idx().propostasPorCliente[f.clienteId] || []).filter(p => !p.arquivada && p.categoria === 'Comercial') : [];
    const salvar = () => {
      const e = {};
      if (!f.clienteId) e.clienteId = 'Obrigatório'; if (!(f.numero || '').trim()) e.numero = 'Obrigatório'; if (!f.teto) e.teto = 'Informe o teto';
      if (f.vigenciaFim && f.vigenciaInicio && f.vigenciaFim < f.vigenciaInicio) e.vigenciaFim = 'Término anterior ao início';
      if (DB.all('contratos').some(c => c.id !== id && (c.numero || '').toUpperCase() === (f.numero || '').trim().toUpperCase())) e.numero = 'Número já utilizado';
      setErr(e); if (Object.keys(e).length) { UI.toast('Verifique os campos.', 'err'); return; }
      DB.save('contratos', { ...f, numero: f.numero.trim() }, { resumo: (orig ? 'Contrato alterado ' : 'Contrato incluído ') + f.numero }); UI.toast('Contrato salvo.', 'ok'); onClose();
    };
    const vincular = () => { const p = DB.get('propostas', vinc); if (!p) return; DB.save('propostas', { ...p, contratoId: id, historico: (p.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: 'Vinculada ao contrato ' + f.numero }) }, { resumo: 'Demanda vinculada ao contrato ' + f.numero }); setVinc(''); UI.toast('Proposta vinculada como demanda.', 'ok'); };
    const desvincular = async p => { if (await UI.confirmar(`Desvincular a proposta ${p.codigo} deste contrato?`)) DB.save('propostas', { ...p, contratoId: '' }, { resumo: 'Demanda desvinculada' }); };
    const excluir = async () => { if (cons.demandas.length) return UI.toast('Desvincule as demandas antes de excluir.', 'err'); if (await UI.confirmar('Excluir este contrato?', { perigo: true, ok: 'Excluir' })) { DB.remove('contratos', id, { resumo: 'Contrato excluído ' + f.numero }); UI.toast('Contrato excluído.', 'ok'); onClose(); } };
    return html`<${Modal} size="lg" icon="contract" title=${orig ? 'Contrato ' + orig.numero : 'Novo contrato'} sub=${orig ? R.nomeCliente(orig.clienteId) + ' · ' + R.situacaoContrato(orig) : 'Contrato guarda-chuva (por demanda)'} onClose=${onClose}
      footer=${html`${orig && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}<div class="spacer"></div>${orig && html`<${Btn} icon="plus" onClick=${() => CRM.abrir('propostaForm', { inicial: { clienteId: f.clienteId, sedeId: f.sedeId, contratoId: id, vendedorId: f.vendedorId, descricao: 'Demanda — contrato ' + f.numero } })}>Nova demanda (proposta)</${Btn}>`}
        <${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${salvar}>Salvar</${Btn}>`}>
      ${orig && html`<div class="grid g4 mb"><${Kpi} label="Teto" value=${U.brlK(cons.teto)} small/><${Kpi} label="Consumido" value=${U.brlK(cons.consumido)} small/><${Kpi} label="Saldo" value=${U.brlK(cons.saldo)} small accent/><${Kpi} label="% consumido" value=${U.pct(cons.pct, 0)} small foot=${cons.pct >= .8 ? '⚠ acima de 80%' : ''}/></div>
        ${cons.saldo < 0 && html`<div class="notice err mb"><${Icon} n="alert" s=${15}/>As demandas aprovadas excederam o teto do contrato.</div>`}`}
      <div class="form-section"><h4>Contrato</h4><div class="form-grid">
        <${Field} c="8" label="Cliente" req err=${err.clienteId}><${UI.ClienteSelect} value=${f.clienteId} onChange=${v => setF(x => ({ ...x, clienteId: v, sedeId: ((R.idx().sedesPorCliente[v] || [])[0] || {}).id || '' }))} err=${err.clienteId}/></${Field}>
        <${Field} c="4" label="Número do contrato" req err=${err.numero}><${Inp} value=${f.numero} onChange=${v => set('numero', v)} err=${err.numero}/></${Field}>
        <${Field} c="8" label="Descrição"><${Inp} value=${f.descricao} onChange=${v => set('descricao', v)}/></${Field}>
        <${Field} c="4" label="Categoria"><${Sel} value=${f.categoriaId} onChange=${v => set('categoriaId', v)} options=${R.opts('categoriaContrato', f.categoriaId)} vazio=${false}/></${Field}>
        <${Field} c="6" label="Proposta de origem"><${Sel} value=${f.propostaOrigemId} onChange=${v => { const p = DB.get('propostas', v); setF(x => ({ ...x, propostaOrigemId: v, teto: x.teto || (p ? R.valorAprovado(p) || R.valorTotal(p) : null) })); }} options=${propsCli.map(p => ({ v: p.id, l: p.codigo + ' — ' + p.descricao }))} placeholder=${f.clienteId ? 'Selecione…' : 'Selecione o cliente'}/></${Field}>
        <${Field} c="3" label="Teto do contrato (R$)" req err=${err.teto}><${Money} value=${f.teto} onChange=${v => set('teto', v)} err=${err.teto}/></${Field}>
        <${Field} c="3" label="Nº OC / contrato do cliente"><${Inp} value=${f.ocCliente} onChange=${v => set('ocCliente', v)}/></${Field}>
        <${Field} c="3" label="Vigência — início"><${Inp} type="date" value=${f.vigenciaInicio} onChange=${v => set('vigenciaInicio', v)}/></${Field}>
        <${Field} c="3" label="Vigência — término" err=${err.vigenciaFim}><${Inp} type="date" value=${f.vigenciaFim} onChange=${v => set('vigenciaFim', v)} err=${err.vigenciaFim}/></${Field}>
        <${Field} c="3" label="Responsável"><${Sel} value=${f.vendedorId} onChange=${v => set('vendedorId', v)} options=${R.optsUsuarios(f.vendedorId)}/></${Field}>
        <div class="field c3" style=${{ justifyContent: 'flex-end' }}><${Check} checked=${f.encerrado} onChange=${v => set('encerrado', v)} label="Contrato encerrado"/></div>
        <${Field} c="12" label="Observações"><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)} rows=${2}/></${Field}>
      </div></div>
      ${orig && html`<${Card} title=${'Demandas vinculadas (' + cons.demandas.length + ')'} sub="Propostas aprovadas debitam o saldo" pad=${false}
        right=${html`<${Sel} value=${vinc} onChange=${setVinc} options=${propsCli.filter(p => !p.contratoId && p.id !== f.propostaOrigemId).map(p => ({ v: p.id, l: p.codigo + ' — ' + p.descricao }))} placeholder="Vincular proposta existente…" style=${{ width: 280 }}/><${Btn} sm disabled=${!vinc} onClick=${vincular}>Vincular</${Btn}>`}>
        <${Table} rows=${cons.demandas} pageSize=${20} onRow=${p => CRM.abrir('propostaDetalhe', { id: p.id })} vazio="Nenhuma demanda registrada." cols=${[{ k: 'codigo', t: 'Proposta' }, { k: 'dataEntrada', t: 'Entrada', r: p => U.data(p.dataEntrada) }, { k: 'descricao', t: 'Descrição' }, { k: 'status', t: 'Status', r: p => html`<${Status} s=${p.status}/>` }, { k: 'valor', t: 'Valor', al: 'r', v: R.valorTotal, r: p => U.brl(R.valorTotal(p)) }, { k: 'deb', t: 'Debitado', al: 'r', v: R.valorAprovado, r: p => U.brl(R.valorAprovado(p)) }, { k: 'acoes', t: '', nosort: true, r: p => html`<${Btn} sm v="ghost" icon="x" title="Desvincular" onClick=${() => desvincular(p)}/>` }]}/></${Card}>`}
    </${Modal}>`;
  }
  CRM.MODAIS.contrato = Contrato;

  function ContratosIndicadores() {
    DB.useDB();
    const cts = DB.all('contratos').filter(c => R.doUsuario(c)); const h = U.hoje();
    const vig = cts.filter(c => R.situacaoContrato(c) === 'Vigente');
    const teto = U.sum(vig, c => c.teto), cons = U.sum(vig, c => R.consumoContrato(c).consumido);
    const alerta = vig.filter(c => R.consumoContrato(c).pct >= .8), vencendo = vig.filter(c => c.vigenciaFim && c.vigenciaFim <= U.addDias(h, 90));
    const vencSaldo = cts.filter(c => R.situacaoContrato(c) === 'Vencido' && R.consumoContrato(c).saldo > 0);
    const dados = cts.map(c => { const k = R.consumoContrato(c); return { nome: c.numero, consumido: k.consumido, saldo: Math.max(0, k.saldo) }; });
    return html`<div>
      <div class="grid g5">
        <${Kpi} label="Contratos vigentes" value=${vig.length} foot=${cts.length + ' no total'} accent/><${Kpi} label="Valor contratado (teto vigente)" value=${U.brlK(teto)} small/>
        <${Kpi} label="Consumido" value=${U.brlK(cons)} small foot=${U.pct(U.div(cons, teto), 0) + ' do teto'}/><${Kpi} label="Saldo disponível" value=${U.brlK(teto - cons)} small/>
        <${Kpi} label="Alertas" value=${alerta.length + vencSaldo.length} foot=${alerta.length + ' com ≥80% consumido · ' + vencSaldo.length + ' vencido(s) com saldo'}/>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Consumo por contrato"><${G.Barras} horizontal empilhado data=${dados} series=${[{ k: 'consumido', l: 'Consumido', cor: G.NAVY }, { k: 'saldo', l: 'Saldo', cor: G.CINZA }]} fmt="brl" legenda h=${Math.max(200, dados.length * 40 + 60)}/></${Card}>
        <${Card} title="Atenção" sub="Vencimento em 90 dias, consumo ≥ 80% e vencidos com saldo">
          ${vencendo.concat(alerta, vencSaldo).filter((c, i, a) => a.indexOf(c) === i).map(c => html`<div key=${c.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('contrato', { id: c.id })}><${Icon} n="alert" s=${15} c="var(--orange)"/><div style=${{ flex: 1 }}><b>${c.numero}</b> — ${R.nomeCliente(c.clienteId)}<div class="small muted">Término ${U.data(c.vigenciaFim)} · consumido ${U.pct(R.consumoContrato(c).pct, 0)} · saldo ${U.brlK(R.consumoContrato(c).saldo)}</div></div><${Status} s=${R.situacaoContrato(c)}/></div>`)}
          ${!vencendo.length && !alerta.length && !vencSaldo.length && html`<div class="small muted">Nenhum alerta.</div>`}</${Card}>
      </div></div>`;
  }

  Object.assign(CRM.ROTAS, { 'contratos/lista': ContratosLista, 'contratos/indicadores': ContratosIndicadores });
})();
