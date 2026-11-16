/* =========================================================
   Gráficos (Recharts) com a paleta da identidade I9 TMG
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U;
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart, LabelList } = Recharts;
  const G = {};
  G.CORES = ['#013D59', '#F46F22', '#5E93AE', '#F6A878', '#9DB9C8', '#7A8C99', '#2E7D57', '#C9D6DD', '#B98AC9', '#D8C3A5'];
  G.NAVY = '#013D59'; G.ORANGE = '#F46F22'; G.CINZA = '#C9D6DD'; G.VERDE = '#2E7D57'; G.VERMELHO = '#C25A5A'; G.AZUL = '#5E93AE';
  const eixo = { tickLine: false, axisLine: { stroke: '#E3E8EC' }, tick: { fontSize: 11, fill: '#7A8792' } };
  const grade = html`<${CartesianGrid} stroke="#EEF1F4" vertical=${false}/>`;
  const fmtVal = (fmt) => v => fmt === 'brl' ? U.brl(v) : fmt === 'pct' ? U.pct(v) : U.int(v);
  const fmtEixo = (fmt) => v => fmt === 'brl' ? U.axisK(v) : fmt === 'pct' ? U.pct(v, 0) : U.int(v);
  const tip = (fmt) => html`<${Tooltip} formatter=${(v, n) => [fmtVal(fmt)(v), n]} cursor=${{ fill: 'rgba(1,61,89,.04)' }}/>`;

  /** Barras verticais ou horizontais. series: [{k, l, cor, fmt}] */
  G.Barras = ({ data, x = 'nome', series, fmt = 'num', h = 260, horizontal, empilhado, legenda, rotulo, onClick, larguraEixo = 130 }) => {
    if (!data || !data.length) return html`<div class="empty small">Sem dados para o filtro selecionado.</div>`;
    return html`<${ResponsiveContainer} width="100%" height=${h}>
      <${BarChart} data=${data} layout=${horizontal ? 'vertical' : 'horizontal'} margin=${{ top: rotulo && !horizontal ? 18 : 6, right: horizontal && rotulo ? 70 : 10, left: 0, bottom: 0 }}>
        ${horizontal ? html`<${CartesianGrid} stroke="#EEF1F4" horizontal=${false}/>` : grade}
        ${horizontal ? html`<${XAxis} type="number" ...${eixo} tickFormatter=${fmtEixo(fmt)}/>` : html`<${XAxis} dataKey=${x} ...${eixo} interval=${0} tick=${{ fontSize: 11, fill: '#7A8792' }}/>`}
        ${horizontal ? html`<${YAxis} type="category" dataKey=${x} ...${eixo} width=${larguraEixo} tick=${{ fontSize: 11, fill: '#4A5763' }}/>` : html`<${YAxis} ...${eixo} tickFormatter=${fmtEixo(fmt)} width=${56}/>`}
        ${tip(fmt)}
        ${legenda && html`<${Legend} iconType="circle" iconSize=${8}/>`}
        ${series.map((s, i) => html`<${Bar} key=${s.k} dataKey=${s.k} name=${s.l} fill=${s.cor || G.CORES[i]} stackId=${empilhado ? 'a' : undefined} radius=${empilhado ? 0 : horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize=${horizontal ? 18 : 34} cursor=${onClick ? 'pointer' : undefined} onClick=${onClick ? (d) => onClick(d.payload || d) : undefined}>
          ${rotulo && i === series.length - 1 && html`<${LabelList} dataKey=${s.k} position=${horizontal ? 'right' : 'top'} formatter=${fmtEixo(fmt)} style=${{ fontSize: 10.5, fill: '#4A5763' }}/>`}
        </${Bar}>`)}
      </${BarChart}></${ResponsiveContainer}>`;
  };

  /** Linhas (evolução). series: [{k,l,cor,tracejado}] */
  G.Linhas = ({ data, x = 'nome', series, fmt = 'num', h = 260 }) => {
    if (!data || !data.length) return html`<div class="empty small">Sem dados.</div>`;
    return html`<${ResponsiveContainer} width="100%" height=${h}>
      <${LineChart} data=${data} margin=${{ top: 6, right: 12, left: 0, bottom: 0 }}>
        ${grade}<${XAxis} dataKey=${x} ...${eixo}/><${YAxis} ...${eixo} tickFormatter=${fmtEixo(fmt)} width=${56}/>${tip(fmt)}<${Legend} iconType="plainline" iconSize=${14}/>
        ${series.map((s, i) => html`<${Line} key=${s.k} type="monotone" dataKey=${s.k} name=${s.l} stroke=${s.cor || G.CORES[i]} strokeWidth=${2} strokeDasharray=${s.tracejado ? '5 4' : undefined} dot=${{ r: 2.5 }} activeDot=${{ r: 4 }}/>`)}
      </${LineChart}></${ResponsiveContainer}>`;
  };

  /** Barras + linha (ex.: valor e quantidade). */
  G.Combo = ({ data, x = 'nome', barras, linhas, fmtBarra = 'brl', fmtLinha = 'num', h = 260 }) => {
    if (!data || !data.length) return html`<div class="empty small">Sem dados.</div>`;
    return html`<${ResponsiveContainer} width="100%" height=${h}>
      <${ComposedChart} data=${data} margin=${{ top: 6, right: 6, left: 0, bottom: 0 }}>
        ${grade}<${XAxis} dataKey=${x} ...${eixo}/>
        <${YAxis} yAxisId="l" ...${eixo} tickFormatter=${fmtEixo(fmtBarra)} width=${56}/>
        <${YAxis} yAxisId="r" orientation="right" ...${eixo} tickFormatter=${fmtEixo(fmtLinha)} width=${40}/>
        <${Tooltip} formatter=${(v, n, it) => [(barras.some(b => b.k === it.dataKey) ? fmtVal(fmtBarra) : fmtVal(fmtLinha))(v), n]}/>
        <${Legend} iconType="circle" iconSize=${8}/>
        ${barras.map((s, i) => html`<${Bar} key=${s.k} yAxisId="l" dataKey=${s.k} name=${s.l} fill=${s.cor || G.CORES[i]} radius=${[3, 3, 0, 0]} maxBarSize=${26}/>`)}
        ${(linhas || []).map((s, i) => html`<${Line} key=${s.k} yAxisId="r" type="monotone" dataKey=${s.k} name=${s.l} stroke=${s.cor || G.ORANGE} strokeWidth=${2} dot=${{ r: 2.5 }}/>`)}
      </${ComposedChart}></${ResponsiveContainer}>`;
  };

  /** Rosca. data: [{nome, valor, cor}] */
  G.Rosca = ({ data, fmt = 'num', h = 230, onClick }) => {
    const d = (data || []).filter(x => x.valor > 0);
    if (!d.length) return html`<div class="empty small">Sem dados.</div>`;
    const tot = U.sum(d, x => x.valor);
    return html`<div class="row" style=${{ flexWrap: 'nowrap', alignItems: 'center' }}>
      <div style=${{ width: '50%', minWidth: 140 }}><${ResponsiveContainer} width="100%" height=${h}>
        <${PieChart}><${Pie} data=${d} dataKey="valor" nameKey="nome" innerRadius="58%" outerRadius="88%" paddingAngle=${1} stroke="#fff" onClick=${onClick ? (x) => onClick(x.payload || x) : undefined}>
          ${d.map((x, i) => html`<${Cell} key=${i} fill=${x.cor || G.CORES[i % G.CORES.length]} cursor=${onClick ? 'pointer' : undefined}/>`)}</${Pie}>${tip(fmt)}</${PieChart}></${ResponsiveContainer}></div>
      <div style=${{ flex: 1, minWidth: 0 }}>${d.slice(0, 9).map((x, i) => html`<div key=${i} class="row small" style=${{ flexWrap: 'nowrap', padding: '3px 0' }}>
        <span class="dot" style=${{ background: x.cor || G.CORES[i % G.CORES.length] }}></span><span class="ellipsis" style=${{ flex: 1 }}>${x.nome}</span>
        <b class="num">${fmtVal(fmt)(x.valor)}</b><span class="muted num" style=${{ width: 40, textAlign: 'right' }}>${U.pct(x.valor / tot, 0)}</span></div>`)}
        ${d.length > 9 && html`<div class="small muted">+ ${d.length - 9} outros</div>`}</div></div>`;
  };

  /** Funil horizontal (barras centralizadas proporcionais). data: [{nome, qtd, valor}] */
  G.Funil = ({ data, onClick }) => {
    const mx = Math.max(1, ...data.map(d => d.qtd));
    return html`<div class="col" style=${{ gap: 5 }}>${data.map((d, i) => html`<div key=${i} class="row" style=${{ flexWrap: 'nowrap', cursor: onClick ? 'pointer' : 'default' }} onClick=${() => onClick && onClick(d)}>
      <div class="small ellipsis" style=${{ width: 180, color: 'var(--text-2)' }} title=${d.nome}>${d.nome}</div>
      <div style=${{ flex: 1, display: 'flex', justifyContent: 'center' }}><div style=${{ width: Math.max(4, d.qtd / mx * 100) + '%', background: i < 6 ? G.NAVY : G.VERDE, opacity: 1 - i * 0.07, color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 600, textAlign: 'center', minWidth: 26 }}>${d.qtd}</div></div>
      <div class="small num right-t" style=${{ width: 110 }}>${U.brlK(d.valor)}</div></div>`)}</div>`;
  };

  /** Bolhas (Radar de prazos). data: [{x, y, z, cor, nome}] */
  G.Bolhas = ({ data, h = 420, xLabel, yTicks, onClick }) => {
    if (!data.length) return html`<div class="empty small">Nenhuma proposta pendente no filtro.</div>`;
    const grupos = U.groupBy(data, d => d.grupo);
    return html`<${ResponsiveContainer} width="100%" height=${h}>
      <${ScatterChart} margin=${{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <${CartesianGrid} stroke="#EEF1F4"/>
        <${XAxis} type="number" dataKey="x" name=${xLabel} ...${eixo} label=${{ value: xLabel, position: 'insideBottom', offset: -4, fontSize: 11, fill: '#7A8792' }}/>
        <${YAxis} type="number" dataKey="y" ...${eixo} width=${130} ticks=${yTicks.map(t => t.y)} tickFormatter=${v => (yTicks.find(t => t.y === v) || {}).l || ''} domain=${[0, Math.max(1, yTicks.length + 1)]} interval=${0}/>
        <${ZAxis} type="number" dataKey="z" range=${[60, 900]}/>
        <${ReferenceLine} x=${0} stroke=${G.ORANGE} strokeDasharray="4 3" label=${{ value: 'hoje', fontSize: 10, fill: G.ORANGE, position: 'top' }}/>
        <${Tooltip} cursor=${{ strokeDasharray: '3 3' }} content=${({ payload }) => payload && payload[0] ? html`<div class="card" style=${{ padding: '8px 10px', fontSize: 12 }}><b>${payload[0].payload.nome}</b><div class="muted">${payload[0].payload.det}</div></div>` : null}/>
        <${Legend} iconType="circle" iconSize=${8}/>
        ${Object.keys(grupos).map((g) => html`<${Scatter} key=${g} name=${g} data=${grupos[g]} fill=${grupos[g][0].cor} fillOpacity=${0.75} cursor="pointer" onClick=${d => onClick && onClick(d.payload || d)}/>`)}
      </${ScatterChart}></${ResponsiveContainer}>`;
  };

  /** Agrupa registros por mês (1..12) somando qtd/valor. */
  G.porMes = (regs, dataDe, valorDe) => U.MESES.map((m, i) => { const rs = regs.filter(r => U.mes(dataDe(r)) === i + 1); return { nome: m, qtd: rs.length, valor: valorDe ? U.sum(rs, valorDe) : 0 }; });
  /** Top N com agrupamento e "Outros". */
  G.topN = (regs, chave, nomeDe, valorDe, n = 10) => {
    const g = U.groupBy(regs, chave); const arr = Object.keys(g).map(k => ({ id: k, nome: nomeDe(k) || '(não informado)', qtd: g[k].length, valor: valorDe ? U.sum(g[k], valorDe) : g[k].length, regs: g[k] }));
    return arr.sort((a, b) => b.valor - a.valor).slice(0, n);
  };

  CRM.G = G;
})();
