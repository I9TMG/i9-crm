/* =========================================================
   DASHBOARD — visão gerencial e estratégica (poucos elementos)
   Indicadores detalhados ficam nos respectivos módulos.
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useMemo } = React;
  const { Btn, Badge, Card, Table, Status, Kpi, Icon } = UI;

  function Dashboard() {
    DB.useDB();
    const anos = R.anosDisponiveis('Comercial').filter(a => a <= new Date().getFullYear() + 1);
    const F = UI.useFiltros({ ano: new Date().getFullYear() }, 'dash');
    const ano = F.f.ano === 'todos' ? null : Number(F.f.ano);
    const d = useMemo(() => {
      const props = R.propostasAtivas('Comercial').filter(p => R.doUsuario(p));
      const doAno = a => props.filter(p => !a || R.anoProposta(p) === a);
      const atual = doAno(ano), ant = ano ? doAno(ano - 1) : [];
      const m = CRM.metricasPropostas(atual), mAnt = ano ? CRM.metricasPropostas(ant) : null;
      // aprovado pelo ano do pedido (competência da venda)
      const aprovAno = a => props.filter(p => R.resultado(p) === 'ganha' && (!a || U.ano(p.dataPedido || p.dataEntrada) === a));
      const vAprov = U.sum(aprovAno(ano), R.valorAprovado), vAprovAnt = ano ? U.sum(aprovAno(ano - 1), R.valorAprovado) : null;
      const ops = DB.all('oportunidades').filter(o => R.situacaoOp(o) === 'Aberta' && o.natureza !== 'Consulta de preço' && R.doUsuario(o));
      const pipe = U.sum(ops, R.valorOp), pond = U.sum(ops, o => R.valorOp(o) * R.probOp(o) / 100);
      const cts = DB.all('contratos').filter(c => R.situacaoContrato(c) === 'Vigente' && R.doUsuario(c));
      const meta = ano ? DB.all('metas').find(x => Number(x.ano) === ano && !x.vendedorId && !R.vendoComo()) || DB.all('metas').find(x => Number(x.ano) === ano && x.vendedorId === R.vendoComo()) : null;
      const evol = U.MESES.map((nome, i) => ({ nome, proposto: U.sum(atual.filter(p => U.mes(p.dataEntrada) === i + 1), R.valorTotal), aprovado: U.sum(aprovAno(ano).filter(p => U.mes(p.dataPedido || p.dataEntrada) === i + 1), R.valorAprovado), aprovadoAnt: ano ? U.sum(aprovAno(ano - 1).filter(p => U.mes(p.dataPedido || p.dataEntrada) === i + 1), R.valorAprovado) : 0 }));
      // clientes
      const cls = DB.all('clientes').filter(c => R.doUsuario(c));
      const novos = cls.filter(c => c.dataCadastro && (!ano || U.ano(c.dataCadastro) === ano));
      const top = G.topN(aprovAno(ano), p => p.clienteId, R.nomeCliente, R.valorAprovado, 5);
      // prospecção / atividades
      const prosp = DB.all('prospeccoes').filter(p => R.doUsuario(p, 'vendedorIds'));
      const visitas = prosp.filter(p => CRM.prospRealizada(p) && (!ano || U.ano(p.dataRealizada || p.dataPrevista || p.dataAtualizacao) === ano)).length;
      const novasOps = DB.all('oportunidades').filter(o => R.doUsuario(o) && (!ano || R.anoOp(o) === ano)).length;
      const ativs = DB.all('atividades').filter(a => R.doUsuario(a, 'responsavelId'));
      const feitas = ativs.filter(a => a.status === 'Feito' && (!ano || U.ano(a.dataConclusao || a.data) === ano)).length;
      const pend = ativs.filter(a => a.status === 'A fazer');
      const atrasFup = pend.filter(a => a.categoria === 'Follow-up' && R.atrasada(a)).length;
      const prox = pend.filter(a => a.data >= U.hoje()).sort((a, b) => U.cmp(a.data + (a.hora || ''), b.data + (b.hora || ''))).slice(0, 6);
      const etapas = R.etapas().filter(e => e.ordem <= 6).map(e => { const l = ops.filter(o => o.etapaId === e.id); return { nome: e.nome, qtd: l.length, valor: U.sum(l, R.valorOp) }; });
      return { m, mAnt, vAprov, vAprovAnt, ops, pipe, pond, cts, meta, evol, cls, novos, top, visitas, novasOps, feitas, pend, atrasFup, prox, etapas };
    }, [DB.version, ano]);
    const vs = (a, b, inv) => ano && b ? html`<${UI.Delta} atual=${a} anterior=${b} inverso=${inv}/> <span class="muted">vs ${ano - 1}</span>` : null;
    const topOps = d.ops.slice().sort((a, b) => R.valorOp(b) - R.valorOp(a)).slice(0, 6);
    const pctMeta = d.meta ? U.div(d.vAprov, d.meta.valor) : null;
    return html`<div>
      <div class="row mb"><${UI.Anos} value=${F.f.ano} onChange=${v => F.set('ano', v)} anos=${anos}/><div class="spacer"></div>
        <span class="small muted">${R.vendoComo() ? 'Visão: ' + R.nomeUsuario(R.vendoComo()) : 'Visão de gestão (todos os vendedores)'}</span></div>
      <div class="section-title" style=${{ marginTop: 0 }}>Desempenho comercial</div>
      <div class="grid g5">
        <${Kpi} label="Valor total de propostas" value=${U.brlK(d.m.total)} foot=${html`${d.m.n} propostas ${vs(d.m.total, d.mAnt && d.mAnt.total)}`} icon="file"/>
        <${Kpi} label="Valor aprovado" title="Propostas aprovadas com data do pedido no ano (competência da venda)" value=${U.brlK(d.vAprov)} accent foot=${html`pedidos no ano · ${pctMeta !== null ? U.pct(pctMeta, 0) + ' da meta ' : ''}${vs(d.vAprov, d.vAprovAnt)}`} icon="check"/>
        <${Kpi} label="Taxa de conversão" value=${U.pct(d.m.conv)} foot=${html`${d.m.nG} ganhas / ${d.m.nG + d.m.nP} decididas ${vs(d.m.conv, d.mAnt && d.mAnt.conv)}`} icon="target"/>
        <${Kpi} label="Pipeline comercial" value=${U.brlK(d.pipe)} foot=${'Ponderado ' + U.brlK(d.pond) + ' · ' + d.ops.length + ' abertas'} icon="columns"/>
        <${Kpi} label="Valor contratado" value=${U.brlK(U.sum(d.cts, c => c.teto))} foot=${d.cts.length + ' contrato(s) vigente(s) · saldo ' + U.brlK(U.sum(d.cts, c => R.consumoContrato(c).saldo))} icon="contract"/>
      </div>
      <div class="grid g21 mt">
        <${Card} title=${ano ? 'Evolução mensal — ' + ano : 'Evolução mensal (todos os anos)'} sub="Barras: valor proposto · linhas: valor aprovado no ano e no ano anterior">
          <${Recharts.ResponsiveContainer} width="100%" height=${270}>
            <${Recharts.ComposedChart} data=${d.evol} margin=${{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <${Recharts.CartesianGrid} stroke="#EEF1F4" vertical=${false}/><${Recharts.XAxis} dataKey="nome" tickLine=${false} axisLine=${{ stroke: '#E3E8EC' }} tick=${{ fontSize: 11, fill: '#7A8792' }}/>
              <${Recharts.YAxis} tickLine=${false} axisLine=${false} tick=${{ fontSize: 11, fill: '#7A8792' }} tickFormatter=${U.axisK} width=${56}/>
              <${Recharts.Tooltip} formatter=${(v, n) => [U.brl(v), n]}/><${Recharts.Legend} iconType="circle" iconSize=${8}/>
              <${Recharts.Bar} dataKey="proposto" name="Proposto" fill="#D9E3E9" radius=${[3, 3, 0, 0]} maxBarSize=${28}/>
              <${Recharts.Line} type="monotone" dataKey="aprovado" name=${'Aprovado ' + (ano || '')} stroke=${G.NAVY} strokeWidth=${2.2} dot=${{ r: 2.5 }}/>
              ${ano && html`<${Recharts.Line} type="monotone" dataKey="aprovadoAnt" name=${'Aprovado ' + (ano - 1)} stroke=${G.ORANGE} strokeDasharray="5 4" strokeWidth=${1.8} dot=${false}/>`}
            </${Recharts.ComposedChart}></${Recharts.ResponsiveContainer}>
        </${Card}>
        <${Card} title="Meta de vendas" sub=${ano ? String(ano) : ''} right=${html`<${Btn} sm v="ghost" onClick=${() => CRM.irPara('cadastros/metas')}>Metas</${Btn}>`}>
          ${d.meta ? html`<div><div class="kpi" style=${{ padding: 0 }}><div class="val">${U.pct(pctMeta, 0)}</div><div class="foot">${U.brl(d.vAprov)} de ${U.brl(d.meta.valor)}</div></div>
            <div class="mt"><${UI.Bar} v=${pctMeta} cor="var(--orange)"/></div>
            <div class="small muted mt">${d.vAprov >= d.meta.valor ? 'Meta atingida — excedente de ' + U.brlK(d.vAprov - d.meta.valor) + '.' : 'Faltam ' + U.brlK(d.meta.valor - d.vAprov) + '. Ritmo necessário: ' + U.brlK((d.meta.valor - d.vAprov) / Math.max(1, 12 - (ano === new Date().getFullYear() ? new Date().getMonth() : 0))) + ' / mês.'}</div></div>`
            : html`<div class="small muted">Nenhuma meta cadastrada para ${ano || 'o período'}. <a href="#/cadastros/metas">Cadastrar meta</a>.</div>`}
          <div class="section-title">Funil (oportunidades abertas)</div><${G.Funil} data=${d.etapas} onClick=${() => CRM.irPara('funil/kanban')}/>
        </${Card}>
      </div>
      <div class="grid g3 mt">
        <${Card} title="Clientes" right=${html`<${Btn} sm v="ghost" onClick=${() => CRM.irPara('clientes/indicadores')}>Detalhes</${Btn}>`}>
          <div class="grid g2" style=${{ gap: 8 }}><div><div class="small muted">Clientes ativos</div><div class="strong" style=${{ fontSize: 20, color: 'var(--navy)' }}>${U.int(d.cls.filter(c => c.status === 'Ativo').length)}</div></div>
            <div><div class="small muted">Novos ${ano ? 'em ' + ano : ''}</div><div class="strong" style=${{ fontSize: 20, color: 'var(--navy)' }}>${U.int(d.novos.length)}</div></div></div>
          <div class="section-title">Principais clientes (aprovado)</div>
          ${d.top.length ? d.top.map((t, i) => html`<div key=${t.id} class="list-item small" style=${{ cursor: 'pointer', padding: '6px 0' }} onClick=${() => CRM.abrir('clienteFicha', { id: t.id })}><b class="muted" style=${{ width: 14 }}>${i + 1}</b><span class="ellipsis" style=${{ flex: 1 }}>${t.nome}</span><b class="num">${U.brlK(t.valor)}</b></div>`) : html`<div class="small muted">Sem aprovações no período.</div>`}
        </${Card}>
        <${Card} title="Prospecção e atividades" right=${html`<${Btn} sm v="ghost" onClick=${() => CRM.irPara('prospeccao/indicadores')}>Detalhes</${Btn}>`}>
          ${[['Visitas realizadas', d.visitas, 'compass'], ['Novas oportunidades', d.novasOps, 'columns'], ['Atividades comerciais concluídas', d.feitas, 'check']].map(([l, v, i]) => html`<div key=${l} class="list-item"><${Icon} n=${i} s=${16} c="var(--navy-2)"/><span style=${{ flex: 1 }}>${l}</span><b class="num" style=${{ fontSize: 18, color: 'var(--navy)' }}>${U.int(v)}</b></div>`)}
          <div class="small muted mt">${ano ? 'No ano de ' + ano : 'Todos os anos'}</div>
        </${Card}>
        <${Card} title="Agenda" right=${html`<${Btn} sm v="ghost" onClick=${() => CRM.irPara('agenda/calendario')}>Abrir</${Btn}>`}>
          <div class="row" style=${{ gap: 16 }}><div><div class="small muted">Pendentes</div><div class="strong" style=${{ fontSize: 20, color: 'var(--navy)' }}>${d.pend.length}</div></div>
            <div><div class="small muted">Follow-ups atrasados</div><div class="strong" style=${{ fontSize: 20, color: d.atrasFup ? 'var(--red)' : 'var(--navy)' }}>${d.atrasFup}</div></div></div>
          <div class="section-title">Próximos compromissos</div>
          ${d.prox.length ? d.prox.map(a => html`<div key=${a.id} class="list-item small" style=${{ cursor: 'pointer', padding: '6px 0' }} onClick=${() => CRM.abrir('atividade', { id: a.id })}><${Badge} c=${a.data === U.hoje() ? 'amber' : 'blue'}>${U.data(a.data).slice(0, 5)}</${Badge}><span class="ellipsis" style=${{ flex: 1 }}>${a.titulo}</span><span class="muted">${R.curtoUsuario(a.responsavelId)}</span></div>`) : html`<div class="small muted">Nenhum compromisso futuro.</div>`}
        </${Card}>
      </div>
      <${Card} className="mt" title="Principais oportunidades em aberto" pad=${false} right=${html`<${Btn} sm v="ghost" onClick=${() => CRM.irPara('funil/kanban')}>Funil de vendas</${Btn}>`}>
        <${Table} rows=${topOps} pageSize=${6} onRow=${o => CRM.abrir('oportunidade', { id: o.id })} cols=${[
          { k: 'cli', t: 'Cliente', nosort: true, r: o => html`<b style=${{ fontWeight: 600 }}>${R.nomeCliente(o.clienteId)}</b>` }, { k: 'titulo', t: 'Oportunidade', nosort: true, r: o => html`<span class="ellipsis" style=${{ maxWidth: 320, display: 'inline-block' }}>${o.titulo}</span>` },
          { k: 'etapa', t: 'Etapa', nosort: true, r: o => R.nomeLista(o.etapaId) }, { k: 'vend', t: 'Vendedor', nosort: true, r: o => R.curtoUsuario(o.vendedorId) },
          { k: 'prob', t: 'Prob.', al: 'r', nosort: true, r: o => R.probOp(o) + '%' }, { k: 'valor', t: 'Valor', al: 'r', nosort: true, r: o => html`<b class="num">${U.brl(R.valorOp(o))}</b>` }]}/></${Card}>
    </div>`;
  }
  CRM.ROTAS['dashboard'] = Dashboard;
})();
