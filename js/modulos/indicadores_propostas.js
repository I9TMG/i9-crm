/* =========================================================
   INDICADORES DE PROPOSTAS · RADAR DE PRAZOS · INDICADORES CAPEX
   Calculados a partir dos registros reais da tabela de propostas
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useState, useMemo } = React;
  const { Field, Btn, Modal, Badge, Card, Table, Filtros, FSel, Status, Kpi, Seg } = UI;

  /* ---------- Lista de propostas (drill-down de gráficos) ---------- */
  function ListaPropostas({ titulo, regs, onClose }) {
    return html`<${Modal} size="lg" title=${titulo} sub=${regs.length + ' proposta(s) · ' + U.brl(U.sum(regs, R.valorTotal))} onClose=${onClose}
      footer=${html`<div class="spacer"></div><${Btn} icon="download" onClick=${() => CRM.exportarPropostas(regs, regs[0] ? regs[0].categoria : 'Comercial', 'Selecao_propostas')}>Exportar Excel</${Btn}>`}>
      <${Table} rows=${regs} pageSize=${15} onRow=${p => CRM.abrir('propostaDetalhe', { id: p.id })} sortInicial=${{ k: 'valor', d: 'desc' }} cols=${[
        { k: 'codigo', t: 'Código' }, { k: 'dataEntrada', t: 'Entrada', r: p => U.data(p.dataEntrada) }, { k: 'cli', t: 'Cliente', v: p => R.nomeCliente(p.clienteId), r: p => R.nomeCliente(p.clienteId) },
        { k: 'descricao', t: 'Descrição', r: p => html`<span class="ellipsis" style=${{ maxWidth: 240, display: 'inline-block' }}>${p.descricao}</span>` },
        { k: 'valor', t: 'Valor', al: 'r', v: R.valorTotal, r: p => U.brl(R.valorTotal(p)) }, { k: 'status', t: 'Status', r: p => html`<${Status} s=${p.categoria === 'CAPEX' ? p.statusCapex : p.status}/>` }]}/>
    </${Modal}>`;
  }
  CRM.MODAIS.listaPropostas = ListaPropostas;
  const drill = (titulo, regs) => CRM.abrir('listaPropostas', { titulo, regs });

  const metricas = rs => {
    const g = rs.filter(p => R.resultado(p) === 'ganha'), pd = rs.filter(p => R.resultado(p) === 'perdida'), ab = rs.filter(p => R.resultado(p) === 'aberta');
    const vAp = U.sum(g, R.valorAprovado), vPd = U.sum(pd, R.valorTotal);
    const dias = rs.map(R.diasElaboracao).filter(d => d !== null && d >= 0);
    return { n: rs.length, total: U.sum(rs, R.valorTotal), aprovado: vAp, perdido: vPd, nG: g.length, nP: pd.length, nA: ab.length, aberto: U.sum(ab, R.valorTotal),
      conv: U.div(g.length, g.length + pd.length), convValor: U.div(vAp, vAp + vPd), ticket: U.div(vAp, g.length), ticketProp: U.div(U.sum(rs, R.valorTotal), rs.filter(p => R.valorTotal(p) > 0).length), dias: dias.length ? U.sum(dias) / dias.length : null };
  };
  CRM.metricasPropostas = metricas;

  /* ---------- Indicadores de propostas ---------- */
  function IndicadoresPropostas() {
    DB.useDB();
    const anos = R.anosDisponiveis('Comercial');
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: new Date().getFullYear(), ini: '', fim: '', vend: '', cli: '', seg: '', status: '' }, 'indprop');
    const [compPor, setCompPor] = useState(() => { const c = sessionStorage.getItem('ind:comparar'); sessionStorage.removeItem('ind:comparar'); return c ? 'ano' : 'ano'; });
    const rows = useMemo(() => CRM.filtrarPropostas('Comercial', f), [DB.version, f]);
    const todosAnos = useMemo(() => CRM.filtrarPropostas('Comercial', { ...f, ano: 'todos', ini: '', fim: '' }), [DB.version, f]);
    const m = metricas(rows);
    const anoNum = f.ano === 'todos' ? null : Number(f.ano);
    const mAnt = anoNum ? metricas(todosAnos.filter(p => R.anoProposta(p) === anoNum - 1)) : null;
    const evol = anoNum ? U.MESES.map((nome, i) => { const rs = rows.filter(p => U.mes(p.dataEntrada) === i + 1); const ant = todosAnos.filter(p => R.anoProposta(p) === anoNum - 1 && U.mes(p.dataEntrada) === i + 1); return { nome, proposto: U.sum(rs, R.valorTotal), aprovado: U.sum(rs, R.valorAprovado), qtd: rs.length, qtdAnt: ant.length, regs: rs }; })
      : U.uniq(rows.map(R.anoProposta)).filter(Boolean).sort().map(a => { const rs = rows.filter(p => R.anoProposta(p) === a); return { nome: String(a), proposto: U.sum(rs, R.valorTotal), aprovado: U.sum(rs, R.valorAprovado), qtd: rs.length, regs: rs }; });
    // comparação
    const chaveComp = { ano: p => String(R.anoProposta(p) || ''), vend: p => p.vendedorId || '', seg: p => CRM.segmentoProposta(p) || '' }[compPor];
    const baseComp = compPor === 'ano' ? todosAnos : rows;
    const comp = Object.entries(U.groupBy(baseComp, chaveComp)).map(([k, rs]) => ({ k, nome: compPor === 'ano' ? k : compPor === 'vend' ? R.nomeUsuario(k) || '(sem responsável)' : R.nomeLista(k) || '(sem segmento)', regs: rs, ...metricas(rs) }))
      .sort((a, b) => compPor === 'ano' ? U.cmp(a.k, b.k) : b.total - a.total);
    const porVend = G.topN(rows, p => p.vendedorId, R.nomeUsuario, R.valorTotal, 12).map(x => ({ ...x, aprovado: U.sum(x.regs, R.valorAprovado) }));
    const porCli = G.topN(rows, p => p.clienteId, R.nomeCliente, R.valorTotal, 10);
    const porSeg = G.topN(rows, p => CRM.segmentoProposta(p), R.nomeLista, R.valorTotal, 12).map(x => ({ nome: x.nome, valor: x.valor, cor: R.corSegmento(x.id), regs: x.regs }));
    const porStatus = G.topN(rows, p => p.status, k => k, null, 10).map(x => ({ nome: x.nome, valor: x.qtd, regs: x.regs, cor: { Recebida: G.AZUL, 'Entregue/Enviado': G.NAVY, Aprovada: G.VERDE, Reprovada: G.VERMELHO, Declinada: '#E0A458', Cancelada: '#B8C4CC' }[x.nome] }));
    const linhaMap = {}; rows.forEach(p => Object.entries(p.valores || {}).forEach(([k, v]) => { if (!v) return; linhaMap[k] = linhaMap[k] || { id: k, nome: R.nomeLista(k), valor: 0, aprovado: 0, regs: [] }; linhaMap[k].valor += U.num(v); if (R.resultado(p) === 'ganha') linhaMap[k].aprovado += U.num(v); linhaMap[k].regs.push(p); }));
    const porLinha = Object.values(linhaMap).sort((a, b) => b.valor - a.valor);
    const porUF = G.topN(rows, p => CRM.ufProposta(p) || '', k => k || '(sem UF)', R.valorTotal, 15);
    const faixas = R.lista('faixaValor').map(fx => { const rs = rows.filter(p => { const fv = R.faixaValor(R.valorTotal(p)); return fv && fv.id === fx.id; }); return { nome: fx.nome, regs: rs, ...metricas(rs) }; }).filter(x => x.n);
    const perdas = G.topN(rows.filter(p => R.resultado(p) === 'perdida'), p => p.motivoPerdaId || '', k => R.nomeLista(k) || 'Motivo não informado', null, 10);
    const delta = (a, b, inv) => b !== null && b !== undefined && mAnt ? html` <${UI.Delta} atual=${a} anterior=${b} inverso=${inv}/> <span class="muted">vs ${anoNum - 1}</span>` : null;
    return html`<div>
      <div class="row mb"><${UI.Anos} value=${f.ano} onChange=${v => set('ano', v)} anos=${anos}/></div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${UI.FPeriodo} label="Período (entrada)" ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <${FSel} label="Status" value=${f.status} onChange=${v => set('status', v)} options=${R.lista('statusProposta').map(x => x.nome)}/>
      </${Filtros}>
      <div class="grid g4">
        <${Kpi} label="Propostas emitidas" value=${U.int(m.n)} foot=${html`${m.nA} em aberto${delta(m.n, mAnt && mAnt.n)}`}/>
        <${Kpi} label="Valor total proposto" value=${U.brlK(m.total)} foot=${html`Ticket por proposta ${U.brlK(m.ticketProp)}${delta(m.total, mAnt && mAnt.total)}`}/>
        <${Kpi} label="Valor aprovado" value=${U.brlK(m.aprovado)} accent foot=${html`${m.nG} aprovada(s)${delta(m.aprovado, mAnt && mAnt.aprovado)}`}/>
        <${Kpi} label="Valor perdido" value=${U.brlK(m.perdido)} foot=${m.nP + ' perdida(s) / cancelada(s)'}/>
        <${Kpi} label="Taxa de conversão" value=${U.pct(m.conv)} foot=${html`Em valor: ${U.pct(m.convValor)} · decididas ${m.nG + m.nP}${delta(m.conv, mAnt && mAnt.conv)}`}/>
        <${Kpi} label="Ticket médio (aprovadas)" value=${U.brlK(m.ticket)}/>
        <${Kpi} label="Propostas em aberto" value=${U.int(m.nA)} foot=${U.brlK(m.aberto) + ' em negociação'}/>
        <${Kpi} label="Tempo médio de elaboração" value=${m.dias === null ? '—' : Math.round(m.dias) + ' dias'} foot="da entrada ao envio"/>
      </div>
      <${Card} className="mt" title=${anoNum ? 'Evolução mensal — ' + anoNum : 'Evolução anual'} sub=${anoNum ? 'Valor proposto e aprovado por mês de entrada · linha: quantidade (tracejada: ano anterior)' : 'Valor proposto e aprovado por ano'}>
        <${G.Combo} data=${evol} barras=${[{ k: 'proposto', l: 'Proposto', cor: G.CINZA }, { k: 'aprovado', l: 'Aprovado', cor: G.NAVY }]} linhas=${[{ k: 'qtd', l: 'Qtd. propostas', cor: G.ORANGE }].concat(anoNum ? [{ k: 'qtdAnt', l: 'Qtd. ' + (anoNum - 1), cor: '#F6A878' }] : [])} h=${280}/>
      </${Card}>
      <${Card} className="mt" title="Comparação" sub=${compPor === 'ano' ? 'Todos os anos com os filtros aplicados (exceto ano/período)' : 'No recorte selecionado'} pad=${false}
        right=${html`<span class="small muted">Comparar por</span><${Seg} value=${compPor} onChange=${setCompPor} options=${[{ v: 'ano', l: 'Ano' }, { v: 'vend', l: 'Vendedor' }, { v: 'seg', l: 'Segmento' }]}/>`}>
        <${Table} rows=${comp.map(c => ({ ...c, id: c.k }))} pageSize=${30} onRow=${c => drill(c.nome, c.regs)} cols=${[
          { k: 'nome', t: compPor === 'ano' ? 'Ano' : compPor === 'vend' ? 'Vendedor' : 'Segmento', r: c => html`<b>${c.nome}</b>` }, { k: 'n', t: 'Propostas', al: 'r' }, { k: 'nA', t: 'Abertas', al: 'r' }, { k: 'nG', t: 'Ganhas', al: 'r' }, { k: 'nP', t: 'Perdidas', al: 'r' },
          { k: 'conv', t: 'Conversão', al: 'r', r: c => U.pct(c.conv) }, { k: 'total', t: 'Valor proposto', al: 'r', r: c => U.brl(c.total) }, { k: 'aberto', t: 'Pipeline aberto', al: 'r', r: c => U.brl(c.aberto) },
          { k: 'aprovado', t: 'Aprovado', al: 'r', r: c => html`<b>${U.brl(c.aprovado)}</b>` }, { k: 'ticket', t: 'Ticket médio', al: 'r', r: c => U.brl(c.ticket) }]}/>
      </${Card}>
      <div class="grid g2 mt">
        <${Card} title="Propostas por vendedor" sub="Valor proposto × aprovado"><${G.Barras} horizontal data=${porVend} series=${[{ k: 'valor', l: 'Proposto', cor: G.CINZA }, { k: 'aprovado', l: 'Aprovado', cor: G.NAVY }]} fmt="brl" legenda h=${280} larguraEixo=${150} onClick=${d => drill('Vendedor: ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Propostas por cliente (top 10)" sub="Valor proposto"><${G.Barras} horizontal data=${porCli} series=${[{ k: 'valor', l: 'Proposto', cor: G.AZUL }]} fmt="brl" rotulo h=${280} larguraEixo=${150} onClick=${d => drill('Cliente: ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Propostas por segmento" sub="Valor proposto"><${G.Rosca} data=${porSeg} fmt="brl" onClick=${d => drill('Segmento: ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Propostas por status" sub="Quantidade"><${G.Rosca} data=${porStatus} onClick=${d => drill('Status: ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Valor por tipo de proposta" sub="Soma dos valores por linha (produto/serviço)"><${G.Barras} horizontal data=${porLinha} series=${[{ k: 'valor', l: 'Proposto', cor: G.CINZA }, { k: 'aprovado', l: 'Aprovado', cor: G.ORANGE }]} fmt="brl" legenda h=${280} onClick=${d => drill('Tipo: ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Valor por UF"><${G.Barras} data=${porUF} series=${[{ k: 'valor', l: 'Proposto', cor: G.NAVY }]} fmt="brl" h=${280} onClick=${d => drill('UF: ' + d.nome, d.regs)}/></${Card}>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Conversão por faixa de valor" pad=${false}><${Table} rows=${faixas.map(x => ({ ...x, id: x.nome }))} pageSize=${20} onRow=${x => drill('Faixa: ' + x.nome, x.regs)} cols=${[{ k: 'nome', t: 'Faixa' }, { k: 'n', t: 'Propostas', al: 'r' }, { k: 'nG', t: 'Ganhas', al: 'r' }, { k: 'conv', t: 'Conversão', al: 'r', r: x => U.pct(x.conv) }, { k: 'aprovado', t: 'Aprovado', al: 'r', r: x => U.brlK(x.aprovado) }]}/></${Card}>
        <${Card} title="Perdas por motivo" sub="Quantidade de propostas perdidas"><${G.Barras} horizontal data=${perdas.map(x => ({ ...x, valor: x.qtd }))} series=${[{ k: 'valor', l: 'Propostas', cor: G.VERMELHO }]} rotulo h=${240} larguraEixo=${150} onClick=${d => drill('Perdas: ' + d.nome, d.regs)}/></${Card}>
      </div>
    </div>`;
  }

  /* ---------- Radar de prazos (gráfico RADAR da planilha) ---------- */
  function Radar() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ vend: '', elab: '', janela: '60' }, 'radar');
    const h = U.hoje();
    const pend = DB.all('propostas').filter(p => !p.arquivada && p.categoria === 'Comercial' && R.resultado(p) === 'aberta' && !p.dataEnvio && R.doUsuario(p)
      && (!f.vend || p.vendedorId === f.vend) && (!f.elab || (p.statusElaboracao || 'Sem status') === f.elab));
    const comPrazo = pend.filter(p => p.dataLimite && (f.janela === 'todos' || Math.abs(U.dias(h, p.dataLimite)) <= Number(f.janela)));
    const clientes = U.uniq(comPrazo.map(p => p.clienteId)).sort((a, b) => U.cmp(R.nomeCliente(b), R.nomeCliente(a)));
    const yTicks = clientes.map((c, i) => ({ y: i + 1, l: R.nomeCliente(c).slice(0, 22) }));
    const COR = { 'Não iniciado': '#9DB9C8', 'Em andamento': G.ORANGE, 'Concluído': G.VERDE, 'Sem status': '#7A8C99' };
    const data = comPrazo.map(p => ({ x: U.dias(h, p.dataLimite), y: clientes.indexOf(p.clienteId) + 1, z: Math.max(1, R.valorTotal(p) || U.num((DB.get('oportunidades', p.oportunidadeId) || {}).valorEstimado) || 1), grupo: p.statusElaboracao || 'Sem status', cor: COR[p.statusElaboracao || 'Sem status'], nome: p.codigo + ' — ' + R.nomeCliente(p.clienteId), det: p.descricao + ' · limite ' + U.data(p.dataLimite) + ' · ' + R.nomeUsuario(p.vendedorId), id: p.id }));
    const lista = pend.slice().sort((a, b) => U.cmp(a.dataLimite || '9999', b.dataLimite || '9999'));
    const atrasadas = pend.filter(p => p.dataLimite && p.dataLimite < h).length, semana = pend.filter(p => p.dataLimite && p.dataLimite >= h && p.dataLimite <= U.addDias(h, 7)).length;
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Status da atividade" value=${f.elab} onChange=${v => set('elab', v)} options=${R.lista('statusElaboracao').map(x => x.nome).concat('Sem status')}/>
        <${Field} label="Janela do gráfico"><${Seg} value=${f.janela} onChange=${v => set('janela', v)} options=${[{ v: '30', l: '±30 dias' }, { v: '60', l: '±60 dias' }, { v: '120', l: '±120 dias' }, { v: 'todos', l: 'Todos' }]}/></${Field}>
      </${Filtros}>
      <div class="grid g4 mb"><${Kpi} label="Propostas a enviar" value=${U.int(pend.length)} foot=${U.brlK(U.sum(pend, R.valorTotal))}/><${Kpi} label="Prazo vencido" value=${U.int(atrasadas)} foot="data limite já passou" accent/>
        <${Kpi} label="Vencem em 7 dias" value=${U.int(semana)}/><${Kpi} label="Sem data limite" value=${U.int(pend.filter(p => !p.dataLimite).length)}/></div>
      <${Card} title="Radar de prazos" sub="Eixo X: dias até a data limite (negativo = atrasada) · bolha: valor · cor: status da atividade · clique para abrir">
        <${G.Bolhas} data=${data} yTicks=${yTicks} h=${Math.max(320, 60 + yTicks.length * 22)} xLabel="dias até a data limite" onClick=${d => CRM.abrir('propostaDetalhe', { id: d.id })}/></${Card}>
      <${Card} className="mt" title="Prioridade de envio" sub="Propostas ainda não enviadas, por data limite" pad=${false}>
        <${Table} rows=${lista} pageSize=${20} onRow=${p => CRM.abrir('propostaDetalhe', { id: p.id })} cols=${[
          { k: 'prazo', t: 'Prazo', v: p => p.dataLimite || '9999', r: p => { const d = p.dataLimite ? U.dias(h, p.dataLimite) : null; return d === null ? html`<span class="muted">sem data</span>` : html`<${Badge} c=${d < 0 ? 'red' : d <= 7 ? 'amber' : 'blue'}>${d < 0 ? Math.abs(d) + ' dias atrasada' : d === 0 ? 'hoje' : 'em ' + d + ' dias'}</${Badge}>`; } },
          { k: 'dataLimite', t: 'Data limite', r: p => U.data(p.dataLimite) }, { k: 'codigo', t: 'Código' }, { k: 'cli', t: 'Cliente', v: p => R.nomeCliente(p.clienteId), r: p => R.nomeCliente(p.clienteId) },
          { k: 'descricao', t: 'Descrição', r: p => html`<span class="ellipsis" style=${{ maxWidth: 260, display: 'inline-block' }}>${p.descricao}</span>` }, { k: 'vend', t: 'Responsável', r: p => R.curtoUsuario(p.vendedorId) },
          { k: 'elab', t: 'Elaboração', v: p => p.statusElaboracao, r: p => html`<${Status} s=${p.statusElaboracao || ''}/>` }, { k: 'valor', t: 'Valor', al: 'r', v: R.valorTotal, r: p => U.brlK(R.valorTotal(p)) }]}/>
      </${Card}>
    </div>`;
  }

  /* ---------- Indicadores CAPEX ---------- */
  function IndicadoresCapex() {
    DB.useDB();
    const anos = R.anosDisponiveis('CAPEX');
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: 'todos', ini: '', fim: '', vend: '', cli: '', seg: '', status: '' }, 'indcapex');
    const rows = useMemo(() => CRM.filtrarPropostas('CAPEX', f), [DB.version, f]);
    const pot = U.sum(rows, R.valorTotal);
    const porSeg = G.topN(rows, p => CRM.segmentoProposta(p), R.nomeLista, R.valorTotal, 10).map(x => ({ nome: x.nome, valor: x.valor, cor: R.corSegmento(x.id), regs: x.regs }));
    const porCli = G.topN(rows, p => p.clienteId, R.nomeCliente, R.valorTotal, 10);
    const porAno = Object.entries(U.groupBy(rows, p => String(R.anoProposta(p)))).sort().map(([a, rs]) => ({ nome: a, qtd: rs.length, valor: U.sum(rs, R.valorTotal), regs: rs }));
    const porStatus = G.topN(rows, p => p.statusCapex || 'Sem status', k => k, null, 10).map(x => ({ nome: x.nome, valor: x.qtd, regs: x.regs }));
    const porVend = G.topN(rows, p => p.vendedorId, R.nomeUsuario, R.valorTotal, 10);
    return html`<div>
      <div class="row mb"><${UI.Anos} value=${f.ano} onChange=${v => set('ano', v)} anos=${anos}/></div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${UI.FPeriodo} ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${FSel} label="Status" value=${f.status} onChange=${v => set('status', v)} options=${R.lista('statusCapex').map(x => x.nome)}/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
      </${Filtros}>
      <div class="grid g4">
        <${Kpi} label="Oportunidades CAPEX" value=${U.int(rows.length)} accent/>
        <${Kpi} label="Potencial de investimento" value=${U.brlK(pot)} foot=${rows.filter(p => R.valorTotal(p) > 0).length + ' com valor estimado'}/>
        <${Kpi} label="Em andamento" value=${U.int(rows.filter(p => ['Não iniciado', 'Em andamento', ''].includes(p.statusCapex || '')).length)}/>
        <${Kpi} label="Concluídas / enviadas" value=${U.int(rows.filter(p => ['Concluído', 'Entregue/Enviado'].includes(p.statusCapex)).length)}/>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Potencial por segmento"><${G.Rosca} data=${porSeg} fmt="brl" onClick=${d => drill('CAPEX — ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Por status da atividade" sub="Quantidade"><${G.Rosca} data=${porStatus} onClick=${d => drill('CAPEX — ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Maiores oportunidades por cliente"><${G.Barras} horizontal data=${porCli} series=${[{ k: 'valor', l: 'Potencial', cor: '#6B5196' }]} fmt="brl" rotulo h=${260} larguraEixo=${140} onClick=${d => drill('CAPEX — ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Por ano de registro" sub="Quantidade de oportunidades"><${G.Barras} data=${porAno} series=${[{ k: 'qtd', l: 'Oportunidades', cor: G.NAVY }]} rotulo h=${260} onClick=${d => drill('CAPEX ' + d.nome, d.regs)}/></${Card}>
        <${Card} title="Por vendedor"><${G.Barras} horizontal data=${porVend} series=${[{ k: 'qtd', l: 'Oportunidades', cor: G.AZUL }]} rotulo h=${220} larguraEixo=${150}/></${Card}>
      </div>
    </div>`;
  }

  Object.assign(CRM.ROTAS, { 'propostas/indicadores': IndicadoresPropostas, 'propostas/radar': Radar, 'capex/indicadores': IndicadoresCapex });
})();
