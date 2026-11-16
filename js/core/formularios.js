/* =========================================================
   Formulários compartilhados entre módulos
   - Cadastro mestre de clientes (com sedes e contatos)
   - Atividade da agenda (follow-up, visita, pós-venda, tarefa)
   - Seletor de cliente com "Novo cliente"
   - Abertura de janelas entre módulos (CRM.abrir)
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Chips, Money, Combo, Badge, Icon } = UI;

  /* ---------- Abertura de janelas entre módulos ---------- */
  CRM.MODAIS = CRM.MODAIS || {};
  /** CRM.abrir('cliente', {id}) — abre a janela registrada por qualquer módulo. */
  CRM.abrir = (tipo, props = {}) => window.dispatchEvent(new CustomEvent('crm-abrir', { detail: { tipo, props } }));
  CRM.irPara = (rota) => { window.location.hash = '#/' + rota; };

  /* ---------- Seletor de cliente (cadastro mestre) ---------- */
  UI.ClienteSelect = ({ value, onChange, err, disabled, inativos }) => {
    DB.useDB();
    const opts = useMemo(() => R.optsClientes(inativos), [DB.version]);
    return html`<${Combo} value=${value} onChange=${onChange} options=${opts} err=${err} disabled=${disabled} placeholder="Pesquisar cliente por nome, código ou CNPJ…"
      acao=${{ l: 'Novo cliente (cadastro mestre)', onClick: (q) => CRM.abrir('clienteForm', { inicial: { nomeFantasia: q, razaoSocial: q }, onSalvo: c => onChange(c.id) }) }}/>`;
  };

  /* ---------- Cadastro mestre de clientes ---------- */
  const UFS = U.UFS.concat(['EX']);
  function ClienteForm({ id, inicial, onClose, onSalvo }) {
    DB.useDB();
    const orig = id ? DB.get('clientes', id) : null;
    const [f, setF] = useState(() => orig ? { ...orig } : { codigo: '', nomeFantasia: '', razaoSocial: '', cnpj: '', segmentoId: '', segmentosSecundarios: [], vendedorId: R.vendoComo() || '', origemId: '', status: 'Prospect', site: '', pastaNuvem: '', endereco: '', cidade: '', uf: '', pais: 'Brasil', cep: '', telefone: '', email: '', analiseCredito: '', limiteCredito: null, validadeCredito: '', observacoes: '', dataCadastro: U.hoje(), ...(inicial || {}) });
    const [sedes, setSedes] = useState(() => id ? (R.idx().sedesPorCliente[id] || []).map(s => ({ ...s })) : []);
    const [contatos, setContatos] = useState(() => id ? (R.idx().contatosPorCliente[id] || []).map(c => ({ ...c })) : []);
    const [err, setErr] = useState({}); const [aba, setAba] = useState('dados'); const [forcar, setForcar] = useState(false);
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const dups = useMemo(() => (f.nomeFantasia || f.cnpj || f.razaoSocial) ? R.duplicidadesCliente({ ...f, id: id || '__novo' }) : [], [f.nomeFantasia, f.razaoSocial, f.cnpj, f.codigo]);

    const salvar = () => {
      const e = {};
      if (!f.nomeFantasia.trim()) e.nomeFantasia = 'Obrigatório';
      if (!f.razaoSocial.trim()) e.razaoSocial = 'Obrigatório';
      if (!f.segmentoId) e.segmentoId = 'Obrigatório';
      if (f.cnpj && !U.cnpjValido(f.cnpj)) e.cnpj = 'CNPJ inválido';
      sedes.forEach((s, i) => { if (!s.nome || !s.nome.trim()) e['sede' + i] = 'Nome da sede obrigatório'; });
      contatos.forEach((c, i) => { if (!c.nome || !c.nome.trim()) e['ct' + i] = 'Nome do contato obrigatório'; });
      setErr(e);
      if (Object.keys(e).length) { UI.toast('Verifique os campos obrigatórios destacados.', 'err'); if (e.sede0 || Object.keys(e).some(k => k.startsWith('sede'))) setAba('sedes'); else if (Object.keys(e).some(k => k.startsWith('ct'))) setAba('contatos'); else setAba('dados'); return; }
      const bloqueio = dups.find(d => d.motivo === 'mesmo CNPJ' || d.motivo === 'mesmo código');
      if (bloqueio) { UI.toast(`Já existe o cliente "${bloqueio.c.nomeFantasia}" com ${bloqueio.motivo}. Cadastro duplicado não permitido.`, 'err'); return; }
      if (dups.length && !forcar) { setForcar(true); UI.toast('Possível duplicidade encontrada — revise o aviso e clique em salvar novamente para confirmar.', 'err'); return; }
      const rec = { ...f, codigo: (f.codigo || R.novoCodigoCliente(f.nomeFantasia)).toUpperCase(), cnpj: f.cnpj ? U.fmtCNPJ(f.cnpj) : '' };
      const c = DB.save('clientes', rec, { resumo: (id ? 'Cliente alterado: ' : 'Cliente incluído: ') + rec.nomeFantasia });
      let ss = sedes;
      if (!ss.filter(s => s.ativo !== false).length) ss = ss.concat({ nome: c.nomeFantasia + (c.cidade ? ' — ' + c.cidade : ''), tipo: R.idLista('tipoSede', 'Matriz') ? 'Matriz' : '', cidade: c.cidade, uf: c.uf, pais: c.pais, cnpj: c.cnpj, logradouro: c.endereco, cep: c.cep, segmentoId: c.segmentoId, vendedorId: c.vendedorId, ativo: true });
      const novasSedes = ss.map(s => DB.save('sedes', { ...s, clienteId: c.id }, { silencioso: true, semAuditoria: !!s.id }));
      contatos.forEach(ct => { const sede = ct.sedeId && ct.sedeId.startsWith('__nova') ? novasSedes[Number(ct.sedeId.slice(6))] : null; DB.save('contatos', { ...ct, clienteId: c.id, sedeId: sede ? sede.id : ct.sedeId }, { silencioso: true, semAuditoria: !!ct.id }); });
      DB.setCfg('_ultimaAlteracao', U.agora());
      UI.toast(id ? 'Cliente atualizado.' : 'Cliente cadastrado: ' + c.nomeFantasia, 'ok');
      onSalvo && onSalvo(c); onClose();
    };
    const vinculos = id ? ['propostasPorCliente', 'oppsPorCliente', 'stosPorCliente', 'prospPorCliente', 'contratosPorCliente', 'atividadesPorCliente'].reduce((a, k) => a + (R.idx()[k][id] || []).length, 0) : 0;
    const inativar = async () => {
      if (!await UI.confirmar(`Inativar o cliente "${f.nomeFantasia}"?\nO histórico é preservado e ele deixa de aparecer nas listas de seleção.`, { ok: 'Inativar' })) return;
      DB.save('clientes', { ...orig, status: 'Inativo' }, { resumo: 'Cliente inativado' }); UI.toast('Cliente inativado.', 'ok'); onClose();
    };
    const excluir = async () => {
      if (vinculos) { UI.toast(`Não é possível excluir: o cliente tem ${vinculos} registro(s) vinculado(s). Use "Inativar".`, 'err'); return; }
      if (!await UI.confirmar(`Excluir definitivamente o cliente "${f.nomeFantasia}"?`, { perigo: true, ok: 'Excluir' })) return;
      (R.idx().sedesPorCliente[id] || []).forEach(s => DB.remove('sedes', s.id, { silencioso: true }));
      (R.idx().contatosPorCliente[id] || []).forEach(s => DB.remove('contatos', s.id, { silencioso: true }));
      DB.remove('clientes', id, { resumo: 'Cliente excluído: ' + f.nomeFantasia }); UI.toast('Cliente excluído.', 'ok'); onClose();
    };
    const optsSede = sedes.map((s, i) => ({ v: s.id || '__nova' + i, l: s.nome || '(sem nome)' }));
    const segOpts = R.opts('segmento', f.segmentoId);

    return html`<${Modal} size="lg" icon="building" title=${id ? 'Cliente — ' + (orig.nomeFantasia || '') : 'Novo cliente'} sub="Cadastro mestre: usado em todos os módulos do CRM" onClose=${onClose}
      footer=${html`${id && orig.status !== 'Inativo' && html`<${Btn} icon="ban" onClick=${inativar}>Inativar</${Btn}>`}
        ${id && DB.cfg('admin', false) && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}
        <div class="spacer"></div><span class="small muted"><span class="req" style=${{ color: 'var(--orange)' }}>*</span> obrigatório</span>
        <${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${salvar}>Salvar</${Btn}>`}>
      ${dups.length > 0 && html`<div class="notice warn mb"><${Icon} n="alert" s=${16}/><div><b>Possível cadastro duplicado:</b> ${dups.slice(0, 4).map((d, i) => html`<span key=${i}>${i ? '; ' : ' '}<a href="#" onClick=${e => { e.preventDefault(); onClose(); CRM.abrir('clienteFicha', { id: d.c.id }); }}>${d.c.nomeFantasia}</a> (${d.motivo})</span>`)}</div></div>`}
      <${UI.Tabs} value=${aba} onChange=${setAba} options=${[{ v: 'dados', l: 'Dados cadastrais' }, { v: 'sedes', l: 'Sedes / unidades', n: sedes.filter(s => s.ativo !== false).length }, { v: 'contatos', l: 'Contatos', n: contatos.filter(c => c.ativo !== false).length }]}/>
      ${aba === 'dados' && html`<div>
        <div class="form-section"><h4>Identificação</h4><div class="form-grid">
          <${Field} c="3" label="Código interno" hint="Padrão: 2 letras + nº (ex.: AM_34)"><div class="row" style=${{ flexWrap: 'nowrap' }}><${Inp} value=${f.codigo} onChange=${v => set('codigo', v.toUpperCase())} placeholder="automático"/><${Btn} sm onClick=${() => f.nomeFantasia ? set('codigo', R.novoCodigoCliente(f.nomeFantasia)) : UI.toast('Informe o nome antes de gerar o código.', 'err')}>Gerar</${Btn}></div></${Field}>
          <${Field} c="5" label="Nome fantasia" req err=${err.nomeFantasia}><${Inp} value=${f.nomeFantasia} onChange=${v => set('nomeFantasia', v)} err=${err.nomeFantasia} autoFocus=${!id}/></${Field}>
          <${Field} c="4" label="CNPJ" err=${err.cnpj} hint=${f.cnpj && U.cnpjValido(f.cnpj) ? '✓ CNPJ válido' : ''}><${Inp} value=${f.cnpj} onChange=${v => set('cnpj', v)} placeholder="00.000.000/0000-00" err=${err.cnpj}/></${Field}>
          <${Field} c="8" label="Razão social" req err=${err.razaoSocial}><${Inp} value=${f.razaoSocial} onChange=${v => set('razaoSocial', v)} err=${err.razaoSocial}/></${Field}>
          <${Field} c="4" label="Status do cadastro"><${Sel} value=${f.status} onChange=${v => set('status', v)} options=${R.STATUS_CLIENTE} vazio=${false}/></${Field}>
        </div></div>
        <div class="form-section"><h4>Classificação comercial</h4><div class="form-grid">
          <${Field} c="4" label="Segmento" req err=${err.segmentoId}><${Sel} value=${f.segmentoId} onChange=${v => set('segmentoId', v)} options=${segOpts} err=${err.segmentoId}/></${Field}>
          <${Field} c="4" label="Responsável comercial"><${Sel} value=${f.vendedorId} onChange=${v => set('vendedorId', v)} options=${R.optsUsuarios(f.vendedorId)}/></${Field}>
          <${Field} c="4" label="Origem do lead"><${Sel} value=${f.origemId} onChange=${v => set('origemId', v)} options=${R.opts('origem', f.origemId)}/></${Field}>
          <${Field} c="12" label="Segmentos adicionais" hint="O cliente pode atuar em mais de um segmento"><${Chips} value=${f.segmentosSecundarios || []} onChange=${v => set('segmentosSecundarios', v)} options=${segOpts.filter(o => o.v !== f.segmentoId)}/></${Field}>
        </div></div>
        <div class="form-section"><h4>Endereço e contato</h4><div class="form-grid">
          <${Field} c="6" label="Endereço"><${Inp} value=${f.endereco} onChange=${v => set('endereco', v)}/></${Field}>
          <${Field} c="3" label="Cidade"><${Inp} value=${f.cidade} onChange=${v => set('cidade', v)}/></${Field}>
          <${Field} c="1" label="UF"><${Sel} value=${f.uf} onChange=${v => set('uf', v)} options=${UFS} placeholder="—"/></${Field}>
          <${Field} c="2" label="País"><${Inp} value=${f.pais} onChange=${v => set('pais', v)}/></${Field}>
          <${Field} c="3" label="CEP"><${Inp} value=${f.cep} onChange=${v => set('cep', v)}/></${Field}>
          <${Field} c="3" label="Telefone"><${Inp} value=${f.telefone} onChange=${v => set('telefone', v)}/></${Field}>
          <${Field} c="6" label="E-mail"><${Inp} type="email" value=${f.email} onChange=${v => set('email', v)}/></${Field}>
          <${Field} c="6" label="Site"><${Inp} value=${f.site} onChange=${v => set('site', v)}/></${Field}>
          <${Field} c="6" label="Pasta na nuvem (link)"><${Inp} value=${f.pastaNuvem} onChange=${v => set('pastaNuvem', v)} placeholder="URL da pasta (SharePoint/OneDrive)"/></${Field}>
        </div></div>
        <div class="form-section"><h4>Crédito e observações</h4><div class="form-grid">
          <${Field} c="4" label="Análise de crédito"><${Sel} value=${f.analiseCredito} onChange=${v => set('analiseCredito', v)} options=${['Não avaliado', 'Aprovado', 'Aprovado com ressalva', 'Reprovado']}/></${Field}>
          <${Field} c="4" label="Limite de crédito (R$)"><${Money} value=${f.limiteCredito} onChange=${v => set('limiteCredito', v)}/></${Field}>
          <${Field} c="4" label="Validade da análise"><${Inp} type="date" value=${f.validadeCredito} onChange=${v => set('validadeCredito', v)}/></${Field}>
          <${Field} c="12" label="Observações"><${Txt} value=${f.observacoes} onChange=${v => set('observacoes', v)}/></${Field}>
        </div></div></div>`}
      ${aba === 'sedes' && html`<div>
        <div class="notice mb small"><${Icon} n="pin" s=${15}/>Sedes são as plantas, terminais ou escritórios do cliente. Propostas, STO e visitas são vinculadas a uma sede (cidade/UF/região).</div>
        ${sedes.map((s, i) => html`<div key=${s.id || i} class="form-section" style=${{ opacity: s.ativo === false ? .55 : 1 }}><div class="form-grid">
          <${Field} c="4" label="Nome da sede" req err=${err['sede' + i]}><${Inp} value=${s.nome} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, nome: v } : x))}/></${Field}>
          <${Field} c="2" label="Tipo"><${Sel} value=${s.tipo} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, tipo: v } : x))} options=${R.lista('tipoSede').map(x => x.nome)}/></${Field}>
          <${Field} c="3" label="Cidade"><${Inp} value=${s.cidade} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, cidade: v } : x))}/></${Field}>
          <${Field} c="1" label="UF"><${Sel} value=${s.uf} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, uf: v } : x))} options=${UFS} placeholder="—"/></${Field}>
          <${Field} c="2" label="Região"><${Inp} value=${U.regiao(s.uf)} disabled=${true}/></${Field}>
          <${Field} c="3" label="CNPJ da sede"><${Inp} value=${s.cnpj} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, cnpj: v } : x))}/></${Field}>
          <${Field} c="5" label="Endereço"><${Inp} value=${s.logradouro} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, logradouro: v } : x))}/></${Field}>
          <${Field} c="2" label="Segmento"><${Sel} value=${s.segmentoId} onChange=${v => setSedes(a => a.map((x, j) => j === i ? { ...x, segmentoId: v } : x))} options=${segOpts}/></${Field}>
          <div class="field c2" style=${{ justifyContent: 'flex-end' }}>${s.ativo === false ? html`<${Btn} sm icon="restore" onClick=${() => setSedes(a => a.map((x, j) => j === i ? { ...x, ativo: true } : x))}>Reativar</${Btn}>` : html`<${Btn} sm v="danger" icon="ban" onClick=${() => s.id ? setSedes(a => a.map((x, j) => j === i ? { ...x, ativo: false } : x)) : setSedes(a => a.filter((x, j) => j !== i))}>${s.id ? 'Inativar' : 'Remover'}</${Btn}>`}</div>
        </div></div>`)}
        <${Btn} icon="plus" onClick=${() => setSedes(a => a.concat({ nome: f.nomeFantasia, tipo: 'Planta', cidade: '', uf: '', pais: 'Brasil', cnpj: '', logradouro: '', segmentoId: f.segmentoId, vendedorId: f.vendedorId, ativo: true }))}>Adicionar sede</${Btn}>
        ${!sedes.length && html`<div class="small muted mt">Se nenhuma sede for informada, será criada automaticamente uma sede principal com a cidade/UF do cadastro.</div>`}</div>`}
      ${aba === 'contatos' && html`<div>
        ${contatos.map((c, i) => html`<div key=${c.id || i} class="form-section" style=${{ opacity: c.ativo === false ? .55 : 1 }}><div class="form-grid">
          <${Field} c="4" label="Nome" req err=${err['ct' + i]}><${Inp} value=${c.nome} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, nome: v } : x))}/></${Field}>
          <${Field} c="3" label="Cargo"><${Inp} value=${c.cargo} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, cargo: v } : x))}/></${Field}>
          <${Field} c="2" label="Área"><${Sel} value=${c.area} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, area: v } : x))} options=${R.lista('areaContato').map(x => x.nome)}/></${Field}>
          <${Field} c="3" label="Papel na decisão"><${Sel} value=${c.papel} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, papel: v } : x))} options=${R.lista('papelContato').map(x => x.nome)}/></${Field}>
          <${Field} c="3" label="Sede"><${Sel} value=${c.sedeId} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, sedeId: v } : x))} options=${optsSede}/></${Field}>
          <${Field} c="3" label="Telefone / celular"><${Inp} value=${c.celular || c.telefone} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, celular: v } : x))}/></${Field}>
          <${Field} c="4" label="E-mail"><${Inp} value=${c.email} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, email: v } : x))}/></${Field}>
          <${Field} c="2" label="Aniversário"><${Inp} type="date" value=${c.aniversario} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, aniversario: v } : x))}/></${Field}>
          <${Field} c="8" label="Notas de relacionamento"><${Inp} value=${c.notas} onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, notas: v } : x))}/></${Field}>
          <div class="field c4" style=${{ justifyContent: 'flex-end' }}><div class="row"><${Check} checked=${c.principal} label="Principal" onChange=${v => setContatos(a => a.map((x, j) => j === i ? { ...x, principal: v } : x))}/>
            <div class="spacer"></div>${c.ativo === false ? html`<${Btn} sm icon="restore" onClick=${() => setContatos(a => a.map((x, j) => j === i ? { ...x, ativo: true } : x))}>Reativar</${Btn}>` : html`<${Btn} sm v="danger" icon="ban" onClick=${() => c.id ? setContatos(a => a.map((x, j) => j === i ? { ...x, ativo: false } : x)) : setContatos(a => a.filter((x, j) => j !== i))}>${c.id ? 'Inativar' : 'Remover'}</${Btn}>`}</div></div>
        </div></div>`)}
        <${Btn} icon="plus" onClick=${() => setContatos(a => a.concat({ nome: '', cargo: '', area: '', papel: '', sedeId: optsSede[0] ? optsSede[0].v : '', telefone: '', celular: '', email: '', aniversario: '', notas: '', principal: !a.length, ativo: true }))}>Adicionar contato</${Btn}></div>`}
    </${Modal}>`;
  }
  CRM.MODAIS.clienteForm = ClienteForm;

  /* ---------- Atividade (Agenda) ---------- */
  function AtividadeForm({ id, inicial, onClose, onSalvo }) {
    DB.useDB();
    const orig = id ? DB.get('atividades', id) : null;
    const [f, setF] = useState(() => orig ? { ...orig } : { categoria: 'Follow-up', tipoAtividadeId: '', titulo: '', descricao: '', clienteId: '', oportunidadeId: '', propostaId: '', prospeccaoId: '', contratoId: '', responsavelId: R.vendoComo() || '', data: U.hoje(), hora: '', prioridade: 'Média', status: 'A fazer', dataConclusao: '', resultado: '', observacoes: '', recorrencia: 'Nenhuma', lembrete: false, proximoContato: '', ...(inicial || {}) });
    const [err, setErr] = useState({});
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const propostasCli = f.clienteId ? (R.idx().propostasPorCliente[f.clienteId] || []).filter(p => !p.arquivada).sort((a, b) => U.cmp(b.dataEntrada, a.dataEntrada)).map(p => ({ v: p.id, l: p.codigo + ' — ' + p.descricao })) : [];
    const salvar = (concluir) => {
      const e = {};
      if (!f.titulo.trim()) e.titulo = 'Obrigatório';
      if (!f.data) e.data = 'Obrigatório'; else if (!U.dataValida(f.data)) e.data = 'Data inválida';
      if (!U.dataValida(f.dataConclusao)) e.dataConclusao = 'Data inválida';
      if (!U.dataValida(f.proximoContato)) e.proximoContato = 'Data inválida';
      if (!f.responsavelId) e.responsavelId = 'Obrigatório';
      if (['Follow-up', 'Visita', 'Pós-venda'].includes(f.categoria) && !f.clienteId && !f.prospeccaoId) e.clienteId = 'Obrigatório para ' + f.categoria;
      setErr(e); if (Object.keys(e).length) { UI.toast('Preencha os campos obrigatórios.', 'err'); return; }
      let rec = { ...f };
      if (concluir) { rec.status = 'Feito'; rec.dataConclusao = rec.dataConclusao || U.hoje(); }
      if (rec.status === 'Feito' && !rec.dataConclusao) rec.dataConclusao = U.hoje();
      const salvo = DB.save('atividades', rec, { resumo: f.categoria + ': ' + f.titulo });
      // recorrência: ao concluir, gera a próxima ocorrência
      const virouFeito = rec.status === 'Feito' && (!orig || orig.status !== 'Feito');
      if (virouFeito && rec.recorrencia && rec.recorrencia !== 'Nenhuma') {
        const passo = { 'Diária': [1, 0], 'Semanal': [7, 0], 'Quinzenal': [14, 0], 'Mensal': [0, 1], 'Trimestral': [0, 3] }[rec.recorrencia];
        const prox = passo[1] ? U.addMeses(rec.data, passo[1]) : U.addDias(rec.data, passo[0]);
        DB.save('atividades', { ...rec, id: undefined, criadoEm: undefined, data: prox, status: 'A fazer', dataConclusao: '', resultado: '' }, { resumo: 'Recorrência gerada' });
        UI.toast('Próxima ocorrência agendada para ' + U.data(prox) + '.');
      }
      // próximo contato: gera novo follow-up
      if (virouFeito && rec.proximoContato) {
        DB.save('atividades', { categoria: rec.categoria === 'Pós-venda' ? 'Follow-up' : rec.categoria === 'Visita' ? 'Follow-up' : rec.categoria, titulo: 'Próximo contato — ' + (R.nomeCliente(rec.clienteId) || rec.titulo), clienteId: rec.clienteId, propostaId: rec.propostaId, oportunidadeId: rec.oportunidadeId, prospeccaoId: rec.prospeccaoId, responsavelId: rec.responsavelId, data: rec.proximoContato, prioridade: rec.prioridade, status: 'A fazer', recorrencia: 'Nenhuma', descricao: '', resultado: '', observacoes: '' });
      }
      // sincroniza visita ↔ prospecção
      if (rec.prospeccaoId && rec.categoria === 'Visita') {
        const pr = DB.get('prospeccoes', rec.prospeccaoId);
        if (pr) DB.save('prospeccoes', { ...pr, dataPrevista: rec.data, dataRealizada: rec.status === 'Feito' ? rec.dataConclusao : pr.dataRealizada, statusId: rec.status === 'Feito' ? (R.idLista('statusProspeccao', 'Visitado') || pr.statusId) : pr.statusId, resultado: rec.status === 'Feito' && rec.resultado ? rec.resultado : pr.resultado, atividadeId: salvo.id }, { resumo: 'Atualizada pela agenda' });
      }
      if (rec.propostaId) { const p = DB.get('propostas', rec.propostaId); if (p) DB.save('propostas', { ...p, historico: (p.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: rec.categoria + (rec.status === 'Feito' ? ' realizado' : ' agendado'), detalhe: rec.titulo + (rec.resultado ? ' — ' + rec.resultado : '') }) }, { semAuditoria: true }); }
      UI.toast(concluir ? 'Atividade concluída.' : 'Atividade salva.', 'ok'); onSalvo && onSalvo(salvo); onClose();
    };
    const excluir = async () => { if (!await UI.confirmar('Excluir esta atividade?', { perigo: true, ok: 'Excluir' })) return; DB.remove('atividades', id, { resumo: 'Atividade excluída: ' + f.titulo }); UI.toast('Atividade excluída.', 'ok'); onClose(); };
    return html`<${Modal} icon="calendar" title=${id ? 'Atividade' : 'Nova atividade'} sub=${f.categoria} onClose=${onClose}
      footer=${html`${id && html`<${Btn} v="danger" icon="trash" onClick=${excluir}>Excluir</${Btn}>`}<div class="spacer"></div>
        <${Btn} onClick=${onClose}>Cancelar</${Btn}>${f.status === 'A fazer' && html`<${Btn} icon="check" onClick=${() => salvar(true)}>Salvar e concluir</${Btn}>`}<${Btn} v="primary" onClick=${() => salvar(false)}>Salvar</${Btn}>`}>
      <div class="form-section"><h4>Atividade</h4><div class="form-grid">
        <${Field} c="4" label="Categoria" req><${Sel} value=${f.categoria} onChange=${v => set('categoria', v)} options=${R.CATEGORIAS_ATIVIDADE} vazio=${false}/></${Field}>
        <${Field} c="4" label="Tipo de atividade"><${Sel} value=${f.tipoAtividadeId} onChange=${v => set('tipoAtividadeId', v)} options=${R.opts('tipoAtividade', f.tipoAtividadeId)}/></${Field}>
        <${Field} c="4" label="Prioridade"><${Sel} value=${f.prioridade} onChange=${v => set('prioridade', v)} options=${R.PRIORIDADES} vazio=${false}/></${Field}>
        <${Field} c="12" label="Título / descrição curta" req err=${err.titulo}><${Inp} value=${f.titulo} onChange=${v => set('titulo', v)} err=${err.titulo} placeholder="ex.: Retornar sobre revisão da proposta"/></${Field}>
        <${Field} c="3" label="Data" req err=${err.data}><${Inp} type="date" value=${f.data} onChange=${v => set('data', v)} err=${err.data}/></${Field}>
        <${Field} c="2" label="Hora"><${Inp} type="time" value=${f.hora} onChange=${v => set('hora', v)}/></${Field}>
        <${Field} c="4" label="Responsável" req err=${err.responsavelId}><${Sel} value=${f.responsavelId} onChange=${v => set('responsavelId', v)} options=${R.optsUsuarios(f.responsavelId)} err=${err.responsavelId}/></${Field}>
        <${Field} c="3" label="Recorrência"><${Sel} value=${f.recorrencia} onChange=${v => set('recorrencia', v)} options=${R.RECORRENCIAS} vazio=${false}/></${Field}>
        <${Field} c="12" label="Detalhes"><${Txt} value=${f.descricao} onChange=${v => set('descricao', v)} rows=${2}/></${Field}>
        <div class="field c12"><${Check} checked=${f.lembrete} onChange=${v => set('lembrete', v)} label="Lembrete: destacar no painel de pendências até a data"/></div>
      </div></div>
      <div class="form-section"><h4>Vínculos</h4><div class="form-grid">
        <${Field} c="6" label="Cliente" req=${['Follow-up', 'Visita', 'Pós-venda'].includes(f.categoria) && !f.prospeccaoId} err=${err.clienteId}><${UI.ClienteSelect} value=${f.clienteId} onChange=${v => setF(x => ({ ...x, clienteId: v, propostaId: '' }))} err=${err.clienteId}/></${Field}>
        <${Field} c="6" label="Proposta vinculada (opcional)"><${Sel} value=${f.propostaId} onChange=${v => { const p = DB.get('propostas', v); setF(x => ({ ...x, propostaId: v, oportunidadeId: p ? p.oportunidadeId : x.oportunidadeId })); }} options=${propostasCli} placeholder=${f.clienteId ? 'Nenhuma' : 'Selecione o cliente primeiro'}/></${Field}>
        ${f.prospeccaoId && html`<div class="field c12 small muted">Vinculada à prospecção/visita do cliente — ao concluir, a prospecção é atualizada.</div>`}
      </div></div>
      <div class="form-section"><h4>Resultado</h4><div class="form-grid">
        <${Field} c="4" label="Status"><${Sel} value=${f.status} onChange=${v => set('status', v)} options=${R.STATUS_ATIVIDADE} vazio=${false}/></${Field}>
        <${Field} c="4" label="Data de conclusão" err=${err.dataConclusao}><${Inp} type="date" value=${f.dataConclusao} onChange=${v => set('dataConclusao', v)}/></${Field}>
        <${Field} c="4" label="Próximo contato" hint="Gera um novo follow-up ao concluir" err=${err.proximoContato}><${Inp} type="date" value=${f.proximoContato} onChange=${v => set('proximoContato', v)}/></${Field}>
        <${Field} c="12" label="Resultado / observações"><${Txt} value=${f.resultado} onChange=${v => set('resultado', v)} rows=${2}/></${Field}>
      </div></div>
    </${Modal}>`;
  }
  CRM.MODAIS.atividade = AtividadeForm;

  /* ---------- Linha do tempo genérica ---------- */
  UI.Timeline = ({ itens }) => itens.length ? html`<div class="timeline">${itens.map((t, i) => html`<div key=${i} class="ti"><div class="small muted">${U.data((t.data || '').slice(0, 10))}${t.usuario ? ' · ' + t.usuario : ''}</div><div><b>${t.acao}</b>${t.detalhe ? html` — <span>${t.detalhe}</span>` : null}</div></div>`)}</div>` : html`<div class="small muted">Sem registros.</div>`;
})();
