/* =========================================================
   CADASTROS — base de dados compartilhada de todo o CRM
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo } = React;
  const { Field, Inp, Sel, Txt, Btn, Modal, Check, Chips, Money, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status } = UI;

  /* ---------- Contagem de uso (para impedir exclusão de itens em uso) ---------- */
  let usoV = -1, usoMap = {};
  const OPER = ['clientes', 'sedes', 'contatos', 'oportunidades', 'propostas', 'stos', 'prospeccoes', 'atividades', 'contratos', 'equipamentos', 'metas'];
  function usos() {
    if (usoV === DB.version) return usoMap; const m = {};
    const add = v => { if (typeof v === 'string' && v) m[v] = (m[v] || 0) + 1; };
    OPER.forEach(s => DB.all(s).forEach(r => Object.keys(r).forEach(k => { if (k === 'id') return; const v = r[k]; if (Array.isArray(v)) v.forEach(x => typeof x === 'string' ? add(x) : x && add(x.equipamentoId)); else if (k === 'valores' && v) Object.keys(v).forEach(add); else add(v); })));
    // listas referenciadas por nome (status de proposta)
    DB.all('propostas').forEach(p => { const st = DB.all('listas').find(l => l.tipo === 'statusProposta' && l.nome === p.status); if (st) add(st.id); const sc = DB.all('listas').find(l => l.tipo === 'statusCapex' && l.nome === p.statusCapex); if (sc) add(sc.id); const se = DB.all('listas').find(l => l.tipo === 'statusElaboracao' && l.nome === p.statusElaboracao); if (se) add(se.id); });
    usoMap = m; usoV = DB.version; return m;
  }

  /* ---------- Editor genérico de listas ---------- */
  const EXTRAS = {
    cor: { t: 'Cor', render: v => html`<span class="row"><span class="dot" style=${{ background: v || '#ccc', width: 12, height: 12 }}></span><span class="small muted">${v}</span></span>`, input: (v, set) => html`<input type="color" value=${v || '#8A9AA6'} onChange=${e => set(e.target.value)} style=${{ width: 60, height: 34, border: '1px solid var(--line)', borderRadius: 6 }}/>` },
    margemMeta: { t: 'Margem meta (%)', render: v => v !== undefined && v !== null && v !== '' ? v + '%' : '—', input: (v, set) => html`<${Inp} type="number" value=${v} onChange=${set}/>` },
    prob: { t: 'Probabilidade (%)', render: v => v !== undefined && v !== null ? v + '%' : '—', input: (v, set) => html`<${Inp} type="number" min="0" max="100" value=${v} onChange=${set}/>` },
    resultado: { t: 'Resultado', render: v => html`<${Status} s=${v || 'aberta'}/>`, input: (v, set) => html`<${Sel} value=${v || 'aberta'} onChange=${set} vazio=${false} options=${[{ v: 'aberta', l: 'Em andamento' }, { v: 'ganha', l: 'Aprovada (ganha)' }, { v: 'perdida', l: 'Perdida' }]}/>` },
    min: { t: 'De (R$)', render: v => v !== null && v !== undefined ? U.brlK(v) : '—', input: (v, set) => html`<${Money} value=${v} onChange=${set}/>` },
    max: { t: 'Até (R$)', render: v => v !== null && v !== undefined && v !== '' ? U.brlK(v) : 'sem limite', input: (v, set) => html`<${Money} value=${v} onChange=${set}/>` },
  };

  function ListaEditor({ tipo, titulo, sub }) {
    DB.useDB();
    const def = R.TIPOS_LISTA[tipo]; const extras = def.extra || [];
    const [ed, setEd] = useState(null); const [mostrarInativos, setMI] = useState(false);
    const itens = R.lista(tipo, true).filter(x => mostrarInativos || x.ativo !== false);
    const u = usos();
    const mover = (it, d) => {
      const arr = R.lista(tipo, true); const i = arr.findIndex(x => x.id === it.id); const j = i + d; if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]]; DB.saveMany('listas', arr.map((x, k) => ({ ...x, ordem: k + 1 })), { semAuditoria: true });
    };
    const salvar = () => {
      const nome = (ed.nome || '').trim(); if (!nome) return UI.toast('Informe o nome.', 'err');
      if (R.lista(tipo, true).some(x => x.id !== ed.id && U.norm(x.nome) === U.norm(nome))) return UI.toast('Já existe um item com esse nome.', 'err');
      const antigo = ed.id ? DB.get('listas', ed.id) : null;
      DB.save('listas', { ...ed, nome, tipo, ordem: ed.ordem || R.lista(tipo, true).length + 1, ativo: ed.ativo !== false }, { resumo: def.nome + ': ' + nome });
      // listas guardadas por nome (status) — renomeia nos registros para preservar o vínculo
      if (antigo && antigo.nome !== nome) {
        const campo = { statusProposta: 'status', statusCapex: 'statusCapex', statusElaboracao: 'statusElaboracao' }[tipo];
        if (campo) DB.saveMany('propostas', DB.all('propostas').filter(p => p[campo] === antigo.nome).map(p => ({ ...p, [campo]: nome })), { semAuditoria: true });
      }
      UI.toast('Cadastro salvo.', 'ok'); setEd(null);
    };
    const excluir = async it => {
      if (u[it.id]) return UI.toast(`"${it.nome}" está em uso em ${u[it.id]} registro(s). Use "Inativar".`, 'err');
      if (!await UI.confirmar(`Excluir "${it.nome}"?`, { perigo: true, ok: 'Excluir' })) return;
      DB.remove('listas', it.id, { resumo: def.nome + ' excluído: ' + it.nome }); UI.toast('Item excluído.', 'ok');
    };
    const cols = [
      { k: 'ordem', t: 'Ordem', w: 70, r: it => html`<span class="row" style=${{ gap: 2, flexWrap: 'nowrap' }}><${Btn} sm v="ghost" title="Subir" onClick=${() => mover(it, -1)}>▲</${Btn}><${Btn} sm v="ghost" title="Descer" onClick=${() => mover(it, 1)}>▼</${Btn}></span>`, nosort: true },
      { k: 'nome', t: 'Nome', r: it => html`<b style=${{ fontWeight: 600 }}>${it.nome}</b>` },
      ...extras.map(e => ({ k: e, t: EXTRAS[e].t, r: it => EXTRAS[e].render(it[e]) })),
      { k: 'uso', t: 'Em uso', al: 'r', v: it => u[it.id] || 0, r: it => html`<span class="num muted">${U.int(u[it.id] || 0)}</span>` },
      { k: 'ativo', t: 'Situação', r: it => it.ativo === false ? html`<${Badge}>Inativo</${Badge}>` : html`<${Badge} c="green">Ativo</${Badge}>` },
      { k: 'acoes', t: '', nosort: true, r: it => html`<${Btn} sm v="ghost" icon="edit" title="Editar" onClick=${() => setEd({ ...it })}/>
        <${Btn} sm v="ghost" icon=${it.ativo === false ? 'restore' : 'ban'} title=${it.ativo === false ? 'Reativar' : 'Inativar'} onClick=${() => DB.save('listas', { ...it, ativo: it.ativo === false }, { resumo: (it.ativo === false ? 'Reativado: ' : 'Inativado: ') + it.nome })}/>
        <${Btn} sm v="ghost" icon="trash" title="Excluir" onClick=${() => excluir(it)}/>` },
    ];
    return html`<${Card} title=${titulo || def.nome} sub=${sub} pad=${false} className="mb"
      right=${html`<${UI.Check} checked=${mostrarInativos} onChange=${setMI} label="Mostrar inativos"/><${Btn} sm v="primary" icon="plus" onClick=${() => setEd({ nome: '', ativo: true })}>Novo</${Btn}>`}>
      <${Table} cols=${cols} rows=${itens} pageSize=${100} compact/>
      ${ed && html`<${Modal} size="sm" title=${(ed.id ? 'Editar — ' : 'Novo — ') + def.nome} onClose=${() => setEd(null)} footer=${html`<div class="spacer"></div><${Btn} onClick=${() => setEd(null)}>Cancelar</${Btn}><${Btn} v="primary" onClick=${salvar}>Salvar</${Btn}>`}>
        <div class="form-grid"><${Field} c="12" label="Nome" req><${Inp} value=${ed.nome} onChange=${v => setEd(x => ({ ...x, nome: v }))} autoFocus=${true}/></${Field}>
        ${extras.map(e => html`<${Field} key=${e} c="6" label=${EXTRAS[e].t}>${EXTRAS[e].input(ed[e], v => setEd(x => ({ ...x, [e]: v })))}</${Field}>`)}</div>
        ${ed.id && u[ed.id] ? html`<div class="small muted mt">Usado em ${u[ed.id]} registro(s). A alteração do nome reflete em todo o sistema.</div>` : null}
      </${Modal}>`}
    </${Card}>`;
  }
  CRM.ListaEditor = ListaEditor;

  /* ---------- Cadastro de clientes (mestre) ---------- */
  function CadClientes() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', status: '', seg: '', uf: '', vend: '' }, 'cadcli');
    const [merge, setMerge] = useState(false);
    const idx = R.idx();
    const rows = useMemo(() => {
      const t = U.normTxt(f.q); const dg = U.soDigitos(f.q);
      return DB.all('clientes').filter(c => (!t || U.normTxt([c.nomeFantasia, c.razaoSocial, c.codigo].join(' ')).includes(t) || (dg.length >= 3 && U.soDigitos(c.cnpj).includes(dg)))
        && (!f.status || c.status === f.status) && (!f.seg || c.segmentoId === f.seg) && (!f.uf || c.uf === f.uf || (idx.sedesPorCliente[c.id] || []).some(s => s.uf === f.uf)) && (!f.vend || c.vendedorId === f.vend) && R.doUsuario(c));
    }, [DB.version, f]);
    const exportar = () => U.exportarExcel('Cadastro_Clientes_' + U.hoje() + '.xlsx', [{ nome: 'Clientes', linhas: rows, colunas: [
      { t: 'Código', v: c => c.codigo }, { t: 'Nome fantasia', v: c => c.nomeFantasia }, { t: 'Razão social', v: c => c.razaoSocial }, { t: 'CNPJ', v: c => c.cnpj }, { t: 'Segmento', v: c => R.nomeLista(c.segmentoId) },
      { t: 'Endereço', v: c => c.endereco }, { t: 'Cidade', v: c => c.cidade }, { t: 'UF', v: c => c.uf }, { t: 'País', v: c => c.pais }, { t: 'Telefone', v: c => c.telefone }, { t: 'E-mail', v: c => c.email },
      { t: 'Responsável comercial', v: c => R.nomeUsuario(c.vendedorId) }, { t: 'Origem', v: c => R.nomeLista(c.origemId) }, { t: 'Status', v: c => c.status }, { t: 'Sedes', v: c => (idx.sedesPorCliente[c.id] || []).length }, { t: 'Contatos', v: c => (idx.contatosPorCliente[c.id] || []).length }, { t: 'Observações', v: c => c.observacoes }] },
      { nome: 'Sedes', linhas: DB.all('sedes'), colunas: [{ t: 'Cliente', v: s => R.nomeCliente(s.clienteId) }, { t: 'Sede', v: s => s.nome }, { t: 'Tipo', v: s => s.tipo }, { t: 'CNPJ', v: s => s.cnpj }, { t: 'Cidade', v: s => s.cidade }, { t: 'UF', v: s => s.uf }, { t: 'Região', v: s => U.regiao(s.uf) }, { t: 'Ativa', v: s => s.ativo === false ? 'Não' : 'Sim' }] },
      { nome: 'Contatos', linhas: DB.all('contatos'), colunas: [{ t: 'Cliente', v: c => R.nomeCliente(c.clienteId) }, { t: 'Nome', v: c => c.nome }, { t: 'Cargo', v: c => c.cargo }, { t: 'Área', v: c => c.area }, { t: 'Papel', v: c => c.papel }, { t: 'Celular', v: c => c.celular || c.telefone }, { t: 'E-mail', v: c => c.email }, { t: 'Ativo', v: c => c.ativo === false ? 'Não' : 'Sim' }] }]);
    const cols = [
      { k: 'codigo', t: 'Código', r: c => html`<span class="num small">${c.codigo}</span>` },
      { k: 'nomeFantasia', t: 'Nome fantasia', r: c => html`<div><b style=${{ fontWeight: 600 }}>${c.nomeFantasia}</b>${c.razaoSocial !== c.nomeFantasia && html`<div class="small muted ellipsis" style=${{ maxWidth: 300 }}>${c.razaoSocial}</div>`}</div>` },
      { k: 'cnpj', t: 'CNPJ', r: c => c.cnpj || html`<span class="muted">—</span>` },
      { k: 'seg', t: 'Segmento', v: c => R.nomeLista(c.segmentoId), r: c => R.nomeLista(c.segmentoId) },
      { k: 'local', t: 'Cidade/UF', v: c => c.cidade, r: c => [c.cidade, c.uf].filter(Boolean).join('/') || '—' },
      { k: 'vend', t: 'Responsável', v: c => R.nomeUsuario(c.vendedorId), r: c => R.curtoUsuario(c.vendedorId) || html`<span class="muted">—</span>` },
      { k: 'sedes', t: 'Sedes', al: 'r', v: c => (idx.sedesPorCliente[c.id] || []).length, r: c => (idx.sedesPorCliente[c.id] || []).length },
      { k: 'cts', t: 'Contatos', al: 'r', v: c => (idx.contatosPorCliente[c.id] || []).length, r: c => (idx.contatosPorCliente[c.id] || []).length },
      { k: 'status', t: 'Status', r: c => html`<${Status} s=${c.status}/>` },
      { k: 'acoes', t: '', nosort: true, r: c => html`<${Btn} sm v="ghost" icon="eye" title="Consultar" onClick=${() => CRM.abrir('clienteFicha', { id: c.id })}/><${Btn} sm v="ghost" icon="edit" title="Editar" onClick=${() => CRM.abrir('clienteForm', { id: c.id })}/>
        ${c.status === 'Inativo' ? html`<${Btn} sm v="ghost" icon="restore" title="Reativar" onClick=${() => { DB.save('clientes', { ...c, status: 'Ativo' }, { resumo: 'Cliente reativado' }); UI.toast('Cliente reativado.', 'ok'); }}/>` : html`<${Btn} sm v="ghost" icon="ban" title="Inativar" onClick=${async () => { if (await UI.confirmar(`Inativar "${c.nomeFantasia}"? O histórico é preservado.`, { ok: 'Inativar' })) { DB.save('clientes', { ...c, status: 'Inativo' }, { resumo: 'Cliente inativado' }); UI.toast('Cliente inativado.', 'ok'); } }}/>`}` },
    ];
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} icon="merge" onClick=${() => setMerge(true)}>Mesclar duplicados</${Btn}><${Btn} icon="download" onClick=${exportar}>Excel</${Btn}><${Btn} v="primary" icon="plus" onClick=${() => CRM.abrir('clienteForm', {})}>Novo cliente</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Nome, razão social, código ou CNPJ"/>
        <${FSel} label="Status" value=${f.status} onChange=${v => set('status', v)} options=${R.STATUS_CLIENTE}/>
        <${FSel} label="Segmento" value=${f.seg} onChange=${v => set('seg', v)} options=${R.opts('segmento')}/>
        <${FSel} label="UF" value=${f.uf} onChange=${v => set('uf', v)} options=${U.UFS}/>
        <${FSel} label="Responsável" value=${f.vend} onChange=${v => set('vend', v)} options=${R.optsUsuarios()}/>
      </${Filtros}>
      <${Card} pad=${false} title=${U.int(rows.length) + ' cliente(s)'} sub="Cadastro único — disponível em todos os módulos por seleção"><${Table} cols=${cols} rows=${rows} sortInicial=${{ k: 'nomeFantasia', d: 'asc' }} onRow=${c => CRM.abrir('clienteFicha', { id: c.id })}/></${Card}>
      ${merge && html`<${Mesclar} onClose=${() => setMerge(false)}/>`}
    </div>`;
  }

  function Mesclar({ onClose }) {
    DB.useDB();
    const [dest, setDest] = useState(''); const [orig, setOrig] = useState('');
    const sugest = useMemo(() => { const g = U.groupBy(DB.all('clientes'), c => U.norm(c.nomeFantasia).slice(0, 8)); return Object.values(g).filter(a => a.length > 1).slice(0, 12); }, [DB.version]);
    const idx = R.idx();
    const conta = id => ['propostasPorCliente', 'oppsPorCliente', 'stosPorCliente', 'prospPorCliente', 'atividadesPorCliente', 'contratosPorCliente'].reduce((a, k) => a + (idx[k][id] || []).length, 0);
    const executar = async () => {
      if (!dest || !orig) return UI.toast('Escolha os dois clientes.', 'err'); if (dest === orig) return UI.toast('Escolha clientes diferentes.', 'err');
      const d = DB.get('clientes', dest), o = DB.get('clientes', orig);
      if (!await UI.confirmar(`Mesclar "${o.nomeFantasia}" em "${d.nomeFantasia}"?\n\nTodas as sedes, contatos, propostas, oportunidades, STO, visitas, atividades e contratos serão transferidos. O cadastro "${o.nomeFantasia}" será removido.`, { perigo: true, ok: 'Mesclar' })) return;
      ['sedes', 'contatos', 'propostas', 'oportunidades', 'stos', 'prospeccoes', 'atividades', 'contratos'].forEach(s => DB.saveMany(s, DB.all(s).filter(r => r.clienteId === orig).map(r => ({ ...r, clienteId: dest })), { semAuditoria: true }));
      DB.save('clientes', { ...d, observacoes: [d.observacoes, `Mesclado com "${o.nomeFantasia}" (${o.codigo}) em ${U.data(U.hoje())}.`].filter(Boolean).join('\n') }, { resumo: 'Mesclagem: recebeu ' + o.nomeFantasia });
      DB.remove('clientes', orig, { resumo: 'Mesclado em ' + d.nomeFantasia }); UI.toast('Clientes mesclados.', 'ok'); onClose();
    };
    return html`<${Modal} icon="merge" title="Mesclar clientes duplicados" onClose=${onClose} footer=${html`<div class="spacer"></div><${Btn} onClick=${onClose}>Cancelar</${Btn}><${Btn} v="primary" onClick=${executar}>Confirmar mesclagem</${Btn}>`}>
      <div class="form-grid">
        <${Field} c="6" label="Cliente destino (permanece)"><${UI.ClienteSelect} value=${dest} onChange=${setDest} inativos=${true}/></${Field}>
        <${Field} c="6" label="Cliente de origem (será absorvido)"><${UI.ClienteSelect} value=${orig} onChange=${setOrig} inativos=${true}/></${Field}>
      </div>
      ${dest && orig && dest !== orig && html`<div class="notice mt">Resultado: <b>${R.nomeCliente(dest)}</b> ficará com ${(idx.sedesPorCliente[dest] || []).length + (idx.sedesPorCliente[orig] || []).length} sede(s) e receberá ${conta(orig)} registro(s) comerciais de ${R.nomeCliente(orig)}.</div>`}
      ${sugest.length > 0 && html`<div class="mt"><div class="section-title">Possíveis duplicidades (nomes semelhantes)</div>${sugest.map((g, i) => html`<div key=${i} class="small" style=${{ padding: '3px 0' }}>${g.map((c, j) => html`<span key=${c.id}>${j ? ' · ' : ''}<a href="#" onClick=${e => { e.preventDefault(); j === 0 ? setDest(c.id) : setOrig(c.id); }}>${c.nomeFantasia} (${c.codigo})</a></span>`)}</div>`)}</div>`}
    </${Modal}>`;
  }

  /* ---------- Vendedores e usuários ---------- */
  function CadUsuarios() {
    DB.useDB();
    const [ed, setEd] = useState(null);
    const idx = R.idx();
    const cont = id => DB.all('propostas').filter(p => p.vendedorId === id).length;
    const salvar = () => {
      if (!(ed.nome || '').trim()) return UI.toast('Informe o nome.', 'err');
      if (DB.all('usuarios').some(u => u.id !== ed.id && U.norm(u.nome) === U.norm(ed.nome))) return UI.toast('Já existe um usuário com esse nome.', 'err');
      DB.save('usuarios', { ...ed, nome: ed.nome.trim(), ativo: ed.ativo !== false }, { resumo: 'Usuário: ' + ed.nome }); UI.toast('Usuário salvo.', 'ok'); setEd(null);
    };
    const cols = [
      { k: 'nome', t: 'Nome', r: u => html`<span class="row"><span class="avatar" style=${{ width: 28, height: 28, fontSize: 11, borderRadius: 7 }}>${U.iniciais(u.nome)}</span><b style=${{ fontWeight: 600 }}>${u.nome}</b></span>` },
      { k: 'papel', t: 'Papel' }, { k: 'email', t: 'E-mail', r: u => u.email || html`<span class="muted">—</span>` },
      { k: 'cli', t: 'Clientes', al: 'r', v: u => DB.all('clientes').filter(c => c.vendedorId === u.id).length, r: u => DB.all('clientes').filter(c => c.vendedorId === u.id).length },
      { k: 'prop', t: 'Propostas', al: 'r', v: u => cont(u.id), r: u => U.int(cont(u.id)) },
      { k: 'ativo', t: 'Situação', r: u => u.ativo === false ? html`<${Badge}>Inativo</${Badge}>` : html`<${Badge} c="green">Ativo</${Badge}>` },
      { k: 'acoes', t: '', nosort: true, r: u => html`<${Btn} sm v="ghost" icon="edit" onClick=${() => setEd({ ...u })}/><${Btn} sm v="ghost" icon=${u.ativo === false ? 'restore' : 'ban'} title=${u.ativo === false ? 'Reativar' : 'Inativar'} onClick=${() => DB.save('usuarios', { ...u, ativo: u.ativo === false })}/>` },
    ];
    return html`<${Card} title="Vendedores e responsáveis comerciais" sub="Selecionáveis em clientes, propostas, STO, prospecção, agenda e contratos" pad=${false} right=${html`<${Btn} sm v="primary" icon="plus" onClick=${() => setEd({ nome: '', papel: 'Comercial', email: '', ativo: true })}>Novo usuário</${Btn}>`}>
      <${Table} cols=${cols} rows=${R.usuarios(true)}/>
      ${ed && html`<${Modal} size="sm" title=${ed.id ? 'Editar usuário' : 'Novo usuário'} onClose=${() => setEd(null)} footer=${html`<div class="spacer"></div><${Btn} onClick=${() => setEd(null)}>Cancelar</${Btn}><${Btn} v="primary" onClick=${salvar}>Salvar</${Btn}>`}>
        <div class="form-grid"><${Field} c="12" label="Nome completo" req><${Inp} value=${ed.nome} onChange=${v => setEd(x => ({ ...x, nome: v }))} autoFocus=${true}/></${Field}>
        <${Field} c="6" label="Papel"><${Sel} value=${ed.papel} onChange=${v => setEd(x => ({ ...x, papel: v }))} options=${R.PAPEIS_USUARIO}/></${Field}>
        <${Field} c="6" label="E-mail"><${Inp} value=${ed.email} onChange=${v => setEd(x => ({ ...x, email: v }))}/></${Field}></div>
      </${Modal}>`}
    </${Card}>`;
  }

  /* ---------- Equipamentos (catálogo do STO) ---------- */
  function CadEquipamentos() {
    DB.useDB();
    const [ed, setEd] = useState(null); const [q, setQ] = useState('');
    const u = usos();
    const rows = DB.all('equipamentos').filter(e => !q || U.normTxt(e.nome).includes(U.normTxt(q))).sort((a, b) => U.cmp(a.nome, b.nome));
    const salvar = () => {
      if (!(ed.nome || '').trim()) return UI.toast('Nome do equipamento é obrigatório.', 'err');
      if (DB.all('equipamentos').some(x => x.id !== ed.id && U.norm(x.nome) === U.norm(ed.nome))) return UI.toast('Já existe um equipamento com esse nome.', 'err');
      if ((ed.premissas || []).some(p => !p.l)) return UI.toast('Toda premissa precisa de um rótulo.', 'err');
      DB.save('equipamentos', { ...ed, nome: ed.nome.trim(), premissas: (ed.premissas || []).map(p => ({ ...p, k: p.k || U.norm(p.l).slice(0, 16) || U.uid('p') })), ativo: ed.ativo !== false }, { resumo: 'Equipamento: ' + ed.nome });
      UI.toast('Equipamento salvo.', 'ok'); setEd(null);
    };
    const excluir = async e => { if (u[e.id]) return UI.toast(`Equipamento usado em ${u[e.id]} STO. Use "Inativar".`, 'err'); if (await UI.confirmar(`Excluir "${e.nome}"?`, { perigo: true, ok: 'Excluir' })) { DB.remove('equipamentos', e.id); UI.toast('Equipamento excluído.', 'ok'); } };
    const setP = (i, k, v) => setEd(x => ({ ...x, premissas: x.premissas.map((p, j) => j === i ? { ...p, [k]: v } : p) }));
    const cols = [
      { k: 'nome', t: 'Equipamento', r: e => html`<b style=${{ fontWeight: 600 }}>${e.nome}</b>` },
      { k: 'seg', t: 'Segmentos', nosort: true, r: e => (e.segmentoIds || []).length ? html`<div class="chips">${e.segmentoIds.map(s => html`<${Badge} key=${s}>${R.nomeLista(s)}</${Badge}>`)}</div>` : html`<span class="muted small">todos</span>` },
      { k: 'prem', t: 'Premissas técnicas', nosort: true, r: e => html`<span class="small">${(e.premissas || []).map(p => p.l).join(' · ') || html`<span class="muted">texto livre</span>`}</span>` },
      { k: 'uso', t: 'STO', al: 'r', v: e => u[e.id] || 0, r: e => u[e.id] || 0 },
      { k: 'ativo', t: 'Situação', r: e => e.ativo === false ? html`<${Badge}>Inativo</${Badge}>` : html`<${Badge} c="green">Ativo</${Badge}>` },
      { k: 'acoes', t: '', nosort: true, r: e => html`<${Btn} sm v="ghost" icon="edit" onClick=${() => setEd(JSON.parse(JSON.stringify(e)))}/><${Btn} sm v="ghost" icon=${e.ativo === false ? 'restore' : 'ban'} onClick=${() => DB.save('equipamentos', { ...e, ativo: e.ativo === false })}/><${Btn} sm v="ghost" icon="trash" onClick=${() => excluir(e)}/>` },
    ];
    return html`<div>
      <${UI.Filtros}><${FBusca} value=${q} onChange=${setQ} placeholder="Nome do equipamento"/></${UI.Filtros}>
      <${Card} title=${'Equipamentos (' + rows.length + ')'} sub="Catálogo usado no módulo STO; cada equipamento define as premissas técnicas a preencher" pad=${false} right=${html`<${Btn} sm v="primary" icon="plus" onClick=${() => setEd({ nome: '', segmentoIds: [], premissas: [], ativo: true })}>Novo equipamento</${Btn}>`}>
        <${Table} cols=${cols} rows=${rows} pageSize=${100}/></${Card}>
      ${ed && html`<${Modal} title=${ed.id ? 'Editar equipamento' : 'Novo equipamento'} onClose=${() => setEd(null)} footer=${html`<div class="spacer"></div><${Btn} onClick=${() => setEd(null)}>Cancelar</${Btn}><${Btn} v="primary" onClick=${salvar}>Salvar</${Btn}>`}>
        <div class="form-grid"><${Field} c="12" label="Nome do equipamento" req><${Inp} value=${ed.nome} onChange=${v => setEd(x => ({ ...x, nome: v }))} placeholder="ex.: Elevador de Canecas"/></${Field}>
        <${Field} c="12" label="Aparece nos segmentos" hint="Sem nenhum segmento marcado, o equipamento aparece em todos."><${Chips} value=${ed.segmentoIds} onChange=${v => setEd(x => ({ ...x, segmentoIds: v }))} options=${R.opts('segmento')}/></${Field}></div>
        <div class="section-title">Premissas técnicas (campos a preencher no STO)</div>
        ${(ed.premissas || []).map((p, i) => html`<div key=${i} class="form-grid" style=${{ marginBottom: 8 }}>
          <${Field} c="5" label=${i === 0 ? 'Rótulo' : ''}><${Inp} value=${p.l} onChange=${v => setP(i, 'l', v)} placeholder="ex.: Capacidade (t/h)"/></${Field}>
          <${Field} c="2" label=${i === 0 ? 'Tipo' : ''}><${Sel} value=${p.t} onChange=${v => setP(i, 't', v)} vazio=${false} options=${[{ v: 'txt', l: 'Texto' }, { v: 'n', l: 'Número' }, { v: 's', l: 'Lista' }]}/></${Field}>
          <${Field} c="4" label=${i === 0 ? 'Opções (lista, separadas por vírgula)' : ''}><${Inp} value=${(p.o || []).join(', ')} disabled=${p.t !== 's'} onChange=${v => setP(i, 'o', v.split(',').map(x => x.trim()).filter(Boolean))}/></${Field}>
          <div class="field c1" style=${{ justifyContent: 'flex-end' }}><${Btn} sm v="ghost" icon="trash" onClick=${() => setEd(x => ({ ...x, premissas: x.premissas.filter((_, j) => j !== i) }))}/></div></div>`)}
        <${Btn} sm icon="plus" onClick=${() => setEd(x => ({ ...x, premissas: (x.premissas || []).concat({ k: '', l: '', t: 'txt' }) }))}>Adicionar premissa</${Btn}>
      </${Modal}>`}
    </div>`;
  }

  /* ---------- Pós-venda (cadência) ---------- */
  function CadPosVenda() {
    DB.useDB();
    const cfg = DB.cfg('posVenda', { checkpoints: [], campos: [] });
    const [cp, setCp] = useState(() => (cfg.checkpoints || []).map(x => ({ ...x })));
    const salvar = () => { if (cp.some(c => !c.dias || !c.rotulo)) return UI.toast('Cada checkpoint precisa de dias e rótulo.', 'err'); DB.setCfg('posVenda', { ...cfg, checkpoints: cp.slice().sort((a, b) => a.dias - b.dias) }); UI.toast('Cadência de pós-venda salva.', 'ok'); };
    return html`<${Card} title="Pós-venda — cadência de acompanhamento" sub="Após a aprovação (data do pedido), o CRM agenda os toques de pós-venda conforme estes prazos" right=${html`<${Btn} sm v="primary" icon="check" onClick=${salvar}>Salvar</${Btn}>`}>
      ${cp.map((c, i) => html`<div key=${i} class="form-grid" style=${{ marginBottom: 8 }}>
        <${Field} c="2" label=${i === 0 ? 'Dias após o pedido' : ''}><${Inp} type="number" value=${c.dias} onChange=${v => setCp(a => a.map((x, j) => j === i ? { ...x, dias: v } : x))}/></${Field}>
        <${Field} c="9" label=${i === 0 ? 'Objetivo do toque' : ''}><${Inp} value=${c.rotulo} onChange=${v => setCp(a => a.map((x, j) => j === i ? { ...x, rotulo: v } : x))}/></${Field}>
        <div class="field c1" style=${{ justifyContent: 'flex-end' }}><${Btn} sm v="ghost" icon="trash" onClick=${() => setCp(a => a.filter((_, j) => j !== i))}/></div></div>`)}
      <${Btn} sm icon="plus" onClick=${() => setCp(a => a.concat({ dias: '', rotulo: '' }))}>Adicionar checkpoint</${Btn}>
    </${Card}>`;
  }

  /* ---------- Metas de vendas ---------- */
  function CadMetas() {
    DB.useDB();
    const [ed, setEd] = useState(null);
    const rows = DB.all('metas').slice().sort((a, b) => b.ano - a.ano || U.cmp(R.nomeUsuario(a.vendedorId), R.nomeUsuario(b.vendedorId)));
    const realizado = m => U.sum(DB.all('propostas').filter(p => !p.arquivada && p.categoria === 'Comercial' && R.resultado(p) === 'ganha' && U.ano(p.dataPedido || p.dataEntrada) === Number(m.ano) && (!m.vendedorId || p.vendedorId === m.vendedorId)), R.valorAprovado);
    const salvar = () => {
      if (!ed.ano || !ed.valor) return UI.toast('Informe ano e valor.', 'err');
      if (DB.all('metas').some(m => m.id !== ed.id && Number(m.ano) === Number(ed.ano) && (m.vendedorId || '') === (ed.vendedorId || ''))) return UI.toast('Já existe meta para esse ano/vendedor.', 'err');
      DB.save('metas', { ...ed, ano: Number(ed.ano) }, { resumo: 'Meta ' + ed.ano }); UI.toast('Meta salva.', 'ok'); setEd(null);
    };
    const cols = [
      { k: 'ano', t: 'Ano' }, { k: 'vend', t: 'Abrangência', v: m => R.nomeUsuario(m.vendedorId), r: m => m.vendedorId ? R.nomeUsuario(m.vendedorId) : html`<b>Empresa (geral)</b>` },
      { k: 'valor', t: 'Meta', al: 'r', r: m => U.brl(m.valor) }, { k: 'mensal', t: 'Equivale/mês', al: 'r', r: m => U.brl(m.valor / 12) },
      { k: 'real', t: 'Realizado (aprovado)', al: 'r', v: realizado, r: m => U.brl(realizado(m)) },
      { k: 'pct', t: '% da meta', v: m => U.div(realizado(m), m.valor), r: m => html`<div style=${{ minWidth: 120 }}><div class="small num">${U.pct(U.div(realizado(m), m.valor))}</div><${UI.Bar} v=${U.div(realizado(m), m.valor)} cor="var(--orange)"/></div>` },
      { k: 'acoes', t: '', nosort: true, r: m => html`<${Btn} sm v="ghost" icon="edit" onClick=${() => setEd({ ...m })}/><${Btn} sm v="ghost" icon="trash" onClick=${async () => { if (await UI.confirmar('Excluir esta meta?', { perigo: true })) DB.remove('metas', m.id); }}/>` },
    ];
    return html`<${Card} title="Metas de vendas" sub="Meta anual geral e, opcionalmente, por vendedor — usada no Dashboard" pad=${false} right=${html`<${Btn} sm v="primary" icon="plus" onClick=${() => setEd({ ano: new Date().getFullYear(), vendedorId: '', valor: null })}>Nova meta</${Btn}>`}>
      <${Table} cols=${cols} rows=${rows} vazio="Nenhuma meta cadastrada."/>
      ${ed && html`<${Modal} size="sm" title="Meta de vendas" onClose=${() => setEd(null)} footer=${html`<div class="spacer"></div><${Btn} onClick=${() => setEd(null)}>Cancelar</${Btn}><${Btn} v="primary" onClick=${salvar}>Salvar</${Btn}>`}>
        <div class="form-grid"><${Field} c="4" label="Ano" req><${Inp} type="number" value=${ed.ano} onChange=${v => setEd(x => ({ ...x, ano: v }))}/></${Field}>
        <${Field} c="8" label="Vendedor" hint="Deixe em branco para a meta geral"><${Sel} value=${ed.vendedorId} onChange=${v => setEd(x => ({ ...x, vendedorId: v }))} options=${R.optsUsuarios()} placeholder="Empresa (geral)"/></${Field}>
        <${Field} c="12" label="Valor da meta (R$)" req><${Money} value=${ed.valor} onChange=${v => setEd(x => ({ ...x, valor: v }))}/></${Field}></div>
      </${Modal}>`}
    </${Card}>`;
  }

  /* ---------- Rotas ---------- */
  const L = (tipo, titulo, sub) => () => html`<${ListaEditor} tipo=${tipo} titulo=${titulo} sub=${sub}/>`;
  Object.assign(CRM.ROTAS, {
    'cadastros/clientes': CadClientes,
    'cadastros/usuarios': CadUsuarios,
    'cadastros/equipamentos': CadEquipamentos,
    'cadastros/produto': L('produto', 'Produtos e serviços', 'Linhas de negócio / tipos de proposta — a proposta registra o valor por linha (antigas colunas "PREÇO …" da planilha)'),
    'cadastros/segmento': L('segmento', 'Segmentos de mercado', 'Cor usada nos gráficos e margem meta de referência'),
    'cadastros/etapa': L('etapa', 'Etapas comerciais (funil de vendas)', 'Colunas do Kanban; a probabilidade é usada no pipeline ponderado'),
    'cadastros/origem': L('origem', 'Origens do lead', 'Antiga coluna "ENTRADA DO LEAD"'),
    'cadastros/motivoPerda': L('motivoPerda', 'Motivos de perda', 'Obrigatório ao registrar proposta perdida'),
    'cadastros/categoriaContrato': L('categoriaContrato', 'Categorias de contrato', 'Hoje: guarda-chuva (por demanda). Inclua outras categorias quando validadas.'),
    'cadastros/atividades': () => html`<div><${ListaEditor} tipo="tipoAtividade" sub="Usado na Agenda (ligação, reunião, e-mail…)"/><${ListaEditor} tipo="tipoVisita" sub="Usado na Prospecção (forma de contato/visita)"/></div>`,
    'cadastros/status': () => html`<div class="grid g2"><${ListaEditor} tipo="statusProposta" sub="Define o resultado: em andamento, aprovada ou perdida"/><${ListaEditor} tipo="statusElaboracao" sub="Antiga coluna STATUS ATIVIDADE"/>
      <${ListaEditor} tipo="statusCapex"/><${ListaEditor} tipo="statusProspeccao"/><${ListaEditor} tipo="faixaValor" sub="Estimativa de preço anterior à proposta"/><${ListaEditor} tipo="tipoSede"/><${ListaEditor} tipo="areaContato"/><${ListaEditor} tipo="papelContato"/></div>`,
    'cadastros/sto': () => html`<div class="grid g2"><${ListaEditor} tipo="itemAluguel"/><${ListaEditor} tipo="itemManutencao"/><${ListaEditor} tipo="tipoProjeto"/><${ListaEditor} tipo="tipoFrete"/></div>`,
    'cadastros/posvenda': CadPosVenda,
    'cadastros/metas': CadMetas,
  });
})();
