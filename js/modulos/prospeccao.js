/* =========================================================
   PROSPECÇÃO — visitas e contatos de prospecção
   Integrada à Agenda: a visita planejada vira compromisso.
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI, G = CRM.G;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Chips, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Seg } = UI;

  const nomeEmpresa = p => p.clienteId ? R.nomeCliente(p.clienteId) : ((p.empresa || {}).nome || '(sem nome)');
  const ufDe = p => p.uf || (R.sede(p.sedeId) || {}).uf || ((R.cliente(p.clienteId) || {}).uf) || ((p.empresa || {}).uf) || '';
  const cidadeDe = p => p.cidade || (R.sede(p.sedeId) || {}).cidade || ((R.cliente(p.clienteId) || {}).cidade) || ((p.empresa || {}).cidade) || '';
  const realizada = p => !!p.dataRealizada || ['Visitado', 'Evoluiu'].includes(R.nomeLista(p.statusId));
  CRM.prospRealizada = realizada;

  /** Cria/atualiza o compromisso de visita na Agenda. */
  function sincronizarAgenda(p) {
    if (!p.dataPrevista) return p;
    const at = p.atividadeId ? DB.get('atividades', p.atividadeId) : null;
    const feito = realizada(p);
    const rec = { ...(at || { categoria: 'Visita', recorrencia: 'Nenhuma', prioridade: 'Média', lembrete: false, observacoes: '' }), categoria: 'Visita', tipoAtividadeId: at ? at.tipoAtividadeId : R.idLista('tipoAtividade', 'Visita comercial'),
      titulo: 'Visita — ' + nomeEmpresa(p), descricao: p.objetivo, clienteId: p.clienteId || '', prospeccaoId: p.id, oportunidadeId: p.oportunidadeId || '', responsavelId: (p.vendedorIds || [])[0] || '', data: p.dataPrevista,
      status: feito ? 'Feito' : (at && at.status === 'Cancelado' ? 'Cancelado' : 'A fazer'), dataConclusao: feito ? (p.dataRealizada || p.dataPrevista) : '', resultado: feito ? p.resultado : (at ? at.resultado : '') };
    const s = DB.save('atividades', rec, { resumo: 'Visita sincronizada com a prospecção', silencioso: true });
    return { ...p, atividadeId: s.id };
  }

  /* ---------- Formulário ---------- */
  function ProspeccaoForm({ id, inicial, onClose }) {
    DB.useDB();
    const orig = id ? DB.get('prospeccoes', id) : null;
    const [f, setF] = useState(() => orig ? JSON.parse(JSON.stringify(orig)) : { clienteId: '', sedeId: '', empresa: null, vendedorIds: R.vendoComo() ? [R.vendoComo()] : [], tipoVisitaId: '', objetivo: '', dataPrevista: '', dataRealizada: '', cidade: '', uf: '', segmentoId: '', statusId: R.idLista('statusProspeccao', 'A visitar'), resultado: '', potencial: '', proximaAcao: '', dataProximoContato: '', observacoes: '', oportunidadeId: '', atividadeId: '', ...(inicial || {}) });
    const [naoCliente, setNaoCliente] = useState(() => !!(orig && orig.empresa && !orig.clienteId));
    const [agendar, setAgendar] = useState(true);
    const [err, setErr] = useState({});
    const set = (k, v) => setF(x => ({ ...x, [k]: v })); const setE = (k, v) => setF(x => ({ ...x, empresa: { ...(x.empresa || {}), [k]: v } }));
    const salvar = (fechar = true) => {
      const e = {};
      if (naoCliente ? !(f.empresa && (f.empresa.nome || '').trim()) : !f.clienteId) e.cli = naoCliente ? 'Informe o nome da empresa' : 'Selecione o cliente';
      if (!(f.vendedorIds || []).length) e.vend = 'Informe o responsável';
      if (!(f.objetivo || '').trim()) e.objetivo = 'Descreva o objetivo';
      setErr(e); if (Object.keys(e).length) { UI.toast('Preencha os campos obrigatórios.', 'err'); return null; }
      let rec = { ...f, empresa: naoCliente ? f.empresa : null, clienteId: naoCliente ? '' : f.clienteId, dataAtualizacao: U.hoje() };
      if (rec.dataRealizada && ['A visitar', 'Contatado', ''].includes(R.nomeLista(rec.statusId))) rec.statusId = R.idLista('statusProspeccao', 'Visitado') || rec.statusId;
      let s = DB.save('prospeccoes', rec, { resumo: (orig ? 'Prospecção alterada: ' : 'Prospecção registrada: ') + nomeEmpresa(rec), silencioso: true });
      if (agendar && s.dataPrevista) { s = sincronizarAgenda(s); s = DB.save('prospeccoes', s, { semAuditoria: true, silencioso: true }); }
      if (s.proximaAcao && s.dataProximoContato && (!orig || orig.dataProximoContato !== s.dataProximoContato)) DB.save('atividades', { categoria: 'Follow-up', titulo: s.proximaAcao, clienteId: s.clienteId || '', prospeccaoId: s.id, responsavelId: (s.vendedorIds || [])[0] || '', data: s.dataProximoContato, prioridade: 'Média', status: 'A fazer', recorrencia: 'Nenhuma', descricao: 'Próximo contato da prospecção — ' + nomeEmpresa(s), resultado: '', observacoes: '' }, { silencioso: true });
      DB.setCfg('_ultimaAlteracao', U.agora());
      UI.toast('Prospecção salva' + (agendar && s.dataPrevista ? ' e agendada na Agenda.' : '.'), 'ok');
      if (fechar) onClose(); else setF(JSON.parse(JSON.stringify(s)));
      return s;
    };
    const converter = () => {
      const emp = f.empresa || {};
      CRM.abrir('clienteForm', { inicial: { nomeFantasia: emp.nome || '', razaoSocial: emp.nome || '', cidade: emp.cidade || '', uf: emp.uf || '', segmentoId: emp.segmentoId || '', email: emp.email || '', telefone: emp.telefone || '', vendedorId: (f.vendedorIds || [])[0] || '', origemId: R.idLista('origem', 'Visita técnica'), status: 'Prospect', observacoes: 'Cadastrado a partir da prospecção.' },
        onSalvo: c => {
          const s = DB.get('sedes', (R.idx().sedesPorCliente[c.id] || [{}])[0].id);
          if (emp.contato) DB.save('contatos', { clienteId: c.id, sedeId: s ? s.id : '', nome: emp.contato, email: emp.email || '', celular: emp.telefone || '', principal: true, ativo: true, cargo: '', area: '', papel: '', notas: '' });
          setNaoCliente(false); setF(x => ({ ...x, clienteId: c.id, sedeId: s ? s.id : '', empresa: null, convertidoEmCliente: U.hoje() }));
          if (id) DB.save('prospeccoes', { ...DB.get('prospeccoes', id), clienteId: c.id, sedeId: s ? s.id : '', empresa: null, convertidoEmCliente: U.hoje() }, { resumo: 'Empresa convertida em cliente oficial' });
          UI.toast('Empresa convertida em cliente oficial.', 'ok');
        } });
    };
    const gerarOp = () => {
      if (!f.clienteId) return UI.toast('Converta a empresa em cliente antes de gerar a oportunidade.', 'err');
      const s = salvar(false); if (!s) return;
      const c = R.cliente(s.clienteId);
      const op = DB.save('oportunidades', { titulo: s.objetivo, clienteId: s.clienteId, sedeId: s.sedeId, contatoId: '', vendedorId: (s.vendedorIds || [])[0] || (c && c.vendedorId) || '', segmentoId: (c && c.segmentoId) || s.segmentoId, origemId: R.idLista('origem', 'Visita técnica'), etapaId: R.etapas()[0].id, probabilidade: null, valorEstimado: null, natureza: 'Proposta efetiva', qualificacao: { escopo: false, demanda: false, decisor: false, pedido: false }, perdida: false, prospeccaoId: s.id, historicoEtapas: [{ etapaId: R.etapas()[0].id, data: U.hoje(), usuario: DB.usuarioAtual() }], observacoes: 'Gerada a partir da prospecção.' }, { resumo: 'Oportunidade gerada pela prospecção' });
      DB.save('prospeccoes', { ...s, oportunidadeId: op.id, statusId: R.idLista('statusProspeccao', 'Evoluiu') || s.statusId }, { resumo: 'Prospecção evoluiu para oportunidade' });
      onClose(); CRM.abrir('oportunidade', { id: op.id }); UI.toast('Oportunidade criada no Funil de Vendas.', 'ok');
    };
    const excluir = async () => {
      if (!await UI.confirmar('Excluir esta prospecção? O compromisso vinculado na Agenda também será removido.', { perigo: true, ok: 'Excluir' })) return;
      if (f.atividadeId && DB.get('atividades', f.atividadeId)) DB.remove('atividades', f.atividadeId, { silencioso: true });
      DB.remove('prospeccoes', id, { resumo: 'Prospecção excluída: ' + nomeEmpresa(f) }); UI.toast('Prospecção excluída.', 'ok'); onClose();
    };
    const sede = R.sede(f.sedeId); const cli = R.cliente(f.clienteId);
    return html`<${Modal} size="lg" icon="compass" title=${orig ? 'Prospecção — ' + nomeEmpresa(orig) : 'Nova prospecção / visita'} sub="Planejamento na Agenda · análise na Prospecção" onClose=${onClose}
      footer=${html`${orig && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}<div class="spacer"></div>
        ${naoCliente && html`<${Btn} icon="building" onClick=${converter}>Converter em cliente</${Btn}>`}
        ${f.oportunidadeId ? html`<${Btn} icon="columns" onClick=${() => CRM.abrir('oportunidade', { id: f.oportunidadeId })}>Ver oportunidade</${Btn}>` : html`<${Btn} icon="columns" onClick=${gerarOp}>Gerar oportunidade</${Btn}>`}
        <${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${() => salvar(true)}>Salvar</${Btn}>`}>
      <div class="form-section"><h4>Empresa</h4>
        <div class="mb"><${Seg} value=${naoCliente ? 'n' : 'c'} onChange=${v => setNaoCliente(v === 'n')} options=${[{ v: 'c', l: 'Cliente cadastrado' }, { v: 'n', l: 'Empresa ainda não cadastrada' }]}/></div>
        ${naoCliente ? html`<div class="form-grid">
          <${Field} c="6" label="Nome da empresa" req err=${err.cli}><${Inp} value=${(f.empresa || {}).nome} onChange=${v => setE('nome', v)} err=${err.cli}/></${Field}>
          <${Field} c="4" label="Cidade"><${Inp} value=${(f.empresa || {}).cidade} onChange=${v => setE('cidade', v)}/></${Field}>
          <${Field} c="2" label="UF"><${Sel} value=${(f.empresa || {}).uf} onChange=${v => setE('uf', v)} options=${U.UFS.concat('EX')} placeholder="—"/></${Field}>
          <${Field} c="4" label="Segmento"><${Sel} value=${(f.empresa || {}).segmentoId} onChange=${v => setE('segmentoId', v)} options=${R.opts('segmento')}/></${Field}>
          <${Field} c="4" label="Contato"><${Inp} value=${(f.empresa || {}).contato} onChange=${v => setE('contato', v)}/></${Field}>
          <${Field} c="4" label="E-mail / telefone"><${Inp} value=${(f.empresa || {}).email} onChange=${v => setE('email', v)}/></${Field}>
          <div class="field c12 small muted">A empresa fica registrada apenas na prospecção. Use "Converter em cliente" para criar o cadastro oficial (sem duplicar).</div></div>`
          : html`<div class="form-grid"><${Field} c="8" label="Cliente" req err=${err.cli}><${UI.ClienteSelect} value=${f.clienteId} onChange=${v => { const s = (R.idx().sedesPorCliente[v] || [])[0]; setF(x => ({ ...x, clienteId: v, sedeId: s ? s.id : '' })); }} err=${err.cli}/></${Field}>
            <${Field} c="4" label="Sede visitada"><${Sel} value=${f.sedeId} onChange=${v => set('sedeId', v)} options=${R.optsSedes(f.clienteId)}/></${Field}>
            <div class="field c12 small muted">${sede ? 'Local: ' + [sede.cidade, sede.uf].filter(Boolean).join('/') + ' · Região ' + (U.regiao(sede.uf) || '—') : cli ? 'Local do cadastro: ' + [cli.cidade, cli.uf].filter(Boolean).join('/') : ''}</div></div>`}
      </div>
      <div class="form-section"><h4>Visita</h4><div class="form-grid">
        <${Field} c="12" label="Responsável(is) pela visita" req err=${err.vend}><${Chips} value=${f.vendedorIds || []} onChange=${v => set('vendedorIds', v)} options=${R.optsUsuarios()}/></${Field}>
        <${Field} c="4" label="Tipo de visita / contato"><${Sel} value=${f.tipoVisitaId} onChange=${v => set('tipoVisitaId', v)} options=${R.opts('tipoVisita', f.tipoVisitaId)}/></${Field}>
        <${Field} c="4" label="Data prevista"><${Inp} type="date" value=${f.dataPrevista} onChange=${v => set('dataPrevista', v)}/></${Field}>
        <${Field} c="4" label="Data realizada"><${Inp} type="date" value=${f.dataRealizada} onChange=${v => set('dataRealizada', v)}/></${Field}>
        <${Field} c="12" label="Objetivo" req err=${err.objetivo}><${Inp} value=${f.objetivo} onChange=${v => set('objetivo', v)} err=${err.objetivo} placeholder="ex.: apresentar solução de movimentação; entender parada de manutenção"/></${Field}>
        <div class="field c12"><${Check} checked=${agendar} onChange=${setAgendar} label="Criar / atualizar o compromisso na Agenda (aba Visitas)"/></div>
      </div></div>
      <div class="form-section"><h4>Resultado</h4><div class="form-grid">
        <${Field} c="4" label="Status"><${Sel} value=${f.statusId} onChange=${v => set('statusId', v)} options=${R.opts('statusProspeccao', f.statusId)}/></${Field}>
        <${Field} c="4" label="Potencial identificado"><${Sel} value=${f.potencial} onChange=${v => set('potencial', v)} options=${R.POTENCIAIS}/></${Field}>
        <${Field} c="12" label="Resultado / observações da visita"><${Txt} value=${f.resultado} onChange=${v => set('resultado', v)} rows=${2}/></${Field}>
        <${Field} c="8" label="Próxima ação"><${Inp} value=${f.proximaAcao} onChange=${v => set('proximaAcao', v)}/></${Field}>
        <${Field} c="4" label="Data do próximo contato" hint="Gera follow-up na Agenda"><${Inp} type="date" value=${f.dataProximoContato} onChange=${v => set('dataProximoContato', v)}/></${Field}>
        <${Field} c="12" label="Observações"><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)} rows=${2}/></${Field}>
      </div></div>
    </${Modal}>`;
  }
  CRM.MODAIS.prospeccaoForm = ProspeccaoForm;

  const filtrar = f => {
    const t = U.normTxt(f.q || '');
    return DB.all('prospeccoes').filter(p => {
      const d = p.dataRealizada || p.dataPrevista || p.dataAtualizacao || (p.criadoEm || '').slice(0, 10);
      return (!t || U.normTxt([nomeEmpresa(p), p.objetivo, p.resultado, cidadeDe(p)].join(' ')).includes(t)) && (!f.vend || (p.vendedorIds || []).includes(f.vend)) && R.doUsuario(p, 'vendedorIds')
        && (!f.reg || U.regiao(ufDe(p)) === f.reg) && (!f.uf || ufDe(p) === f.uf) && (!f.status || p.statusId === f.status) && (!f.tipo || p.tipoVisitaId === f.tipo) && (!f.cli || p.clienteId === f.cli)
        && (!(f.ini || f.fim) || U.noPeriodo(d, f.ini, f.fim)) && (!f.ano || f.ano === 'todos' || U.ano(d) === Number(f.ano));
    });
  };

  /* ---------- Lista ---------- */
  function ProspeccaoLista() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', vend: '', reg: '', uf: '', status: '', tipo: '', cli: '', ini: '', fim: '', ano: 'todos' }, 'prosp');
    const rows = useMemo(() => filtrar(f), [DB.version, f]);
    const cols = [
      { k: 'data', t: 'Data', v: p => p.dataRealizada || p.dataPrevista, r: p => html`<div>${U.data(p.dataRealizada || p.dataPrevista)}<div class="small muted">${p.dataRealizada ? 'realizada' : p.dataPrevista ? 'prevista' : ''}</div></div>` },
      { k: 'emp', t: 'Empresa', v: nomeEmpresa, r: p => html`<div><b style=${{ fontWeight: 600 }}>${nomeEmpresa(p)}</b>${!p.clienteId && html` <${Badge} c="orange">não cadastrada</${Badge}>`}</div>` },
      { k: 'local', t: 'Cidade/UF', v: p => ufDe(p) + cidadeDe(p), r: p => html`<div>${[cidadeDe(p), ufDe(p)].filter(Boolean).join('/') || '—'}<div class="small muted">${U.regiao(ufDe(p))}</div></div>` },
      { k: 'resp', t: 'Responsável', v: p => (p.vendedorIds || []).map(R.nomeUsuario).join(', '), r: p => html`<span class="small">${(p.vendedorIds || []).map(R.curtoUsuario).join(', ')}</span>` },
      { k: 'tipo', t: 'Tipo', v: p => R.nomeLista(p.tipoVisitaId), r: p => html`<span class="small">${R.nomeLista(p.tipoVisitaId) || '—'}</span>` },
      { k: 'objetivo', t: 'Objetivo', r: p => html`<span class="ellipsis small" style=${{ maxWidth: 220, display: 'inline-block' }} title=${p.objetivo}>${p.objetivo || '—'}</span>` },
      { k: 'status', t: 'Status', v: p => R.nomeLista(p.statusId), r: p => html`<${Status} s=${R.nomeLista(p.statusId)}/>` },
      { k: 'pot', t: 'Potencial', v: p => p.potencial, r: p => p.potencial ? html`<${Status} s=${p.potencial}/>` : html`<span class="muted">—</span>` },
      { k: 'prox', t: 'Próximo contato', v: p => p.dataProximoContato, r: p => p.dataProximoContato ? html`<span class=${p.dataProximoContato < U.hoje() ? 'delta-down' : ''}>${U.data(p.dataProximoContato)}</span>` : html`<span class="muted">—</span>` },
      { k: 'op', t: 'Oportunidade', v: p => !!p.oportunidadeId, r: p => p.oportunidadeId ? html`<${Badge} c="green">gerada</${Badge}>` : '' },
    ];
    const exportar = () => U.exportarExcel('Prospeccao_' + U.hoje() + '.xlsx', [{ nome: 'Prospecção', linhas: rows, colunas: [{ t: 'Empresa', v: nomeEmpresa }, { t: 'Cadastrada', v: p => p.clienteId ? 'Sim' : 'Não' }, { t: 'Cidade', v: cidadeDe }, { t: 'UF', v: ufDe }, { t: 'Região', v: p => U.regiao(ufDe(p)) }, { t: 'Responsável', v: p => (p.vendedorIds || []).map(R.nomeUsuario).join(', ') }, { t: 'Tipo', v: p => R.nomeLista(p.tipoVisitaId) },
      { t: 'Objetivo', v: p => p.objetivo }, { t: 'Data prevista', v: p => p.dataPrevista }, { t: 'Data realizada', v: p => p.dataRealizada }, { t: 'Status', v: p => R.nomeLista(p.statusId) }, { t: 'Resultado', v: p => p.resultado }, { t: 'Potencial', v: p => p.potencial }, { t: 'Próxima ação', v: p => p.proximaAcao }, { t: 'Próximo contato', v: p => p.dataProximoContato }, { t: 'Oportunidade gerada', v: p => p.oportunidadeId ? 'Sim' : 'Não' }] }]);
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} icon="download" onClick=${exportar}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('prospeccaoForm', {})}>Nova prospecção</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Empresa, objetivo, resultado ou cidade"/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Região" value=${f.reg} onChange=${v => set('reg', v)} options=${U.REGIOES}/>
        <${FSel} label="UF" value=${f.uf} onChange=${v => set('uf', v)} options=${U.UFS}/>
        <${FSel} label="Status / resultado" value=${f.status} onChange=${v => set('status', v)} options=${R.opts('statusProspeccao')}/>
        <${FSel} label="Tipo de visita" value=${f.tipo} onChange=${v => set('tipo', v)} options=${R.opts('tipoVisita')}/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
        <${UI.FPeriodo} ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
      </${Filtros}>
      <${Card} pad=${false} title=${U.int(rows.length) + ' prospecção(ões)'} sub="Visitas planejadas aparecem também na Agenda › Visitas"><${Table} cols=${cols} rows=${rows} sortInicial=${{ k: 'data', d: 'desc' }} onRow=${p => CRM.abrir('prospeccaoForm', { id: p.id })}/></${Card}>
    </div>`;
  }

  /* ---------- Indicadores ---------- */
  function ProspeccaoIndicadores() {
    DB.useDB();
    const anos = R.anosDisponiveis();
    const { f, set, limpar, ativos } = UI.useFiltros({ ano: 'todos', vend: '', reg: '', tipo: '', ini: '', fim: '', cli: '', uf: '', status: '', q: '' }, 'prospind');
    const rows = useMemo(() => filtrar(f), [DB.version, f]);
    const plan = rows.filter(p => p.dataPrevista), real = rows.filter(realizada);
    const empresas = U.uniq(rows.map(p => p.clienteId || 'n:' + U.norm((p.empresa || {}).nome)));
    const novos = rows.filter(p => p.convertidoEmCliente).length;
    const comOp = rows.filter(p => p.oportunidadeId);
    const porVend = R.usuarios().map(u => { const l = rows.filter(p => (p.vendedorIds || []).includes(u.id)); return { nome: u.nome, planejadas: l.filter(p => p.dataPrevista).length, realizadas: l.filter(realizada).length, qtd: l.length }; }).filter(x => x.qtd);
    const anoN = f.ano === 'todos' ? null : Number(f.ano);
    const dataDe = p => p.dataRealizada || p.dataPrevista || p.dataAtualizacao;
    const porPer = anoN ? U.MESES.map((m, i) => { const l = rows.filter(p => U.mes(dataDe(p)) === i + 1); return { nome: m, qtd: l.length, realizadas: l.filter(realizada).length }; })
      : Object.entries(U.groupBy(rows.filter(dataDe), p => (dataDe(p) || '').slice(0, 7))).sort().slice(-18).map(([k, l]) => ({ nome: U.MESES[Number(k.slice(5, 7)) - 1] + '/' + k.slice(2, 4), qtd: l.length, realizadas: l.filter(realizada).length }));
    const porUF = G.topN(rows.filter(ufDe), ufDe, k => k, null, 15);
    const sts = R.lista('statusProspeccao');
    const porReg = U.REGIOES.map(rg => { const l = rows.filter(p => U.regiao(ufDe(p)) === rg); const o = { nome: rg, qtd: l.length }; sts.forEach(s => { o[s.id] = l.filter(p => p.statusId === s.id).length; }); return o; }).filter(x => x.qtd);
    const porTipo = G.topN(rows, p => p.tipoVisitaId, k => R.nomeLista(k) || '(não informado)', null, 10).map(x => ({ nome: x.nome, valor: x.qtd }));
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar}>
        <${Field} label="Ano"><${UI.Anos} value=${f.ano} onChange=${v => set('ano', v)} anos=${anos}/></${Field}>
        <${UI.FPeriodo} ini=${f.ini} fim=${f.fim} onIni=${v => set('ini', v)} onFim=${v => set('fim', v)}/>
        <${FSel} label="Vendedor" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
        <${FSel} label="Região" value=${f.reg} onChange=${v => set('reg', v)} options=${U.REGIOES}/>
        <${FSel} label="Tipo de visita" value=${f.tipo} onChange=${v => set('tipo', v)} options=${R.opts('tipoVisita')}/>
        <${Field} label="Cliente" className="wide"><${UI.ClienteSelect} value=${f.cli} onChange=${v => set('cli', v)} inativos=${true}/></${Field}>
      </${Filtros}>
      <div class="grid g5">
        <${Kpi} label="Total de visitas / contatos" value=${U.int(rows.length)} accent/>
        <${Kpi} label="Realizadas × planejadas" value=${real.length + ' / ' + plan.length} foot=${U.pct(U.div(real.length, plan.length)) + ' de realização'}/>
        <${Kpi} label="Empresas prospectadas" value=${U.int(empresas.length)} foot=${rows.filter(p => !p.clienteId).length + ' ainda não cadastradas'}/>
        <${Kpi} label="Novos clientes gerados" value=${U.int(novos)} foot="convertidos a partir da prospecção"/>
        <${Kpi} label="Conversão em oportunidades" value=${U.pct(U.div(comOp.length, rows.length))} foot=${comOp.length + ' oportunidade(s) gerada(s)'}/>
      </div>
      <div class="grid g2 mt">
        <${Card} title="Visitas por vendedor" sub="Planejadas × realizadas"><${G.Barras} horizontal data=${porVend} series=${[{ k: 'planejadas', l: 'Planejadas', cor: G.CINZA }, { k: 'realizadas', l: 'Realizadas', cor: G.NAVY }]} legenda h=${240} larguraEixo=${150}/></${Card}>
        <${Card} title="Visitas por período"><${G.Barras} data=${porPer} series=${[{ k: 'qtd', l: 'Registradas', cor: G.CINZA }, { k: 'realizadas', l: 'Realizadas', cor: G.ORANGE }]} legenda h=${240}/></${Card}>
        <${Card} title="Distribuição geográfica (UF)"><${G.Barras} data=${porUF} series=${[{ k: 'qtd', l: 'Prospecções', cor: G.AZUL }]} rotulo h=${240}/></${Card}>
        <${Card} title="Resultados por região" sub="Status das prospecções"><${G.Barras} data=${porReg} series=${sts.map((s, i) => ({ k: s.id, l: s.nome, cor: G.CORES[i] }))} empilhado legenda h=${240}/></${Card}>
        <${Card} title="Por tipo de visita / contato"><${G.Rosca} data=${porTipo}/></${Card}>
      </div>
    </div>`;
  }

  CRM.sincronizarVisita = sincronizarAgenda;
  Object.assign(CRM.ROTAS, { 'prospeccao/visitas': ProspeccaoLista, 'prospeccao/indicadores': ProspeccaoIndicadores });
})();
