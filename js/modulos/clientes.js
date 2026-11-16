/* =========================================================
   CLIENTES — visão comercial, ficha do cliente e indicadores
   (usa exclusivamente o cadastro mestre de Cadastros)
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useState, useMemo } = React;
  const { Btn, Modal, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Tabs, Seg, Field, Inp } = UI;

  /* ---------- Resumo comercial por cliente (cache por versão) ---------- */
  let cv = -1, cres = {};
  R.resumoClientes = () => {
    if (cv === DB.version) return cres; const m = {};
    const get = id => (m[id] = m[id] || { abertas: 0, pipeline: 0, orcado: 0, aprovado: 0, nProp: 0, nGanha: 0, nPerdida: 0, ultima: '', contratosVig: 0 });
    DB.all('propostas').forEach(p => { if (p.arquivada) return; const r = get(p.clienteId); const v = R.valorTotal(p); const res = R.resultado(p);
      r.nProp++; r.orcado += v; if (res === 'aberta') { r.abertas++; r.pipeline += v; } if (res === 'ganha') { r.nGanha++; r.aprovado += R.valorAprovado(p); } if (res === 'perdida') r.nPerdida++;
      const d = p.dataPedido || p.dataEnvio || p.dataEntrada; if (d && d > r.ultima) r.ultima = d; });
    DB.all('atividades').forEach(a => { if (!a.clienteId || a.status !== 'Feito') return; const r = get(a.clienteId); const d = a.dataConclusao || a.data; if (d && d > r.ultima && d <= U.hoje()) r.ultima = d; });
    DB.all('prospeccoes').forEach(p => { if (!p.clienteId) return; const r = get(p.clienteId); const d = p.dataRealizada || p.dataAtualizacao; if (d && d > r.ultima && d <= U.hoje()) r.ultima = d; });
    DB.all('contratos').forEach(c => { if (R.situacaoContrato(c) === 'Vigente') get(c.clienteId).contratosVig++; });
    cres = m; cv = DB.version; return m;
  };
  const vazio = { abertas: 0, pipeline: 0, orcado: 0, aprovado: 0, nProp: 0, nGanha: 0, nPerdida: 0, ultima: '', contratosVig: 0 };

  /* ---------- Lista de clientes ---------- */
  function ClientesLista() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', seg: '', cidade: '', uf: '', status: '', vend: '', mov: '' }, 'clientes');
    const [modo, setModo] = useState('lista');
    const res = R.resumoClientes(); const idx = R.idx();
    const rows = useMemo(() => {
      const t = U.normTxt(f.q); const c12 = U.addMeses(U.hoje(), -12);
      return DB.all('clientes').filter(c => {
        const r = res[c.id] || vazio; const sedes = idx.sedesPorCliente[c.id] || [];
        return (!t || U.normTxt([c.nomeFantasia, c.razaoSocial, c.codigo, c.cnpj].join(' ')).includes(t)) && (!f.seg || c.segmentoId === f.seg || (c.segmentosSecundarios || []).includes(f.seg))
          && (!f.cidade || U.normTxt(c.cidade).includes(U.normTxt(f.cidade)) || sedes.some(s => U.normTxt(s.cidade).includes(U.normTxt(f.cidade))))
          && (!f.uf || c.uf === f.uf || sedes.some(s => s.uf === f.uf)) && (!f.status || c.status === f.status) && (!f.vend || c.vendedorId === f.vend) && R.doUsuario(c)
          && (!f.mov || (f.mov === 'andamento' ? r.abertas > 0 : f.mov === 'contrato' ? r.contratosVig > 0 : (!r.ultima || r.ultima < c12)));
      });
    }, [DB.version, f]);
    const cols = [
      { k: 'codigo', t: 'Código', r: c => html`<span class="small num">${c.codigo}</span>` },
      { k: 'nome', t: 'Cliente', v: c => c.nomeFantasia, r: c => html`<b style=${{ fontWeight: 600 }}>${c.nomeFantasia}</b>` },
      { k: 'seg', t: 'Segmento', v: c => R.nomeLista(c.segmentoId), r: c => html`<span class="row" style=${{ gap: 6, flexWrap: 'nowrap' }}><span class="dot" style=${{ background: R.corSegmento(c.segmentoId) }}></span>${R.nomeLista(c.segmentoId)}</span>` },
      { k: 'local', t: 'Cidade/UF', v: c => c.uf + c.cidade, r: c => [c.cidade, c.uf].filter(Boolean).join('/') || '—' },
      { k: 'sedes', t: 'Sedes', al: 'r', v: c => (idx.sedesPorCliente[c.id] || []).length, r: c => (idx.sedesPorCliente[c.id] || []).length },
      { k: 'vend', t: 'Responsável', v: c => R.nomeUsuario(c.vendedorId), r: c => R.curtoUsuario(c.vendedorId) || '—' },
      { k: 'status', t: 'Status', r: c => html`<${Status} s=${c.status}/>` },
      { k: 'pipe', t: 'Pipeline aberto', al: 'r', v: c => (res[c.id] || vazio).pipeline, r: c => (res[c.id] || vazio).abertas ? html`<span class="num">${U.brlK((res[c.id]).pipeline)} <span class="muted small">(${res[c.id].abertas})</span></span>` : html`<span class="muted">—</span>` },
      { k: 'orc', t: 'Total orçado', al: 'r', v: c => (res[c.id] || vazio).orcado, r: c => html`<span class="num">${U.brlK((res[c.id] || vazio).orcado)}</span>` },
      { k: 'apr', t: 'Total aprovado', al: 'r', v: c => (res[c.id] || vazio).aprovado, r: c => html`<span class="num">${U.brlK((res[c.id] || vazio).aprovado)}</span>` },
      { k: 'ult', t: 'Última movimentação', v: c => (res[c.id] || vazio).ultima, r: c => U.data((res[c.id] || vazio).ultima) },
    ];
    const exportar = () => U.exportarExcel('Clientes_' + U.hoje() + '.xlsx', [{ nome: 'Clientes', linhas: rows, colunas: [{ t: 'Código', v: c => c.codigo }, { t: 'Cliente', v: c => c.nomeFantasia }, { t: 'Segmento', v: c => R.nomeLista(c.segmentoId) }, { t: 'Cidade', v: c => c.cidade }, { t: 'UF', v: c => c.uf }, { t: 'Responsável', v: c => R.nomeUsuario(c.vendedorId) }, { t: 'Status', v: c => c.status },
      { t: 'Propostas', v: c => (res[c.id] || vazio).nProp }, { t: 'Em andamento', v: c => (res[c.id] || vazio).abertas }, { t: 'Pipeline aberto (R$)', v: c => (res[c.id] || vazio).pipeline }, { t: 'Total orçado (R$)', v: c => (res[c.id] || vazio).orcado }, { t: 'Total aprovado (R$)', v: c => (res[c.id] || vazio).aprovado }, { t: 'Última movimentação', v: c => (res[c.id] || vazio).ultima }] }]);
    const grupos = modo === 'vend' ? U.groupBy(rows, c => c.vendedorId || '') : null;
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Seg} value=${modo} onChange=${setModo} options=${[{ v: 'lista', l: 'Lista' }, { v: 'vend', l: 'Por vendedor' }]}/><${Btn} icon="download" onClick=${exportar}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('clienteForm', {})}>Novo cliente</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Nome, código ou CNPJ"/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <${Field} label="Cidade"><${Inp} value=${f.cidade} onChange=${v => set('cidade', v)} placeholder="Cidade"/></${Field}>
        <${FSel} label="Estado" value=${f.uf} onChange=${v => set('uf', v)} options=${U.UFS}/>
        <${FSel} label="Situação" value=${f.status} onChange=${v => set('status', v)} options=${R.STATUS_CLIENTE}/>
        <${FSel} label="Responsável" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Movimentação" value=${f.mov} onChange=${v => set('mov', v)} options=${[{ v: 'andamento', l: 'Com propostas em andamento' }, { v: 'contrato', l: 'Com contrato vigente' }, { v: 'sem', l: 'Sem movimentação há 12 meses' }]}/>
      </${Filtros}>
      ${modo === 'lista' ? html`<${Card} pad=${false} title=${U.int(rows.length) + ' cliente(s)'} sub="Clique para abrir a ficha do cliente"><${Table} cols=${cols} rows=${rows} sortInicial=${{ k: 'orc', d: 'desc' }} onRow=${c => CRM.abrir('clienteFicha', { id: c.id })}/></${Card}>`
        : Object.keys(grupos).sort((a, b) => U.cmp(R.nomeUsuario(a), R.nomeUsuario(b))).map(v => html`<${Card} key=${v} className="mb" pad=${false} title=${(R.nomeUsuario(v) || 'Sem responsável') + ' — ' + grupos[v].length + ' cliente(s)'} sub=${'Pipeline aberto: ' + U.brlK(U.sum(grupos[v], c => (res[c.id] || vazio).pipeline)) + ' · Aprovado: ' + U.brlK(U.sum(grupos[v], c => (res[c.id] || vazio).aprovado))}>
          <${Table} cols=${cols.filter(c => c.k !== 'vend')} rows=${grupos[v]} pageSize=${15} sortInicial=${{ k: 'orc', d: 'desc' }} onRow=${c => CRM.abrir('clienteFicha', { id: c.id })}/></${Card}>`)}
    </div>`;
  }

  /* ---------- Ficha do cliente ---------- */
  function ClienteFicha({ id, onClose }) {
    DB.useDB();
    const c = DB.get('clientes', id); const [aba, setAba] = useState('resumo');
    if (!c) return html`<${Modal} title="Cliente não encontrado" onClose=${onClose}>O cadastro pode ter sido mesclado ou excluído.</${Modal}>`;
    const idx = R.idx(); const r = R.resumoClientes()[id] || vazio;
    const props = (idx.propostasPorCliente[id] || []).filter(p => !p.arquivada).sort((a, b) => U.cmp(b.dataEntrada, a.dataEntrada));
    const opps = (idx.oppsPorCliente[id] || []); const stos = idx.stosPorCliente[id] || []; const prosp = idx.prospPorCliente[id] || [];
    const ativs = (idx.atividadesPorCliente[id] || []).slice().sort((a, b) => U.cmp(b.data, a.data)); const cts = idx.contratosPorCliente[id] || [];
    const sedes = idx.sedesPorCliente[id] || []; const contatos = idx.contatosPorCliente[id] || [];
    const conv = U.div(r.nGanha, r.nGanha + r.nPerdida);
    const pend = ativs.filter(a => a.status === 'A fazer').sort((a, b) => U.cmp(a.data, b.data));
    const hist = [].concat(
      props.map(p => ({ data: p.dataEntrada, acao: 'Proposta ' + p.codigo + ' recebida', detalhe: p.descricao })),
      props.filter(p => p.dataEnvio).map(p => ({ data: p.dataEnvio, acao: 'Proposta ' + p.codigo + ' enviada', detalhe: U.brl(R.valorTotal(p)) })),
      props.filter(p => R.resultado(p) !== 'aberta' && (p.dataPedido || p.atualizadoEm)).map(p => ({ data: p.dataPedido || (p.atualizadoEm || '').slice(0, 10), acao: 'Proposta ' + p.codigo + ' — ' + p.status, detalhe: R.resultado(p) === 'ganha' ? U.brl(R.valorAprovado(p)) : R.nomeLista(p.motivoPerdaId) })),
      ativs.filter(a => a.status === 'Feito').map(a => ({ data: a.dataConclusao || a.data, acao: a.categoria + ': ' + a.titulo, detalhe: a.resultado, usuario: R.nomeUsuario(a.responsavelId) })),
      prosp.map(p => ({ data: p.dataRealizada || p.dataPrevista || p.dataAtualizacao, acao: 'Prospecção — ' + (R.nomeLista(p.statusId) || ''), detalhe: [p.objetivo, p.resultado].filter(Boolean).join(' · ') })),
      DB.all('auditoria').filter(a => a.registroId === id).map(a => ({ data: a.data, acao: 'Cadastro: ' + a.acao, detalhe: a.resumo, usuario: a.usuario }))
    ).filter(x => x.data).sort((a, b) => U.cmp(b.data, a.data));
    const colsProp = [
      { k: 'codigo', t: 'Código', r: p => html`<span class="num small">${p.codigo}</span>` }, { k: 'dataEntrada', t: 'Entrada', r: p => U.data(p.dataEntrada) },
      { k: 'descricao', t: 'Descrição', r: p => html`<span class="ellipsis" style=${{ maxWidth: 280, display: 'inline-block' }}>${p.descricao}</span>` },
      { k: 'cat', t: 'Tipo', v: p => p.categoria, r: p => p.categoria === 'CAPEX' ? html`<${Badge} c="violet">CAPEX</${Badge}>` : (p.linhas || []).map(R.nomeLista).join(', ') },
      { k: 'valor', t: 'Valor', al: 'r', v: R.valorTotal, r: p => html`<span class="num">${U.brl(R.valorTotal(p))}</span>` },
      { k: 'status', t: 'Status', r: p => html`<${Status} s=${p.categoria === 'CAPEX' ? (p.statusCapex || 'Capex') : p.status}/>` },
    ];
    return html`<${Modal} size="xl" title=${c.nomeFantasia} sub=${[c.codigo, c.razaoSocial !== c.nomeFantasia ? c.razaoSocial : '', c.cnpj].filter(Boolean).join(' · ')} icon="building" onClose=${onClose}
      footer=${html`<${Btn} icon="edit" onClick=${() => CRM.abrir('clienteForm', { id })}>Editar cadastro</${Btn}><div class="spacer"></div>
        <${Btn} icon="calendar" onClick=${() => CRM.abrir('atividade', { inicial: { clienteId: id, categoria: 'Follow-up', titulo: 'Follow-up — ' + c.nomeFantasia } })}>Nova atividade</${Btn}>
        <${Btn} icon="compass" onClick=${() => CRM.abrir('prospeccaoForm', { inicial: { clienteId: id } })}>Nova visita</${Btn}>
        <${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('propostaForm', { inicial: { clienteId: id } })}>Nova proposta</${Btn}>`}>
      <div class="ficha-h mb"><div class="avatar">${U.iniciais(c.nomeFantasia)}</div><div style=${{ flex: 1 }}>
        <div class="row"><${Status} s=${c.status}/><span class="row small" style=${{ gap: 5 }}><span class="dot" style=${{ background: R.corSegmento(c.segmentoId) }}></span>${R.nomeLista(c.segmentoId)}</span>
          <span class="small muted">· ${[c.cidade, c.uf].filter(Boolean).join('/') || 'sem cidade'} · Responsável: ${R.nomeUsuario(c.vendedorId) || '—'}</span>
          ${c.pastaNuvem && html`<a class="small" href=${c.pastaNuvem} target="_blank" rel="noopener">Pasta na nuvem ↗</a>`}</div></div></div>
      <${Tabs} value=${aba} onChange=${setAba} options=${[{ v: 'resumo', l: 'Resumo' }, { v: 'sedes', l: 'Sedes e contatos', n: sedes.length + contatos.length }, { v: 'props', l: 'Propostas', n: props.length }, { v: 'opps', l: 'Oportunidades', n: opps.length }, { v: 'sto', l: 'STO', n: stos.length }, { v: 'visitas', l: 'Visitas', n: prosp.length }, { v: 'contratos', l: 'Contratos', n: cts.length }, { v: 'agenda', l: 'Atividades', n: ativs.length }, { v: 'hist', l: 'Histórico' }]}/>
      ${aba === 'resumo' && html`<div>
        <div class="grid g5"><${Kpi} label="Propostas" value=${U.int(r.nProp)} foot=${r.abertas + ' em andamento'}/><${Kpi} label="Total orçado" value=${U.brlK(r.orcado)} small/><${Kpi} label="Total aprovado (LTV)" value=${U.brlK(r.aprovado)} small accent/>
          <${Kpi} label="Conversão" value=${U.pct(conv)} foot=${r.nGanha + ' ganhas · ' + r.nPerdida + ' perdidas'}/><${Kpi} label="Ticket médio" value=${U.brlK(U.div(r.aprovado, r.nGanha))} small/></div>
        <div class="grid g2 mt">
          <${Card} title="Dados cadastrais"><dl class="kv">
            <dt>Razão social</dt><dd>${c.razaoSocial}</dd><dt>CNPJ</dt><dd>${c.cnpj || '—'}</dd><dt>Endereço</dt><dd>${[c.endereco, c.cidade, c.uf, c.pais].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Telefone / e-mail</dt><dd>${[c.telefone, c.email].filter(Boolean).join(' · ') || '—'}</dd><dt>Origem</dt><dd>${R.nomeLista(c.origemId) || '—'}</dd>
            <dt>Segmentos adicionais</dt><dd>${(c.segmentosSecundarios || []).map(R.nomeLista).join(', ') || '—'}</dd><dt>Crédito</dt><dd>${c.analiseCredito || '—'}${c.limiteCredito ? ' · limite ' + U.brl(c.limiteCredito) : ''}</dd>
            <dt>Cadastrado em</dt><dd>${U.data(c.dataCadastro)}</dd><dt>Observações</dt><dd style=${{ whiteSpace: 'pre-line' }}>${c.observacoes || '—'}</dd></dl></${Card}>
          <${Card} title="Pendências e próximos passos" sub=${pend.length + ' atividade(s) a fazer'}>
            ${pend.length ? pend.slice(0, 8).map(a => html`<div key=${a.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('atividade', { id: a.id })}><${Badge} c=${R.atrasada(a) ? 'red' : 'amber'}>${U.data(a.data)}</${Badge}><div style=${{ flex: 1, minWidth: 0 }}><div class="ellipsis">${a.titulo}</div><div class="small muted">${a.categoria} · ${R.nomeUsuario(a.responsavelId)}</div></div></div>`) : html`<div class="small muted">Nenhuma pendência.</div>`}
            <div class="section-title">Propostas em andamento</div>
            ${props.filter(p => R.resultado(p) === 'aberta').slice(0, 6).map(p => html`<div key=${p.id} class="list-item" style=${{ cursor: 'pointer' }} onClick=${() => CRM.abrir('propostaDetalhe', { id: p.id })}><span class="num small">${p.codigo}</span><span class="ellipsis" style=${{ flex: 1 }}>${p.descricao}</span><b class="num small">${U.brlK(R.valorTotal(p))}</b></div>`)}
            ${!props.some(p => R.resultado(p) === 'aberta') && html`<div class="small muted">Nenhuma proposta em andamento.</div>`}
          </${Card}></div></div>`}
      ${aba === 'sedes' && html`<div class="grid g2">
        <${Card} title="Sedes / unidades" pad=${false}><${Table} pageSize=${20} rows=${sedes} cols=${[{ k: 'nome', t: 'Sede' }, { k: 'tipo', t: 'Tipo' }, { k: 'cid', t: 'Cidade/UF', v: s => s.cidade, r: s => [s.cidade, s.uf].filter(Boolean).join('/') }, { k: 'reg', t: 'Região', r: s => U.regiao(s.uf) }, { k: 'at', t: '', r: s => s.ativo === false ? html`<${Badge}>Inativa</${Badge}>` : '' }]}/></${Card}>
        <${Card} title="Contatos" pad=${false}><${Table} pageSize=${20} rows=${contatos} cols=${[{ k: 'nome', t: 'Nome', r: t => html`<div><b style=${{ fontWeight: 600 }}>${t.nome}</b>${t.principal && html` <${Badge} c="orange">principal</${Badge}>`}<div class="small muted">${[t.cargo, t.papel].filter(Boolean).join(' · ')}</div></div>` }, { k: 'tel', t: 'Telefone', r: t => t.celular || t.telefone || '—' }, { k: 'email', t: 'E-mail', r: t => t.email ? html`<a href=${'mailto:' + t.email}>${t.email}</a>` : '—' }]}/></${Card}></div>`}
      ${aba === 'props' && html`<${Card} pad=${false}><${Table} rows=${props} cols=${colsProp} onRow=${p => CRM.abrir('propostaDetalhe', { id: p.id })} pageSize=${20}/></${Card}>`}
      ${aba === 'opps' && html`<${Card} pad=${false}><${Table} rows=${opps} pageSize=${20} onRow=${o => CRM.abrir('oportunidade', { id: o.id })} cols=${[{ k: 'titulo', t: 'Oportunidade' }, { k: 'etapa', t: 'Etapa', v: o => R.ordemEtapa(o.etapaId), r: o => R.nomeLista(o.etapaId) }, { k: 'sit', t: 'Situação', v: R.situacaoOp, r: o => html`<${Status} s=${R.situacaoOp(o)}/>` }, { k: 'valor', t: 'Valor', al: 'r', v: R.valorOp, r: o => U.brl(R.valorOp(o)) }, { k: 'criado', t: 'Criada em', v: o => o.criadoEm, r: o => U.data((o.criadoEm || '').slice(0, 10)) }]}/></${Card}>`}
      ${aba === 'sto' && html`<${Card} pad=${false}><${Table} rows=${stos} pageSize=${20} onRow=${s => CRM.abrir('stoForm', { id: s.id })} cols=${[{ k: 'numero', t: 'Nº STO' }, { k: 'atividade', t: 'Atividade' }, { k: 'dataAbertura', t: 'Abertura', r: s => U.data(s.dataAbertura) }, { k: 'situacao', t: 'Situação', r: s => html`<${Status} s=${s.situacao}/>` }]}/></${Card}>`}
      ${aba === 'visitas' && html`<${Card} pad=${false}><${Table} rows=${prosp} pageSize=${20} onRow=${p => CRM.abrir('prospeccaoForm', { id: p.id })} cols=${[{ k: 'dataPrevista', t: 'Data', r: p => U.data(p.dataPrevista || p.dataAtualizacao) }, { k: 'objetivo', t: 'Objetivo', r: p => p.objetivo || '—' }, { k: 'tipo', t: 'Tipo', r: p => R.nomeLista(p.tipoVisitaId) || '—' }, { k: 'status', t: 'Status', r: p => html`<${Status} s=${R.nomeLista(p.statusId)}/>` }, { k: 'resultado', t: 'Resultado', r: p => html`<span class="small">${p.resultado}</span>` }]}/></${Card}>`}
      ${aba === 'contratos' && html`<${Card} pad=${false}><${Table} rows=${cts} pageSize=${20} onRow=${ct => CRM.abrir('contrato', { id: ct.id })} cols=${[{ k: 'numero', t: 'Contrato' }, { k: 'descricao', t: 'Descrição' }, { k: 'vig', t: 'Vigência', r: ct => U.data(ct.vigenciaInicio) + ' a ' + U.data(ct.vigenciaFim) }, { k: 'teto', t: 'Teto', al: 'r', r: ct => U.brl(ct.teto) }, { k: 'sit', t: 'Situação', r: ct => html`<${Status} s=${R.situacaoContrato(ct)}/>` }]}/></${Card}>`}
      ${aba === 'agenda' && html`<${Card} pad=${false}><${Table} rows=${ativs} pageSize=${20} onRow=${a => CRM.abrir('atividade', { id: a.id })} cols=${[{ k: 'data', t: 'Data', r: a => U.data(a.data) }, { k: 'categoria', t: 'Categoria' }, { k: 'titulo', t: 'Atividade' }, { k: 'resp', t: 'Responsável', r: a => R.curtoUsuario(a.responsavelId) }, { k: 'status', t: 'Status', r: a => html`<${Status} s=${R.atrasada(a) ? 'Vencido' : a.status} label=${R.atrasada(a) ? 'Atrasada' : a.status}/>` }]}/></${Card}>`}
      ${aba === 'hist' && html`<${Card} title="Histórico de relacionamento" sub="Propostas, atividades, visitas e alterações cadastrais"><${UI.Timeline} itens=${hist.slice(0, 150)}/></${Card}>`}
    </${Modal}>`;
  }
  CRM.MODAIS.clienteFicha = ClienteFicha;

  /* ---------- Indicadores de clientes ---------- */
  function ClientesIndicadores() {
    DB.useDB();
    const anos = R.anosDisponiveis();
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: new Date().getFullYear(), seg: '', vend: '', ini: '', fim: '' }, 'cliind');
    const res = R.resumoClientes(); const c12 = U.addMeses(U.hoje(), -12);
    const cls = DB.all('clientes').filter(c => (!f.seg || c.segmentoId === f.seg) && (!f.vend || c.vendedorId === f.vend) && R.doUsuario(c));
    const noPer = d => (f.ini || f.fim) ? U.noPeriodo(d, f.ini, f.fim) : (f.ano === 'todos' || U.ano(d) === Number(f.ano));
    const novos = cls.filter(c => c.dataCadastro && noPer(c.dataCadastro));
    const comAnd = cls.filter(c => (res[c.id] || vazio).abertas > 0);
    const comCt = cls.filter(c => (res[c.id] || vazio).contratosVig > 0);
    const semMov = cls.filter(c => c.status !== 'Inativo' && (!(res[c.id] || vazio).ultima || (res[c.id]).ultima < c12));
    const porSeg = G.topN(cls, c => c.segmentoId, R.nomeLista, null, 12).map(x => ({ ...x, cor: R.corSegmento(x.id) }));
    const porReg = U.REGIOES.map(rg => ({ nome: rg, qtd: cls.filter(c => U.regiao(c.uf) === rg).length })).filter(x => x.qtd);
    const porUF = G.topN(cls.filter(c => c.uf), c => c.uf, k => k, null, 12);
    const porMes = G.porMes(novos, c => c.dataCadastro);
    // top clientes por aprovado no período
    const ganhos = DB.all('propostas').filter(p => !p.arquivada && R.resultado(p) === 'ganha' && noPer(p.dataPedido || p.dataEntrada) && cls.some(c => c.id === p.clienteId));
    const top = G.topN(ganhos, p => p.clienteId, R.nomeCliente, R.valorAprovado, 10);
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${Field} label="Ano"><${UI.Anos} value=${f.ano} onChange=${v => set('ano', v)} anos=${anos}/></${Field}>
        <${UI.FPeriodo} ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <${FSel} label="Responsável" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
      </${Filtros}>
      <div class="grid g4">
        <${Kpi} label="Clientes cadastrados" value=${U.int(cls.length)} foot=${cls.filter(c => c.status === 'Ativo').length + ' ativos · ' + cls.filter(c => c.status === 'Prospect').length + ' prospects · ' + cls.filter(c => c.status === 'Inativo').length + ' inativos'} accent/>
        <${Kpi} label="Novos clientes no período" value=${U.int(novos.length)} foot="pela data de cadastro"/>
        <${Kpi} label="Com propostas em andamento" value=${U.int(comAnd.length)} foot=${'Com contrato vigente: ' + comCt.length}/>
        <${Kpi} label="Sem movimentação há 12 meses" value=${U.int(semMov.length)} foot="sem proposta, visita ou atividade"/>
      </div>
      <div class="grid g3 mt">
        <${Card} title="Clientes por segmento"><${G.Rosca} data=${porSeg.map(x => ({ nome: x.nome, valor: x.qtd, cor: x.cor }))}/></${Card}>
        <${Card} title="Clientes por região"><${G.Barras} data=${porReg} series=${[{ k: 'qtd', l: 'Clientes' }]} h=${230} rotulo/></${Card}>
        <${Card} title="Clientes por estado (top 12)"><${G.Barras} data=${porUF} series=${[{ k: 'qtd', l: 'Clientes', cor: G.AZUL }]} h=${230} rotulo/></${Card}>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Novos clientes por mês" sub=${f.ano === 'todos' ? 'todos os anos' : String(f.ano)}><${G.Barras} data=${porMes} series=${[{ k: 'qtd', l: 'Novos clientes', cor: G.ORANGE }]} h=${230} rotulo/></${Card}>
        <${Card} title="Principais clientes — valor aprovado no período"><${G.Barras} horizontal data=${top} series=${[{ k: 'valor', l: 'Aprovado' }]} fmt="brl" h=${280} rotulo larguraEixo=${150} onClick=${d => CRM.abrir('clienteFicha', { id: d.id })}/></${Card}>
      </div>
      <${Card} className="mt" title="Clientes sem movimentação comercial (12 meses)" sub="Oportunidade para reativação" pad=${false}>
        <${Table} rows=${semMov} pageSize=${10} onRow=${c => CRM.abrir('clienteFicha', { id: c.id })} cols=${[{ k: 'nome', t: 'Cliente', v: c => c.nomeFantasia, r: c => c.nomeFantasia }, { k: 'seg', t: 'Segmento', r: c => R.nomeLista(c.segmentoId) }, { k: 'vend', t: 'Responsável', r: c => R.curtoUsuario(c.vendedorId) }, { k: 'ult', t: 'Última movimentação', v: c => (res[c.id] || vazio).ultima, r: c => U.data((res[c.id] || vazio).ultima) }, { k: 'apr', t: 'Total aprovado (histórico)', al: 'r', v: c => (res[c.id] || vazio).aprovado, r: c => U.brlK((res[c.id] || vazio).aprovado) }]} sortInicial=${{ k: 'apr', d: 'desc' }}/></${Card}>
    </div>`;
  }

  Object.assign(CRM.ROTAS, { 'clientes/lista': ClientesLista, 'clientes/indicadores': ClientesIndicadores });
})();
