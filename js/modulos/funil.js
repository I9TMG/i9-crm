/* =========================================================
   FUNIL DE VENDAS — Kanban de oportunidades e indicadores
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Seg, Money } = UI;

  const diasNaEtapa = op => { const h = op.historicoEtapas || []; const d = h.length ? h[h.length - 1].data : (op.criadoEm || '').slice(0, 10); return d ? U.dias(d.slice(0, 10), U.hoje()) : null; };
  const filtrarOps = f => {
    const t = U.normTxt(f.q || '');
    return DB.all('oportunidades').filter(o => {
      const sit = R.situacaoOp(o);
      if (f.sit && f.sit !== 'todas' && sit !== f.sit) return false;
      if (!f.consultas && o.natureza === 'Consulta de preço') return false;
      if (f.ano && f.ano !== 'todos' && R.anoOp(o) !== Number(f.ano)) return false;
      if (f.vend && o.vendedorId !== f.vend) return false;
      if (f.seg && o.segmentoId !== f.seg) return false;
      if (!R.doUsuario(o)) return false;
      if (t && !U.normTxt([o.titulo, R.nomeCliente(o.clienteId), ...(R.idx().propostasPorOp[o.id] || []).map(p => p.codigo)].join(' ')).includes(t)) return false;
      return true;
    });
  };

  /* ---------- Kanban ---------- */
  function Kanban() {
    DB.useDB();
    const anos = R.anosDisponiveis();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', sit: 'Aberta', ano: 'todos', vend: '', seg: '', consultas: false }, 'funil');
    const [over, setOver] = useState(null);
    const ops = useMemo(() => filtrarOps(f), [DB.version, f]);
    const etapas = R.etapas();
    const porEtapa = U.groupBy(ops, o => o.etapaId);
    const mover = (opId, etapaId) => {
      const o = DB.get('oportunidades', opId); if (!o || o.etapaId === etapaId) return;
      DB.save('oportunidades', { ...o, etapaId, historicoEtapas: (o.historicoEtapas || []).concat({ etapaId, data: U.hoje(), usuario: DB.usuarioAtual() }) }, { resumo: `Etapa: ${R.nomeLista(o.etapaId)} → ${R.nomeLista(etapaId)}` });
      UI.toast(`"${o.titulo}" movida para ${R.nomeLista(etapaId)}.`, 'ok');
    };
    const pipe = U.sum(ops, R.valorOp), pond = U.sum(ops, o => R.valorOp(o) * R.probOp(o) / 100);
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('oportunidade', {})}>Nova oportunidade</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Empresa, título ou código da proposta"/>
        <${Field} label="Situação"><${Seg} value=${f.sit} onChange=${v => set('sit', v)} options=${[{ v: 'Aberta', l: 'Abertas' }, { v: 'Ganha', l: 'Ganhas' }, { v: 'Perdida', l: 'Perdidas' }, { v: 'todas', l: 'Todas' }]}/></${Field}>
        <${FSel} label="Ano de criação" value=${f.ano === 'todos' ? '' : f.ano} onChange=${v => set('ano', v || 'todos')} options=${anos.map(String)}/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <div class="field" style=${{ minWidth: 0, flex: '0 0 auto', justifyContent: 'flex-end' }}><${Check} checked=${f.consultas} onChange=${v => set('consultas', v)} label="Consultas de preço"/></div>
      </${Filtros}>
      <div class="row mb small muted"><span><b class="num" style=${{ color: 'var(--navy)' }}>${U.int(ops.length)}</b> oportunidade(s)</span>·<span>Pipeline <b class="num" style=${{ color: 'var(--navy)' }}>${U.brlK(pipe)}</b></span>·<span>Ponderado <b class="num" style=${{ color: 'var(--orange)' }}>${U.brlK(pond)}</b></span>
        <span class="spacer"></span><span>Arraste os cartões entre as etapas para atualizar o funil.</span></div>
      <div class="kanban">${etapas.map(e => { const l = (porEtapa[e.id] || []).sort((a, b) => R.valorOp(b) - R.valorOp(a)); const vis = l.slice(0, 60); return html`<div key=${e.id} class=${'kcol' + (over === e.id ? ' over' : '')}
          onDragOver=${ev => { ev.preventDefault(); setOver(e.id); }} onDragLeave=${() => setOver(null)} onDrop=${ev => { ev.preventDefault(); setOver(null); mover(ev.dataTransfer.getData('text/plain'), e.id); }}>
        <div class="kcol-h"><b>${e.nome}</b><small>${l.length} · ${U.brlK(U.sum(l, R.valorOp))} · ${e.prob}%</small></div>
        <div class="kcol-b">${vis.map(o => { const ps = (R.idx().propostasPorOp[o.id] || []).filter(p => !p.arquivada); const d = diasNaEtapa(o); return html`<div key=${o.id} class="kcard" draggable="true" onDragStart=${ev => ev.dataTransfer.setData('text/plain', o.id)} onClick=${() => CRM.abrir('oportunidade', { id: o.id })}>
            <div class="m"><span class="ellipsis" style=${{ maxWidth: 150 }}>${R.nomeCliente(o.clienteId)}</span><span class="spacer"></span>${R.situacaoOp(o) !== 'Aberta' && html`<${Status} s=${R.situacaoOp(o)}/>`}</div>
            <div class="t">${o.titulo}</div>
            <div class="m"><b class="num" style=${{ color: 'var(--navy)' }}>${U.brlK(R.valorOp(o))}</b><span>${R.probOp(o)}%</span>${ps.length ? html`<${Badge} c="navy">${ps.map(p => p.codigo).slice(0, 2).join(', ')}</${Badge}>` : html`<${Badge} c="amber">sem proposta</${Badge}>`}</div>
            <div class="m"><span>${R.curtoUsuario(o.vendedorId)}</span>${d !== null && html`<span title="dias na etapa" class=${d > 30 && R.situacaoOp(o) === 'Aberta' ? 'delta-down' : ''}>· ${d}d na etapa</span>`}${o.natureza === 'Consulta de preço' && html`<${Badge}>consulta</${Badge}>`}</div>
          </div>`; })}
          ${l.length > vis.length && html`<div class="small muted" style=${{ padding: 6 }}>+ ${l.length - vis.length} oportunidade(s) — use os filtros</div>`}
          ${!l.length && html`<div class="small muted" style=${{ padding: 8, textAlign: 'center' }}>Vazio</div>`}</div>
      </div>`; })}</div>
    </div>`;
  }

  /* ---------- Oportunidade ---------- */
  function Oportunidade({ id, inicial, onClose }) {
    DB.useDB();
    const orig = id ? DB.get('oportunidades', id) : null;
    const [f, setF] = useState(() => orig ? JSON.parse(JSON.stringify(orig)) : { titulo: '', clienteId: '', sedeId: '', contatoId: '', vendedorId: R.vendoComo() || '', segmentoId: '', origemId: '', etapaId: R.etapas()[0] ? R.etapas()[0].id : '', probabilidade: null, valorEstimado: null, previsaoFechamento: '', natureza: 'Proposta efetiva', qualificacao: { escopo: false, demanda: false, decisor: false, pedido: false, pedidoTipo: '' }, concorrentes: '', perdida: false, motivoPerdaId: '', historicoEtapas: [], observacoes: '', prospeccaoId: '', ...(inicial || {}) });
    const [err, setErr] = useState({});
    const set = (k, v) => setF(x => ({ ...x, [k]: v })); const setQ = (k, v) => setF(x => ({ ...x, qualificacao: { ...x.qualificacao, [k]: v } }));
    const props = id ? (R.idx().propostasPorOp[id] || []) : []; const stos = id ? (R.idx().stosPorOp[id] || []) : [];
    const ativs = id ? DB.all('atividades').filter(a => a.oportunidadeId === id) : [];
    const qOk = f.qualificacao && f.qualificacao.pedido && [f.qualificacao.escopo, f.qualificacao.demanda, f.qualificacao.decisor].filter(Boolean).length >= 2;
    const salvar = (fechar = true) => {
      const e = {};
      if (!(f.titulo || '').trim()) e.titulo = 'Obrigatório'; if (!f.clienteId) e.clienteId = 'Obrigatório'; if (!f.vendedorId) e.vendedorId = 'Obrigatório';
      if (f.perdida && !f.motivoPerdaId) e.motivoPerdaId = 'Informe o motivo';
      setErr(e); if (Object.keys(e).length) { UI.toast('Preencha os campos obrigatórios.', 'err'); return null; }
      const hist = (!orig || orig.etapaId !== f.etapaId) ? (f.historicoEtapas || []).concat({ etapaId: f.etapaId, data: U.hoje(), usuario: DB.usuarioAtual() }) : f.historicoEtapas;
      const o = DB.save('oportunidades', { ...f, historicoEtapas: hist }, { resumo: (orig ? 'Oportunidade alterada: ' : 'Oportunidade criada: ') + f.titulo });
      UI.toast('Oportunidade salva.', 'ok'); if (fechar) onClose(); return o;
    };
    const gerarProposta = () => { const o = salvar(false); if (!o) return; onClose(); CRM.abrir('propostaForm', { inicial: { oportunidadeId: o.id, clienteId: o.clienteId, sedeId: o.sedeId, contatoId: o.contatoId, vendedorId: o.vendedorId, descricao: o.titulo, stoId: stos.find(s => !s.propostaId) ? stos.find(s => !s.propostaId).id : '' } }); };
    const abrirSto = () => { const o = salvar(false); if (!o) return; CRM.abrir('stoForm', { inicial: { oportunidadeId: o.id, clienteId: o.clienteId, sedeId: o.sedeId, atividade: o.titulo, responsavelId: o.vendedorId } }); };
    const desfazer = async () => {
      const h = f.historicoEtapas || []; if (h.length < 2) return UI.toast('Não há movimento anterior para desfazer.', 'err');
      if (!await UI.confirmar('Desfazer o último movimento de etapa?')) return;
      const nh = h.slice(0, -1); DB.save('oportunidades', { ...orig, etapaId: nh[nh.length - 1].etapaId, historicoEtapas: nh }, { resumo: 'Movimento de etapa desfeito' }); setF(x => ({ ...x, etapaId: nh[nh.length - 1].etapaId, historicoEtapas: nh })); UI.toast('Movimento desfeito.', 'ok');
    };
    const excluir = async () => {
      if (props.length || stos.length) return UI.toast('Oportunidade com proposta ou STO vinculada não pode ser excluída. Marque como perdida.', 'err');
      if (!await UI.confirmar('Excluir esta oportunidade?', { perigo: true, ok: 'Excluir' })) return; DB.remove('oportunidades', id, { resumo: 'Oportunidade excluída: ' + f.titulo }); UI.toast('Oportunidade excluída.', 'ok'); onClose();
    };
    const sit = orig ? R.situacaoOp(orig) : 'Aberta';
    return html`<${Modal} size="lg" icon="columns" title=${orig ? orig.titulo : 'Nova oportunidade'} sub=${orig ? R.nomeCliente(orig.clienteId) + ' · ' + sit : 'Funil de vendas'} onClose=${onClose}
      footer=${html`${orig && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}<div class="spacer"></div>
        <${Btn} icon="wrench" onClick=${abrirSto}>Abrir STO</${Btn}><${Btn} icon="file" onClick=${gerarProposta}>${props.length ? 'Nova proposta / revisão' : 'Gerar proposta'}</${Btn}>
        <${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${() => salvar(true)}>Salvar</${Btn}>`}>
      ${props.length > 0 && html`<div class="notice mb"><${Icon} n="link" s=${15}/><div>Proposta(s) vinculada(s): ${props.map((p, i) => html`<span key=${p.id}>${i ? ', ' : ' '}<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('propostaDetalhe', { id: p.id }); }}>${p.codigo}</a> (${p.status || p.statusCapex}, ${U.brlK(R.valorTotal(p))})</span>`)}. A situação da oportunidade acompanha o status das propostas.</div></div>`}
      <div class="form-section"><h4>Dados</h4><div class="form-grid">
        <${Field} c="12" label="Título" req err=${err.titulo}><${Inp} value=${f.titulo} onChange=${v => set('titulo', v)} err=${err.titulo}/></${Field}>
        <${Field} c="6" label="Cliente" req err=${err.clienteId}><${UI.ClienteSelect} value=${f.clienteId} onChange=${v => { const c = R.cliente(v); const s = (R.idx().sedesPorCliente[v] || [])[0]; setF(x => ({ ...x, clienteId: v, sedeId: s ? s.id : '', contatoId: '', segmentoId: x.segmentoId || (c && c.segmentoId) || '', vendedorId: x.vendedorId || (c && c.vendedorId) || '' })); }} err=${err.clienteId}/></${Field}>
        <${Field} c="3" label="Sede"><${Sel} value=${f.sedeId} onChange=${v => set('sedeId', v)} options=${R.optsSedes(f.clienteId)}/></${Field}>
        <${Field} c="3" label="Contato"><${Sel} value=${f.contatoId} onChange=${v => set('contatoId', v)} options=${R.optsContatos(f.clienteId, f.sedeId)}/></${Field}>
        <${Field} c="4" label="Vendedor" req err=${err.vendedorId}><${Sel} value=${f.vendedorId} onChange=${v => set('vendedorId', v)} options=${R.optsUsuarios(f.vendedorId)}/></${Field}>
        <${Field} c="4" label="Segmento"><${Sel} value=${f.segmentoId} onChange=${v => set('segmentoId', v)} options=${R.opts('segmento', f.segmentoId)}/></${Field}>
        <${Field} c="4" label="Origem"><${Sel} value=${f.origemId} onChange=${v => set('origemId', v)} options=${R.opts('origem', f.origemId)}/></${Field}>
      </div></div>
      <div class="form-section"><h4>Etapa e valores</h4><div class="form-grid">
        <${Field} c="4" label="Etapa"><${Sel} value=${f.etapaId} onChange=${v => set('etapaId', v)} options=${R.etapas().map(e => ({ v: e.id, l: e.nome }))} vazio=${false}/></${Field}>
        <${Field} c="2" label="Probabilidade (%)"><${Inp} type="number" value=${f.probabilidade} onChange=${v => set('probabilidade', v)} placeholder=${String((DB.get('listas', f.etapaId) || {}).prob || '')}/></${Field}>
        <${Field} c="3" label="Valor estimado (R$)"><${Money} value=${f.valorEstimado} onChange=${v => set('valorEstimado', v)}/></${Field}>
        <${Field} c="3" label="Previsão de fechamento"><${Inp} type="date" value=${f.previsaoFechamento} onChange=${v => set('previsaoFechamento', v)}/></${Field}>
        <${Field} c="4" label="Natureza"><${Sel} value=${f.natureza} onChange=${v => set('natureza', v)} options=${R.NATUREZAS} vazio=${false}/></${Field}>
        <${Field} c="8" label="Concorrentes"><${Inp} value=${f.concorrentes} onChange=${v => set('concorrentes', v)}/></${Field}>
      </div></div>
      <div class="form-section"><h4>Qualificação ${qOk ? html`<${Badge} c="green">qualificada</${Badge}>` : html`<${Badge} c="amber">pedido + 2 critérios</${Badge}>`}</h4><div class="row" style=${{ gap: 16 }}>
        <${Check} checked=${f.qualificacao.escopo} onChange=${v => setQ('escopo', v)} label="Escopo técnico definido"/><${Check} checked=${f.qualificacao.demanda} onChange=${v => setQ('demanda', v)} label="Demanda real (projeto/parada/capex)"/>
        <${Check} checked=${f.qualificacao.decisor} onChange=${v => setQ('decisor', v)} label="Interlocutor decisor/influenciador"/><${Check} checked=${f.qualificacao.pedido} onChange=${v => setQ('pedido', v)} label="Pedido de proposta"/>
        ${f.qualificacao.pedido && html`<${Sel} value=${f.qualificacao.pedidoTipo} onChange=${v => setQ('pedidoTipo', v)} options=${['E-mail', 'Formal (RFQ)', 'Verbal registrado']} placeholder="Tipo do pedido" style=${{ width: 180 }}/>`}</div></div>
      <div class="form-section"><h4>Encerramento</h4><div class="form-grid">
        <div class="field c4" style=${{ justifyContent: 'flex-end' }}><${Check} checked=${f.perdida} onChange=${v => set('perdida', v)} label="Marcar oportunidade como perdida"/></div>
        <${Field} c="4" label="Motivo da perda" err=${err.motivoPerdaId}><${Sel} value=${f.motivoPerdaId} onChange=${v => set('motivoPerdaId', v)} options=${R.opts('motivoPerda', f.motivoPerdaId)} disabled=${!f.perdida}/></${Field}>
        <${Field} c="12" label="Observações"><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)} rows=${2}/></${Field}></div></div>
      ${orig && html`<div class="grid g2">
        <${Card} title="Histórico de etapas" right=${html`<${Btn} sm icon="restore" onClick=${desfazer}>Desfazer último</${Btn}>`}><${UI.Timeline} itens=${(f.historicoEtapas || []).slice().reverse().map(h => ({ data: h.data, usuario: h.usuario, acao: R.nomeLista(h.etapaId) }))}/></${Card}>
        <${Card} title="STO e atividades">${stos.map(s => html`<div key=${s.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('stoForm', { id: s.id })}><${Icon} n="wrench" s=${14}/><span class="small">${s.numero} — ${s.atividade}</span><span class="spacer"></span><${Status} s=${s.situacao}/></div>`)}
          ${ativs.map(a => html`<div key=${a.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('atividade', { id: a.id })}><${Icon} n="calendar" s=${14}/><span class="small">${U.data(a.data)} — ${a.titulo}</span><span class="spacer"></span><${Status} s=${a.status}/></div>`)}
          ${!stos.length && !ativs.length && html`<div class="small muted">Nenhum registro vinculado.</div>`}</${Card}></div>`}
    </${Modal}>`;
  }
  CRM.MODAIS.oportunidade = Oportunidade;

  /* ---------- Indicadores do funil ---------- */
  function IndicadoresFunil() {
    DB.useDB();
    const anos = R.anosDisponiveis();
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: 'todos', vend: '', seg: '', consultas: false }, 'indfunil');
    const todas = useMemo(() => filtrarOps({ ...f, sit: 'todas' }), [DB.version, f]);
    const abertas = todas.filter(o => R.situacaoOp(o) === 'Aberta');
    const etapas = R.etapas();
    const pipe = U.sum(abertas, R.valorOp), pond = U.sum(abertas, o => R.valorOp(o) * R.probOp(o) / 100);
    // conversão histórica (decididas nos últimos 24 meses)
    const lim = U.addMeses(U.hoje(), -24);
    const decid = DB.all('oportunidades').filter(o => R.situacaoOp(o) !== 'Aberta' && (o.criadoEm || '').slice(0, 10) >= lim && R.doUsuario(o));
    const winHist = U.div(decid.filter(o => R.situacaoOp(o) === 'Ganha').length, decid.length);
    const porEtapa = etapas.map(e => { const l = abertas.filter(o => o.etapaId === e.id); return { nome: e.nome, qtd: l.length, valor: U.sum(l, R.valorOp), pond: U.sum(l, o => R.valorOp(o) * R.probOp(o) / 100) }; });
    // conversão entre etapas: etapa máxima alcançada (histórico + atual)
    const maxOrd = o => Math.max(R.ordemEtapa(o.etapaId), ...(o.historicoEtapas || []).map(h => R.ordemEtapa(h.etapaId)));
    const alc = etapas.map(e => todas.filter(o => maxOrd(o) >= e.ordem).length);
    const conv = etapas.map((e, i) => ({ nome: e.nome, alcancaram: alc[i], conv: i === 0 ? null : U.div(alc[i], alc[i - 1]) }));
    const porVend = G.topN(abertas, o => o.vendedorId, R.nomeUsuario, R.valorOp, 12).map(x => ({ ...x, pond: U.sum(x.regs, o => R.valorOp(o) * R.probOp(o) / 100) }));
    const h = U.hoje();
    const prev = Array.from({ length: 12 }, (_, i) => { const d = U.addMeses(h.slice(0, 8) + '01', i); const k = d.slice(0, 7); const l = abertas.filter(o => (o.previsaoFechamento || '').slice(0, 7) === k); return { nome: U.MESES[Number(k.slice(5, 7)) - 1] + '/' + k.slice(2, 4), valor: U.sum(l, R.valorOp), pond: U.sum(l, o => R.valorOp(o) * R.probOp(o) / 100), qtd: l.length }; });
    const semPrev = abertas.filter(o => !o.previsaoFechamento).length;
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${FSel} label="Ano de criação" value=${f.ano === 'todos' ? '' : f.ano} onChange=${v => set('ano', v || 'todos')} options=${anos.map(String)}/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <div class="field" style=${{ minWidth: 0, flex: '0 0 auto', justifyContent: 'flex-end' }}><${Check} checked=${f.consultas} onChange=${v => set('consultas', v)} label="Incluir consultas de preço"/></div>
      </${Filtros}>
      <div class="grid g5">
        <${Kpi} label="Oportunidades abertas" value=${U.int(abertas.length)} foot=${todas.length + ' no total do filtro'}/>
        <${Kpi} label="Valor do pipeline" value=${U.brlK(pipe)} accent/>
        <${Kpi} label="Pipeline ponderado" value=${U.brlK(pond)} foot="valor × probabilidade da etapa"/>
        <${Kpi} label="Projeção pelo histórico" value=${U.brlK(pipe * winHist)} foot=${'conversão real 24 meses: ' + U.pct(winHist)}/>
        <${Kpi} label="Ganhas / perdidas" value=${todas.filter(o => R.situacaoOp(o) === 'Ganha').length + ' / ' + todas.filter(o => R.situacaoOp(o) === 'Perdida').length} small/>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Oportunidades abertas por etapa" sub="quantidade · valor"><${G.Funil} data=${porEtapa}/></${Card}>
        <${Card} title="Conversão entre etapas" sub="Oportunidades que alcançaram cada etapa (histórico de movimentação)" pad=${false}>
          <${Table} rows=${conv.map((c, i) => ({ ...c, id: i }))} pageSize=${20} cols=${[{ k: 'nome', t: 'Etapa', nosort: true }, { k: 'alcancaram', t: 'Alcançaram', al: 'r', nosort: true }, { k: 'conv', t: 'Conversão da etapa anterior', al: 'r', nosort: true, r: c => c.conv === null ? '—' : html`<div class="row" style=${{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}><span class="num">${U.pct(c.conv)}</span><div style=${{ width: 80 }}><${UI.Bar} v=${c.conv}/></div></div>` }]}/></${Card}>
        <${Card} title="Pipeline por vendedor"><${G.Barras} horizontal data=${porVend} series=${[{ k: 'valor', l: 'Pipeline', cor: G.CINZA }, { k: 'pond', l: 'Ponderado', cor: G.NAVY }]} fmt="brl" legenda h=${260} larguraEixo=${150}/></${Card}>
        <${Card} title="Previsão de fechamento — próximos 12 meses" sub=${semPrev + ' oportunidade(s) abertas sem previsão de fechamento informada'}><${G.Barras} data=${prev} series=${[{ k: 'valor', l: 'Valor', cor: G.CINZA }, { k: 'pond', l: 'Ponderado', cor: G.ORANGE }]} fmt="brl" legenda h=${260}/></${Card}>
      </div>
      <${Card} className="mt" title="Principais oportunidades abertas" pad=${false}><${Table} rows=${abertas} pageSize=${10} sortInicial=${{ k: 'valor', d: 'desc' }} onRow=${o => CRM.abrir('oportunidade', { id: o.id })} cols=${[
        { k: 'titulo', t: 'Oportunidade' }, { k: 'cli', t: 'Cliente', v: o => R.nomeCliente(o.clienteId), r: o => R.nomeCliente(o.clienteId) }, { k: 'etapa', t: 'Etapa', v: o => R.ordemEtapa(o.etapaId), r: o => R.nomeLista(o.etapaId) },
        { k: 'vend', t: 'Vendedor', r: o => R.curtoUsuario(o.vendedorId) }, { k: 'prob', t: 'Prob.', al: 'r', v: R.probOp, r: o => R.probOp(o) + '%' }, { k: 'valor', t: 'Valor', al: 'r', v: R.valorOp, r: o => U.brl(R.valorOp(o)) }, { k: 'dias', t: 'Dias na etapa', al: 'r', v: diasNaEtapa, r: diasNaEtapa }]}/></${Card}>
    </div>`;
  }

  Object.assign(CRM.ROTAS, { 'funil/kanban': Kanban, 'funil/indicadores': IndicadoresFunil });
})();
