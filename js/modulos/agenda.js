/* =========================================================
   AGENDA — calendário, follow-up, pós-vendas e visitas
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo } = React;
  const { Field, Btn, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Seg } = UI;

  const filtrarAtv = (f, categoria) => {
    const t = U.normTxt(f.q || '');
    return DB.all('atividades').filter(a => (!categoria || a.categoria === categoria) && (!f.cat || a.categoria === f.cat) && (!f.resp || a.responsavelId === f.resp) && R.doUsuario(a, 'responsavelId')
      && (!f.prio || a.prioridade === f.prio) && (!f.status || (f.status === 'Atrasada' ? R.atrasada(a) : a.status === f.status)) && (!(f.ini || f.fim) || U.noPeriodo(a.data, f.ini, f.fim))
      && (!t || U.normTxt([a.titulo, a.descricao, a.resultado, R.nomeCliente(a.clienteId), (DB.get('propostas', a.propostaId) || {}).codigo].join(' ')).includes(t)));
  };
  const statusAtv = a => html`<${Status} s=${R.atrasada(a) ? 'Vencido' : a.status} label=${R.atrasada(a) ? 'Atrasada' : a.status}/>`;
  const propLink = a => { const p = DB.get('propostas', a.propostaId); return p ? html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('propostaDetalhe', { id: p.id }); }}>${p.codigo}</a>` : html`<span class="muted">—</span>`; };
  const exportarAtv = (rows, nome) => U.exportarExcel(nome + '_' + U.hoje() + '.xlsx', [{ nome: 'Atividades', linhas: rows, colunas: [{ t: 'Data', v: a => a.data }, { t: 'Hora', v: a => a.hora }, { t: 'Categoria', v: a => a.categoria }, { t: 'Tipo', v: a => R.nomeLista(a.tipoAtividadeId) }, { t: 'Atividade', v: a => a.titulo }, { t: 'Cliente', v: a => R.nomeCliente(a.clienteId) }, { t: 'Proposta', v: a => (DB.get('propostas', a.propostaId) || {}).codigo }, { t: 'Responsável', v: a => R.nomeUsuario(a.responsavelId) }, { t: 'Prioridade', v: a => a.prioridade }, { t: 'Status', v: a => R.atrasada(a) ? 'Atrasada' : a.status }, { t: 'Conclusão', v: a => a.dataConclusao }, { t: 'Resultado', v: a => a.resultado }, { t: 'Observações', v: a => a.observacoes }] }]);
  const filtrosBase = { q: '', cat: '', resp: '', prio: '', status: '', ini: '', fim: '' };
  const BarraFiltros = ({ F, semCat, right }) => html`<${Filtros} ativos=${F.ativos} limpar=${F.limpar} right=${right}>
    <${FBusca} value=${F.f.q} onChange=${v => F.set('q', v)} placeholder="Atividade, cliente, proposta"/>
    ${!semCat && html`<${FSel} label="Categoria" value=${F.f.cat} onChange=${v => F.set('cat', v)} options=${R.CATEGORIAS_ATIVIDADE}/>`}
    <${FSel} label="Responsável" value=${F.f.resp} onChange=${v => F.set('resp', v)} options=${R.optsUsuarios()}/>
    <${FSel} label="Prioridade" value=${F.f.prio} onChange=${v => F.set('prio', v)} options=${R.PRIORIDADES}/>
    <${FSel} label="Status" value=${F.f.status} onChange=${v => F.set('status', v)} options=${R.STATUS_ATIVIDADE.concat('Atrasada')}/>
    <${UI.FPeriodo} ini=${F.f.ini} fim=${F.f.fim} onIni=${v => F.set('ini', v)} onFim=${v => F.set('fim', v)}/>
  </${Filtros}>`;

  /* ---------- Painel de pendências (lateral) ---------- */
  function Pendencias() {
    const h = U.hoje(); const pend = DB.all('atividades').filter(a => a.status === 'A fazer' && R.doUsuario(a, 'responsavelId'));
    const atr = pend.filter(R.atrasada), hoje = pend.filter(a => a.data === h), sem = pend.filter(a => a.data > h && a.data <= U.addDias(h, 7));
    const lembr = pend.filter(a => a.lembrete && a.data >= h).sort((a, b) => U.cmp(a.data, b.data));
    const mes = h.slice(5, 7);
    const aniv = DB.all('contatos').filter(c => c.aniversario && c.aniversario.slice(5, 7) === mes && c.ativo !== false).sort((a, b) => U.cmp(a.aniversario.slice(8), b.aniversario.slice(8)));
    const item = a => html`<div key=${a.id} class="list-item" style=${{ cursor: 'pointer', padding: '6px 0' }} onClick=${() => CRM.abrir('atividade', { id: a.id })}><span class="dot" style=${{ background: R.atrasada(a) ? 'var(--red)' : a.prioridade === 'Alta' ? 'var(--orange)' : 'var(--navy-2)' }}></span><div style=${{ minWidth: 0, flex: 1 }}><div class="ellipsis small strong">${a.titulo}</div><div class="small muted">${U.data(a.data)} · ${R.curtoUsuario(a.responsavelId)}</div></div></div>`;
    return html`<div class="col" style=${{ gap: 12 }}>
      <div class="grid g3"><${Kpi} label="Atrasadas" value=${atr.length} small/><${Kpi} label="Hoje" value=${hoje.length} small/><${Kpi} label="7 dias" value=${sem.length} small/></div>
      ${atr.length > 0 && html`<${Card} title="Atrasadas" sub="Notificação de pendências">${atr.sort((a, b) => U.cmp(a.data, b.data)).slice(0, 8).map(item)}${atr.length > 8 && html`<div class="small muted">+ ${atr.length - 8}</div>`}</${Card}>`}
      <${Card} title="Hoje e próximos 7 dias">${hoje.concat(sem).sort((a, b) => U.cmp(a.data + a.hora, b.data + b.hora)).slice(0, 10).map(item)}${!hoje.length && !sem.length && html`<div class="small muted">Nada agendado.</div>`}</${Card}>
      ${lembr.length > 0 && html`<${Card} title="Lembretes">${lembr.slice(0, 6).map(item)}</${Card}>`}
      <${Card} title="Aniversários do mês">${aniv.length ? aniv.map(c => html`<div key=${c.id} class="list-item small"><b>${c.aniversario.slice(8, 10)}</b><span>${c.nome}</span><span class="muted ellipsis">· ${R.nomeCliente(c.clienteId)}</span></div>`) : html`<div class="small muted">Nenhum aniversário cadastrado neste mês (preencha no contato do cliente).</div>`}</${Card}>
    </div>`;
  }

  /* ---------- Calendário ---------- */
  function Calendario() {
    DB.useDB();
    const F = UI.useFiltros(filtrosBase, 'cal');
    const [vis, setVis] = useState('mes'); const [ref, setRef] = useState(U.hoje()); const [pv, setPv] = useState(true);
    const atvs = useMemo(() => filtrarAtv(F.f), [DB.version, F.f]);
    const pvEventos = useMemo(() => pv && (!F.f.cat || F.f.cat === 'Pós-venda') ? R.posVendaAgenda().filter(x => (!F.f.resp || x.proposta.vendedorId === F.f.resp) && R.doUsuario(x.proposta)).map(x => ({ id: 'pv' + x.proposta.id, virtual: x, categoria: 'Pós-venda', titulo: 'Pós-venda ' + x.checkpoint.dias + 'd — ' + R.nomeCliente(x.proposta.clienteId), data: x.prevista, status: 'A fazer', hora: '', responsavelId: x.proposta.vendedorId, prioridade: 'Média' })) : [], [DB.version, pv, F.f]);
    const evs = atvs.concat(pvEventos);
    const porDia = U.groupBy(evs, a => a.data);
    const abrir = a => a.virtual ? registrarToque(a.virtual) : CRM.abrir('atividade', { id: a.id });
    const nova = d => CRM.abrir('atividade', { inicial: { data: d } });
    const navegar = n => setRef(r => vis === 'mes' ? U.addMeses(r.slice(0, 8) + '01', n) : U.addDias(r, n * (vis === 'semana' ? 7 : 1)));
    const ev = a => html`<span key=${a.id} class=${'ev ' + a.categoria + (a.status === 'Feito' ? ' done' : '') + (R.atrasada(a) ? ' late' : '')} title=${a.titulo + ' · ' + R.nomeUsuario(a.responsavelId)} onClick=${e => { e.stopPropagation(); abrir(a); }}>${a.hora ? a.hora + ' ' : ''}${a.titulo}</span>`;
    let titulo = '', corpo;
    if (vis === 'mes') {
      const d1 = U.parse(ref.slice(0, 8) + '01'); titulo = U.MESES_LONGOS[d1.getMonth()] + ' ' + d1.getFullYear();
      const ini = U.inicioSemana(U.iso(d1)); const dias = Array.from({ length: 42 }, (_, i) => U.addDias(ini, i));
      corpo = html`<div class="cal">${U.DIAS_SEMANA.map(d => html`<div key=${d} class="dh">${d}</div>`)}${dias.map(d => { const l = (porDia[d] || []).sort((a, b) => U.cmp(a.hora, b.hora)); return html`<div key=${d} class=${'d' + (d.slice(5, 7) !== ref.slice(5, 7) ? ' out' : '') + (d === U.hoje() ? ' today' : '')} onClick=${() => nova(d)}>
        <div class="n">${Number(d.slice(8))}</div>${l.slice(0, 4).map(ev)}${l.length > 4 && html`<span class="small muted" onClick=${e => { e.stopPropagation(); setRef(d); setVis('dia'); }}>+${l.length - 4} mais</span>`}</div>`; })}</div>`;
    } else if (vis === 'semana') {
      const ini = U.inicioSemana(ref); const dias = Array.from({ length: 7 }, (_, i) => U.addDias(ini, i)); titulo = U.data(dias[0]) + ' a ' + U.data(dias[6]);
      corpo = html`<div class="cal">${dias.map((d, i) => html`<div key=${d} class="dh">${U.DIAS_SEMANA[i]} ${d.slice(8)}/${d.slice(5, 7)}</div>`)}${dias.map(d => html`<div key=${d} class=${'d' + (d === U.hoje() ? ' today' : '')} style=${{ minHeight: 320 }} onClick=${() => nova(d)}>${(porDia[d] || []).sort((a, b) => U.cmp(a.hora, b.hora)).map(ev)}</div>`)}</div>`;
    } else if (vis === 'dia') {
      titulo = U.DIAS_SEMANA[U.parse(ref).getDay()] + ', ' + U.data(ref); const l = (porDia[ref] || []).sort((a, b) => U.cmp(a.hora, b.hora));
      corpo = l.length ? html`<div>${l.map(a => html`<div key=${a.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => abrir(a)}><b class="num" style=${{ width: 50 }}>${a.hora || '—'}</b><${Badge} c=${{ 'Follow-up': 'orange', Visita: 'blue', 'Pós-venda': 'green' }[a.categoria] || 'navy'}>${a.categoria}</${Badge}><div style=${{ flex: 1 }}><div class="strong">${a.titulo}</div><div class="small muted">${R.nomeCliente(a.clienteId)} · ${R.nomeUsuario(a.responsavelId)}</div></div>${a.virtual ? html`<${Badge}>previsto</${Badge}>` : statusAtv(a)}</div>`)}</div>` : html`<${UI.Empty} icon="calendar" title="Nenhuma atividade neste dia"><${Btn} sm v="primary" icon="plus" onClick=${() => nova(ref)}>Nova atividade</${Btn}></${UI.Empty}>`;
    } else {
      titulo = 'Lista de atividades';
      corpo = html`<${Table} rows=${atvs} sortInicial=${{ k: 'data', d: 'asc' }} onRow=${abrir} cols=${[{ k: 'data', t: 'Data', r: a => U.data(a.data) + (a.hora ? ' ' + a.hora : '') }, { k: 'categoria', t: 'Categoria' }, { k: 'titulo', t: 'Atividade' }, { k: 'cli', t: 'Cliente', v: a => R.nomeCliente(a.clienteId), r: a => R.nomeCliente(a.clienteId) || '—' }, { k: 'resp', t: 'Responsável', v: a => R.nomeUsuario(a.responsavelId), r: a => R.curtoUsuario(a.responsavelId) }, { k: 'prioridade', t: 'Prioridade', r: a => html`<${Status} s=${a.prioridade}/>` }, { k: 'status', t: 'Status', v: a => a.status, r: statusAtv }, { k: 'rec', t: 'Recorrência', r: a => a.recorrencia && a.recorrencia !== 'Nenhuma' ? a.recorrencia : '' }]}/>`;
    }
    return html`<div>
      <${BarraFiltros} F=${F} right=${html`<${Btn} icon="download" onClick=${() => exportarAtv(atvs, 'Agenda')}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => nova(U.hoje())}>Nova atividade</${Btn}>`}/>
      <div class="grid g-cal">
        <${Card} pad=${false}>
          <div class="card-h"><${Btn} sm icon="left" onClick=${() => navegar(-1)}/><${Btn} sm onClick=${() => setRef(U.hoje())}>Hoje</${Btn}><${Btn} sm icon="right" onClick=${() => navegar(1)}/><h3 style=${{ marginLeft: 6 }}>${titulo}</h3>
            <div class="right"><${UI.Check} checked=${pv} onChange=${setPv} label="Pós-venda previsto"/><${Seg} value=${vis} onChange=${setVis} options=${[{ v: 'dia', l: 'Dia' }, { v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mês' }, { v: 'lista', l: 'Lista' }]}/></div></div>
          <div style=${{ padding: vis === 'lista' ? 0 : 12 }}>${corpo}</div>
          <div class="card-b row small muted" style=${{ borderTop: '1px solid var(--line-2)' }}><span class="ev Follow-up" style=${{ display: 'inline-block' }}>Follow-up</span><span class="ev Visita" style=${{ display: 'inline-block' }}>Visita</span><span class="ev Pós-venda" style=${{ display: 'inline-block' }}>Pós-venda</span><span class="ev" style=${{ display: 'inline-block' }}>Tarefa / lembrete</span><span class="ev late" style=${{ display: 'inline-block' }}>Atrasada</span><span>· clique em um dia para criar</span></div>
        </${Card}>
        <${Pendencias}/>
      </div></div>`;
  }

  /* ---------- Follow-up ---------- */
  function FollowUp() {
    DB.useDB();
    const F = UI.useFiltros({ ...filtrosBase, status: 'A fazer' }, 'fup');
    const rows = useMemo(() => filtrarAtv(F.f, 'Follow-up'), [DB.version, F.f]);
    const h = U.hoje();
    const grupos = [['Atrasados', 'red', a => R.atrasada(a)], ['Hoje', 'amber', a => a.status === 'A fazer' && a.data === h], ['Próximos 7 dias', 'blue', a => a.status === 'A fazer' && a.data > h && a.data <= U.addDias(h, 7)], ['Depois', '', a => a.status === 'A fazer' && a.data > U.addDias(h, 7)], ['Sem data', 'amber', a => a.status === 'A fazer' && !a.data], ['Concluídos', 'green', a => a.status === 'Feito'], ['Cancelados', '', a => a.status === 'Cancelado']];
    // propostas enviadas sem follow-up agendado (alerta herdado do R17: paradas > 21 dias)
    const comFup = new Set(DB.all('atividades').filter(a => a.status === 'A fazer' && a.propostaId).map(a => a.propostaId));
    const paradas = DB.all('propostas').filter(p => !p.arquivada && p.categoria === 'Comercial' && R.resultado(p) === 'aberta' && p.dataEnvio && U.dias(p.dataEnvio, h) > 21 && !comFup.has(p.id) && R.doUsuario(p) && (!F.f.resp || p.vendedorId === F.f.resp)).sort((a, b) => U.cmp(a.dataEnvio, b.dataEnvio));
    const [verParadas, setVP] = useState(false);
    const cols = [
      { k: 'data', t: 'Próximo contato', r: a => html`<b class=${R.atrasada(a) ? 'delta-down' : ''}>${U.data(a.data)}</b>` },
      { k: 'cli', t: 'Cliente', v: a => R.nomeCliente(a.clienteId), r: a => R.nomeCliente(a.clienteId) || '—' }, { k: 'prop', t: 'Proposta', v: a => (DB.get('propostas', a.propostaId) || {}).codigo, r: propLink },
      { k: 'titulo', t: 'Ação', r: a => html`<span class="ellipsis" style=${{ maxWidth: 260, display: 'inline-block' }}>${a.titulo}</span>` }, { k: 'resp', t: 'Responsável', v: a => R.nomeUsuario(a.responsavelId), r: a => R.curtoUsuario(a.responsavelId) },
      { k: 'prioridade', t: 'Prioridade', r: a => html`<${Status} s=${a.prioridade}/>` }, { k: 'status', t: 'Status', v: a => a.status, r: statusAtv },
      { k: 'dataConclusao', t: 'Data do contato', r: a => U.data(a.dataConclusao) }, { k: 'resultado', t: 'Resultado', r: a => html`<span class="small">${a.resultado}</span>` },
      { k: 'acoes', t: '', nosort: true, r: a => a.status === 'A fazer' ? html`<${Btn} sm icon="check" onClick=${() => CRM.abrir('atividade', { id: a.id })}>Registrar</${Btn}>` : '' },
    ];
    return html`<div>
      <${BarraFiltros} F=${F} semCat=${true} right=${html`<${Btn} icon="download" onClick=${() => exportarAtv(rows.filter(a => a.status !== 'A fazer' || !a.data || a.data <= U.addDias(h, 7)), 'Relatorio_followup_semana')} title="Atrasados, hoje e próximos 7 dias">Relatório semanal</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('atividade', { inicial: { categoria: 'Follow-up' } })}>Novo follow-up</${Btn}>`}/>
      ${paradas.length > 0 && html`<div class="notice warn mb"><${Icon} n="bell" s=${16}/><div style=${{ flex: 1 }}><b>${paradas.length} proposta(s) enviada(s) há mais de 21 dias sem follow-up agendado.</b> <a href="#" onClick=${e => { e.preventDefault(); setVP(!verParadas); }}>${verParadas ? 'ocultar' : 'ver lista'}</a>
        ${verParadas && html`<div class="mt">${paradas.slice(0, 30).map(p => html`<div key=${p.id} class="list-item small"><span class="num">${p.codigo}</span><span class="ellipsis" style=${{ flex: 1 }}>${R.nomeCliente(p.clienteId)} — ${p.descricao}</span><span class="muted">enviada ${U.data(p.dataEnvio)}</span><${Btn} sm icon="plus" onClick=${() => CRM.abrir('atividade', { inicial: { categoria: 'Follow-up', clienteId: p.clienteId, propostaId: p.id, oportunidadeId: p.oportunidadeId, responsavelId: p.vendedorId, titulo: 'Follow-up proposta ' + p.codigo } })}>Agendar</${Btn}></div>`)}</div>`}</div></div>`}
      ${grupos.map(([nome, cor, fn]) => { const l = rows.filter(fn); if (!l.length) return null; return html`<${Card} key=${nome} className="mb" pad=${false} title=${html`<span class="row"><${Badge} c=${cor}>${l.length}</${Badge}> ${nome}</span>`}>
        <${Table} cols=${cols} rows=${l} pageSize=${15} sortInicial=${{ k: 'data', d: nome === 'Concluídos' ? 'desc' : 'asc' }} onRow=${a => CRM.abrir('atividade', { id: a.id })}/></${Card}>`; })}
      ${!rows.length && html`<${Card}><${UI.Empty} icon="calendar" title="Nenhum follow-up no filtro">Ajuste os filtros ou crie um novo follow-up.</${UI.Empty}></${Card}>`}
    </div>`;
  }

  /* ---------- Pós-vendas ---------- */
  const registrarToque = x => CRM.abrir('atividade', { inicial: { categoria: 'Pós-venda', clienteId: x.proposta.clienteId, propostaId: x.proposta.id, oportunidadeId: x.proposta.oportunidadeId, responsavelId: x.proposta.vendedorId, checkpointDias: x.checkpoint.dias, titulo: 'Pós-venda ' + x.checkpoint.dias + ' dias — ' + x.checkpoint.rotulo + ' (' + x.proposta.codigo + ')', data: U.hoje(), status: 'Feito', dataConclusao: U.hoje() } });
  function PosVendas() {
    DB.useDB();
    const [modo, setModo] = useState('fazer');
    const F = UI.useFiltros({ ...filtrosBase, janela: '30', recentes: '1' }, 'posv');
    const h = U.hoje();
    const previstos = useMemo(() => R.posVendaAgenda().filter(x => (!F.f.resp || x.proposta.vendedorId === F.f.resp) && R.doUsuario(x.proposta) && (F.f.janela === 'todos' || x.prevista <= U.addDias(h, Number(F.f.janela)))
      && (F.f.recentes !== '1' || x.base >= U.addDias(h, -400)) && (!F.f.q || U.normTxt(R.nomeCliente(x.proposta.clienteId) + ' ' + x.proposta.codigo).includes(U.normTxt(F.f.q))) && (!(F.f.ini || F.f.fim) || U.noPeriodo(x.prevista, F.f.ini, F.f.fim))), [DB.version, F.f]);
    const manuais = filtrarAtv({ ...F.f, status: 'A fazer' }, 'Pós-venda');
    const feitos = filtrarAtv({ ...F.f, status: 'Feito' }, 'Pós-venda');
    const encerrar = async p => { if (await UI.confirmar(`Encerrar o pós-venda da proposta ${p.codigo}? Os próximos toques deixam de ser agendados.`, { ok: 'Encerrar' })) { DB.save('propostas', { ...p, posVendaEncerrado: true, historico: (p.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: 'Pós-venda encerrado' }) }); UI.toast('Pós-venda encerrado.', 'ok'); } };
    const recompra = x => CRM.abrir('prospeccaoForm', { inicial: { clienteId: x.proposta.clienteId, sedeId: x.proposta.sedeId, vendedorIds: [x.proposta.vendedorId].filter(Boolean), objetivo: 'Recompra / nova demanda — pós-venda ' + x.proposta.codigo, tipoVisitaId: R.idLista('tipoVisita', 'Visita comercial') } });
    return html`<div>
      <div class="row mb"><${Seg} value=${modo} onChange=${setModo} options=${[{ v: 'fazer', l: 'A fazer (' + (previstos.length + manuais.length) + ')' }, { v: 'feitos', l: 'Feitos (' + feitos.length + ')' }]}/><div class="spacer"></div>
        <${Btn} icon="download" onClick=${() => exportarAtv(modo === 'feitos' ? feitos : manuais, 'Pos_vendas')}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('atividade', { inicial: { categoria: 'Pós-venda' } })}>Nova atividade de pós-venda</${Btn}></div>
      <${Filtros} ativos=${F.ativos} limpar=${F.limpar}>
        <${FBusca} value=${F.f.q} onChange=${v => F.set('q', v)} placeholder="Cliente ou proposta"/>
        <${FSel} label="Responsável" value=${F.f.resp} onChange=${v => F.set('resp', v)} options=${R.optsUsuarios()}/>
        ${modo === 'fazer' && html`<${Field} label="Previstos até"><${Seg} value=${F.f.janela} onChange=${v => F.set('janela', v)} options=${[{ v: '0', l: 'Hoje' }, { v: '30', l: '30 dias' }, { v: '90', l: '90 dias' }, { v: 'todos', l: 'Todos' }]}/></${Field}>
          <${Field} label="Pedidos"><${Seg} value=${F.f.recentes} onChange=${v => F.set('recentes', v)} options=${[{ v: '1', l: 'Últimos 13 meses' }, { v: '0', l: 'Todos' }]}/></${Field}>`}
        <${UI.FPeriodo} ini=${F.f.ini} fim=${F.f.fim} onIni=${v => F.set('ini', v)} onFim=${v => F.set('fim', v)}/>
      </${Filtros}>
      ${modo === 'fazer' ? html`<div>
        <${Card} className="mb" pad=${false} title="Toques previstos pela cadência" sub="Gerados a partir das propostas aprovadas (data do pedido) — cadência em Cadastros › Pós-venda">
          <${Table} rows=${previstos.map(x => ({ ...x, id: x.proposta.id }))} pageSize=${20} sortInicial=${{ k: 'prevista', d: 'asc' }} cols=${[
            { k: 'prevista', t: 'Data prevista', r: x => html`<${Badge} c=${x.prevista < h ? 'red' : x.prevista <= U.addDias(h, 7) ? 'amber' : 'blue'}>${U.data(x.prevista)}</${Badge}>` },
            { k: 'cli', t: 'Cliente', v: x => R.nomeCliente(x.proposta.clienteId), r: x => R.nomeCliente(x.proposta.clienteId) }, { k: 'prop', t: 'Proposta', v: x => x.proposta.codigo, r: x => html`<a href="#" onClick=${e => { e.preventDefault(); CRM.abrir('propostaDetalhe', { id: x.proposta.id }); }}>${x.proposta.codigo}</a>` },
            { k: 'desc', t: 'Descrição', r: x => html`<div><b class="small">${x.checkpoint.dias} dias — ${x.checkpoint.rotulo}</b><div class="small muted ellipsis" style=${{ maxWidth: 260 }}>${x.proposta.descricao}</div></div>` },
            { k: 'resp', t: 'Responsável', v: x => R.nomeUsuario(x.proposta.vendedorId), r: x => R.curtoUsuario(x.proposta.vendedorId) }, { k: 'prio', t: 'Prioridade', r: x => html`<${Status} s=${x.prevista < h ? 'Alta' : 'Média'}/>` },
            { k: 'prog', t: 'Toques', r: x => x.feitos + '/' + x.total },
            { k: 'acoes', t: '', nosort: true, r: x => html`<${Btn} sm v="primary" icon="check" onClick=${() => registrarToque(x)}>Registrar toque</${Btn}><${Btn} sm v="ghost" icon="compass" title="Recompra → Prospecção" onClick=${() => recompra(x)}/><${Btn} sm v="ghost" icon="ban" title="Encerrar pós-venda" onClick=${() => encerrar(x.proposta)}/>` }]}/></${Card}>
        <${Card} pad=${false} title="Atividades de pós-venda a fazer" sub="Criadas manualmente">
          <${Table} rows=${manuais} pageSize=${20} onRow=${a => CRM.abrir('atividade', { id: a.id })} sortInicial=${{ k: 'data', d: 'asc' }} cols=${[{ k: 'data', t: 'Data prevista', r: a => U.data(a.data) }, { k: 'cli', t: 'Cliente', v: a => R.nomeCliente(a.clienteId), r: a => R.nomeCliente(a.clienteId) }, { k: 'resp', t: 'Responsável', r: a => R.curtoUsuario(a.responsavelId) }, { k: 'prioridade', t: 'Prioridade', r: a => html`<${Status} s=${a.prioridade}/>` }, { k: 'titulo', t: 'Descrição' }, { k: 'status', t: 'Status', r: statusAtv }]} vazio="Nenhuma atividade manual de pós-venda pendente."/></${Card}></div>`
        : html`<${Card} pad=${false} title="Pós-vendas realizados"><${Table} rows=${feitos} pageSize=${25} onRow=${a => CRM.abrir('atividade', { id: a.id })} sortInicial=${{ k: 'dataConclusao', d: 'desc' }} cols=${[
            { k: 'dataConclusao', t: 'Data de conclusão', r: a => U.data(a.dataConclusao || a.data) }, { k: 'cli', t: 'Cliente', v: a => R.nomeCliente(a.clienteId), r: a => R.nomeCliente(a.clienteId) }, { k: 'prop', t: 'Proposta', r: propLink },
            { k: 'resp', t: 'Responsável', r: a => R.curtoUsuario(a.responsavelId) }, { k: 'titulo', t: 'Atividade' }, { k: 'resultado', t: 'Resultado', r: a => html`<span class="small">${a.resultado}</span>` }, { k: 'observacoes', t: 'Observações', r: a => html`<span class="small">${a.observacoes}</span>` }]} vazio="Nenhum pós-venda registrado ainda."/></${Card}>`}
    </div>`;
  }

  /* ---------- Visitas ---------- */
  function Visitas() {
    DB.useDB();
    const F = UI.useFiltros(filtrosBase, 'visitas');
    const rows = useMemo(() => filtrarAtv(F.f, 'Visita'), [DB.version, F.f]);
    const nomeVisita = a => a.clienteId ? R.nomeCliente(a.clienteId) : (((DB.get('prospeccoes', a.prospeccaoId) || {}).empresa) || {}).nome || '—';
    return html`<div>
      <${BarraFiltros} F=${F} semCat=${true} right=${html`<${Btn} icon="download" onClick=${() => exportarAtv(rows, 'Visitas')}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('prospeccaoForm', {})}>Planejar visita</${Btn}>`}/>
      <div class="notice mb small"><${Icon} n="compass" s=${15}/>Visitas planejadas na Prospecção geram compromissos aqui automaticamente. Ao concluir a visita na Agenda, a prospecção é atualizada (status e resultado).</div>
      <${Card} pad=${false} title=${rows.length + ' visita(s)'}><${Table} rows=${rows} sortInicial=${{ k: 'data', d: 'desc' }} onRow=${a => CRM.abrir('atividade', { id: a.id })} cols=${[
        { k: 'data', t: 'Data', r: a => U.data(a.data) + (a.hora ? ' ' + a.hora : '') }, { k: 'emp', t: 'Empresa', v: nomeVisita, r: a => html`<b style=${{ fontWeight: 600 }}>${nomeVisita(a)}</b>` },
        { k: 'local', t: 'Cidade/UF', r: a => { const p = DB.get('prospeccoes', a.prospeccaoId); const c = R.cliente(a.clienteId); return p ? [p.cidade || (c && c.cidade), p.uf || (c && c.uf)].filter(Boolean).join('/') : c ? [c.cidade, c.uf].filter(Boolean).join('/') : '—'; } },
        { k: 'descricao', t: 'Objetivo', r: a => html`<span class="small ellipsis" style=${{ maxWidth: 260, display: 'inline-block' }}>${a.descricao || a.titulo}</span>` }, { k: 'resp', t: 'Responsável', r: a => R.curtoUsuario(a.responsavelId) },
        { k: 'status', t: 'Status', v: a => a.status, r: statusAtv }, { k: 'resultado', t: 'Resultado', r: a => html`<span class="small">${a.resultado}</span>` },
        { k: 'acoes', t: '', nosort: true, r: a => a.prospeccaoId ? html`<${Btn} sm v="ghost" icon="compass" title="Abrir prospecção" onClick=${() => CRM.abrir('prospeccaoForm', { id: a.prospeccaoId })}/>` : '' }]}/></${Card}>
    </div>`;
  }

  Object.assign(CRM.ROTAS, { 'agenda/calendario': Calendario, 'agenda/followup': FollowUp, 'agenda/posvenda': PosVendas, 'agenda/visitas': Visitas });
})();
