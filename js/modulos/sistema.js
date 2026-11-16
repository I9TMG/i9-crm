/* =========================================================
   SISTEMA — backup, restauração, importação/exportação,
   validação de dados, histórico de alterações e preferências
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useMemo, useEffect } = React;
  const { Field, Inp, Sel, Btn, Modal, Check, Badge, Icon, Card, Table, Filtros, FSel, FBusca, Status, Kpi, Seg } = UI;

  /* ---------- Backup / restauração ---------- */
  CRM.fazerBackup = () => {
    const b = DB.exportar(); const nome = 'CRM_I9TMG_backup_' + U.hoje() + '_' + new Date().toTimeString().slice(0, 5).replace(':', 'h') + '.json';
    U.download(nome, JSON.stringify(b), 'application/json'); DB.setCfg('ultimoBackup', U.agora()); UI.toast('Backup gerado: ' + nome, 'ok');
  };
  CRM.restaurarBackup = async () => {
    const file = await U.escolherArquivo('.json,application/json'); if (!file) return;
    let obj; try { obj = JSON.parse(await U.lerArquivo(file)); } catch (e) { return UI.toast('Arquivo inválido: não é um JSON.', 'err'); }
    const erros = DB.validarBackup(obj);
    if (erros.length) return UI.toast('Backup inválido: ' + erros.slice(0, 3).join(' '), 'err');
    const cont = Object.entries(obj.stores).filter(([, v]) => v.length).map(([k, v]) => `${DB.STORES[k] || k}: ${v.length}`).join('\n');
    if (!await UI.confirmar(`Restaurar o backup de ${U.dataHora(obj.geradoEm)}?\n\nOs dados atuais deste navegador serão SUBSTITUÍDOS por:\n${cont}\n\nRecomenda-se gerar um backup dos dados atuais antes.`, { perigo: true, palavra: 'RESTAURAR', ok: 'Restaurar', titulo: 'Restaurar backup' })) return;
    const st = { ...obj.stores }; st.auditoria = (st.auditoria || []).concat({ id: U.uid('aud'), store: 'sistema', registroId: '-', acao: 'restauração', resumo: 'Backup de ' + obj.geradoEm + ' restaurado (' + file.name + ')', usuario: DB.usuarioAtual(), data: U.agora() });
    await DB.substituirTudo(st); UI.toast('Backup restaurado com sucesso.', 'ok');
  };

  function Backup() {
    DB.useDB();
    const [uso, setUso] = useState(null);
    useEffect(() => { if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(setUso).catch(() => { }); }, [DB.version]);
    const ult = DB.cfg('ultimoBackup', '');
    const cont = Object.keys(DB.STORES).filter(s => s !== 'config').map(s => ({ id: s, nome: DB.STORES[s], qtd: DB.all(s).length }));
    return html`<div class="grid g2" style=${{ alignItems: 'start' }}>
      <div class="col" style=${{ gap: 14 }}>
        <${Card} title="Backup completo" sub="Arquivo .json com todas as tabelas — guarde na pasta do OneDrive">
          <p class="small muted" style=${{ marginTop: 0 }}>Os dados do CRM ficam salvos no armazenamento interno (IndexedDB) <b>deste navegador, neste computador</b>. Faça backup com frequência (recomendado: semanal) e guarde o arquivo no OneDrive. O arquivo também serve para levar os dados para outro computador.</p>
          <div class="row"><${Btn} v="primary" icon="download" onClick=${CRM.fazerBackup}>Gerar backup agora</${Btn}><span class="small muted">Último backup: ${ult ? U.dataHora(ult) : 'nunca'}</span></div>
        </${Card}>
        <${Card} title="Restaurar backup" sub="Substitui os dados atuais pelos do arquivo">
          <div class="notice warn small mb"><${Icon} n="alert" s=${15}/>A restauração valida o arquivo antes e pede confirmação. Gere um backup dos dados atuais antes de restaurar.</div>
          <${Btn} icon="upload" onClick=${CRM.restaurarBackup}>Escolher arquivo de backup…</${Btn}>
        </${Card}>
        <${Card} title="Armazenamento">
          <dl class="kv"><dt>Local</dt><dd>IndexedDB do navegador (banco "crm_i9tmg")</dd><dt>Espaço utilizado</dt><dd>${uso ? (uso.usage / 1024 / 1024).toFixed(1) + ' MB de ' + (uso.quota / 1024 / 1024 / 1024).toFixed(1) + ' GB disponíveis' : '—'}</dd>
          <dt>Versão do esquema</dt><dd>${DB.SCHEMA_VERSION}</dd></dl>
        </${Card}>
      </div>
      <${Card} title="Conteúdo atual" pad=${false}><${Table} rows=${cont} pageSize=${30} cols=${[{ k: 'nome', t: 'Tabela' }, { k: 'qtd', t: 'Registros', al: 'r', r: x => U.int(x.qtd) }]}/></${Card}>
    </div>`;
  }

  /* ---------- Importação / exportação ---------- */
  const lerPlanilha = async file => {
    const buf = await U.lerArquivo(file, 'buffer'); const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    return wb.SheetNames.map(n => ({ nome: n, ws: wb.Sheets[n] }));
  };
  const linhasDe = (ws, linhaCab) => {
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    // cabeçalho: primeira linha (entre as 20 primeiras) que contém CÓDIGO / EMPRESA / NOME; senão, a linha mais preenchida
    const ehCab = r => r.some(x => /^(C[ÓO]DIGO|EMPRESA|NOME|NOME FANTASIA|CLIENTE)$/i.test(String(x).trim()));
    let i = linhaCab !== undefined ? linhaCab : aoa.slice(0, 20).findIndex(ehCab);
    if (i < 0) { let mx = 0; aoa.slice(0, 20).forEach((r, j) => { const n = r.filter(x => String(x).trim()).length; if (n > mx) { mx = n; i = j; } }); }
    if (i < 0) return [];
    const cab = aoa[i].map(c => String(c).trim().toUpperCase().replace(/\s+/g, ' '));
    return aoa.slice(i + 1).filter(r => r.some(x => String(x).trim())).map(r => { const o = {}; cab.forEach((c, j) => { if (c) o[c] = r[j]; }); return o; });
  };
  const dt = v => { if (!v) return ''; if (v instanceof Date) return U.iso(new Date(v.getTime() + 12 * 3600e3)); const s = String(v).trim(); const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); if (m) return `${m[3]}-${m[2]}-${m[1]}`; if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); if (!isNaN(Number(s)) && Number(s) > 30000) { const d = XLSX.SSF.parse_date_code(Number(s)); return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''; } return ''; };
  const nn = v => { if (v === '' || v === null || v === undefined) return null; if (typeof v === 'number') return v; const n = Number(String(v).replace(/[R$\s.]/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
  const pega = (o, ...ks) => { for (const k of ks) { const kk = Object.keys(o).find(x => x === k || x.startsWith(k)); if (kk && String(o[kk]).trim() !== '') return o[kk]; } return ''; };

  function acharCliente(nome, codigo) {
    const n = U.norm(nome); if (!n) return null;
    const pre = (codigo || '').toUpperCase().replace(/[A-Z]$/, '').slice(0, -4);
    return DB.all('clientes').find(c => pre && c.codigo && c.codigo.toUpperCase() === pre) || DB.all('clientes').find(c => U.norm(c.nomeFantasia) === n || U.norm(c.razaoSocial) === n)
      || (n.length >= 6 && DB.all('clientes').find(c => { const a = U.norm(c.nomeFantasia); return a.length >= 6 && (a.startsWith(n) || n.startsWith(a)); })) || null;
  }

  function Importar() {
    DB.useDB();
    const [prev, setPrev] = useState(null);
    const [opt, setOpt] = useState({ categoria: 'Comercial', criarClientes: true, atualizar: false });
    const modeloClientes = () => U.exportarExcel('Modelo_importacao_clientes.xlsx', [{ nome: 'Clientes', linhas: [], colunas: ['Código', 'Nome fantasia', 'Razão social', 'CNPJ', 'Segmento', 'Endereço', 'Cidade', 'UF', 'País', 'Telefone', 'E-mail', 'Responsável comercial', 'Origem', 'Status', 'Observações'].map(t => ({ t, v: () => '' })) }]);
    const modeloPropostas = () => U.exportarExcel('Modelo_importacao_propostas.xlsx', [{ nome: 'Controle de propostas', linhas: [], colunas: ['STATUS DA PROPOSTA', 'CÓDIGO', 'DESCRIÇÃO', 'EMPRESA', 'CIDADE', 'UF', 'DATA DE ENTRADA', 'DATA LIMITE', 'DATA DE ENVIO', 'ENTRADA PEDIDO', 'RESPONSÁVEL', 'STATUS ATIVIDADE', 'FUNIL DE VENDAS', 'TIPO DA PROPOSTA', 'PROB. DE FECH. (0<10)', 'RESPONSÁVEL (Cliente)', 'CONTATO', 'E-MAIL', ...R.lista('produto').map(l => 'PREÇO ' + l.nome.toUpperCase()), 'PREÇO TOTAL PROPOSTA', 'ENTRADA DO LEAD', 'OBSERVAÇÕES', 'SEGMENTO', 'VALOR FECHADO', 'MOTIVO DA PERDA'].map(t => ({ t, v: () => '' })) }]);

    const analisarClientes = async () => {
      const file = await U.escolherArquivo('.xlsx,.xls,.csv'); if (!file) return;
      try {
        const abas = await lerPlanilha(file); const rows = linhasDe(abas[0].ws);
        const itens = rows.map((r, i) => { const nome = String(pega(r, 'NOME FANTASIA', 'NOME', 'CLIENTE', 'EMPRESA')).trim(); const cnpj = String(pega(r, 'CNPJ')).trim();
          const rec = { codigo: String(pega(r, 'CÓDIGO', 'CODIGO')).trim(), nomeFantasia: nome, razaoSocial: String(pega(r, 'RAZÃO SOCIAL', 'RAZAO SOCIAL')).trim() || nome, cnpj, segmentoId: R.idLista('segmento', pega(r, 'SEGMENTO')), endereco: String(pega(r, 'ENDEREÇO', 'ENDERECO')), cidade: String(pega(r, 'CIDADE')), uf: String(pega(r, 'UF', 'ESTADO')).toUpperCase().slice(0, 2), pais: String(pega(r, 'PAÍS', 'PAIS')) || 'Brasil', telefone: String(pega(r, 'TELEFONE')), email: String(pega(r, 'E-MAIL', 'EMAIL')), vendedorId: (R.usuarios().find(u => U.norm(u.nome) === U.norm(pega(r, 'RESPONSÁVEL', 'RESPONSAVEL'))) || {}).id || '', origemId: R.idLista('origem', pega(r, 'ORIGEM')), status: R.STATUS_CLIENTE.includes(pega(r, 'STATUS')) ? pega(r, 'STATUS') : 'Ativo', observacoes: String(pega(r, 'OBSERVAÇÕES', 'OBSERVACOES')), segmentosSecundarios: [], dataCadastro: U.hoje() };
          const erro = !nome ? 'Sem nome' : cnpj && !U.cnpjValido(cnpj) ? 'CNPJ inválido' : '';
          const dup = !erro ? R.duplicidadesCliente({ ...rec, id: '__imp' }) : [];
          return { i: i + 2, rec, erro, dup: dup[0] ? dup[0].c.nomeFantasia + ' (' + dup[0].motivo + ')' : '' }; });
        setPrev({ tipo: 'clientes', arquivo: file.name, itens });
      } catch (e) { UI.toast('Não foi possível ler o arquivo: ' + e.message, 'err'); }
    };
    const analisarPropostas = async () => {
      const file = await U.escolherArquivo('.xlsx,.xlsm,.xls'); if (!file) return;
      try {
        const abas = await lerPlanilha(file);
        const aba = abas.find(a => /capex/i.test(a.nome) === (opt.categoria === 'CAPEX') && /controle/i.test(a.nome)) || abas[0];
        const rows = linhasDe(aba.ws).filter(r => String(pega(r, 'CÓDIGO', 'CODIGO')).trim());
        const linhas = R.lista('produto', true);
        const itens = rows.map((r, i) => {
          const cod = String(pega(r, 'CÓDIGO', 'CODIGO')).trim(); const emp = String(pega(r, 'EMPRESA', 'CLIENTE')).trim();
          const cli = acharCliente(emp, cod); const existe = DB.all('propostas').find(p => (p.codigo || '').toUpperCase() === cod.toUpperCase());
          const valores = {}; linhas.forEach(l => { const v = nn(r['PREÇO ' + l.nome.toUpperCase()]); if (v) valores[l.id] = v; });
          if (!Object.keys(valores).length) { const t = nn(pega(r, 'PREÇO TOTAL', 'VALOR')); if (t) valores.nd = t; }
          const tipos = String(pega(r, 'TIPO DA PROPOSTA', 'TIPO')).split(',').map(x => R.idLista('produto', x.trim())).filter(Boolean);
          const st = String(pega(r, 'STATUS DA PROPOSTA')).replace('Entregue/ Enviado', 'Entregue/Enviado').trim();
          const erro = !emp ? 'Sem empresa' : !dt(pega(r, 'DATA DE ENTRADA')) ? 'Sem data de entrada' : '';
          return { i: i + 3, cod, emp, cli, existe, erro, r, valores, tipos, st };
        });
        setPrev({ tipo: 'propostas', arquivo: file.name + ' › ' + aba.nome, itens });
      } catch (e) { UI.toast('Não foi possível ler o arquivo: ' + e.message, 'err'); }
    };
    const importar = async () => {
      if (prev.tipo === 'clientes') {
        const ok = prev.itens.filter(x => !x.erro && !x.dup);
        if (!await UI.confirmar(`Importar ${ok.length} cliente(s)? ${prev.itens.length - ok.length} linha(s) com erro ou duplicidade serão ignoradas.`)) return;
        ok.forEach(x => { const c = DB.save('clientes', { ...x.rec, codigo: x.rec.codigo || R.novoCodigoCliente(x.rec.nomeFantasia), origemDado: 'Importação ' + prev.arquivo }, { silencioso: true }); DB.save('sedes', { clienteId: c.id, nome: c.nomeFantasia + (c.cidade ? ' — ' + c.cidade : ''), tipo: 'Matriz', cidade: c.cidade, uf: c.uf, pais: c.pais, cnpj: c.cnpj, logradouro: c.endereco, segmentoId: c.segmentoId, ativo: true }, { silencioso: true, semAuditoria: true }); });
        DB.setCfg('_import', U.agora()); UI.toast(ok.length + ' cliente(s) importado(s).', 'ok'); setPrev(null); return;
      }
      const validos = prev.itens.filter(x => !x.erro && (x.cli || opt.criarClientes) && (!x.existe || opt.atualizar));
      if (!await UI.confirmar(`Importar ${validos.length} proposta(s) como ${opt.categoria}?\n${prev.itens.filter(x => x.existe).length} código(s) já existem (${opt.atualizar ? 'serão atualizados' : 'serão ignorados'}).`)) return;
      let criados = 0;
      validos.forEach(x => {
        const r = x.r; let c = x.cli || acharCliente(x.emp, x.cod);
        if (!c) { c = DB.save('clientes', { codigo: x.cod.toUpperCase().slice(0, -4) || R.novoCodigoCliente(x.emp), nomeFantasia: x.emp, razaoSocial: x.emp, cnpj: '', segmentoId: R.idLista('segmento', pega(r, 'SEGMENTO')), segmentosSecundarios: [], vendedorId: '', origemId: '', status: 'Prospect', cidade: String(pega(r, 'CIDADE')), uf: String(pega(r, 'UF')), pais: 'Brasil', observacoes: 'Criado na importação de ' + prev.arquivo, dataCadastro: dt(pega(r, 'DATA DE ENTRADA')) }, { silencioso: true }); criados++; }
        const cidade = String(pega(r, 'CIDADE')).trim(); const sedes = DB.all('sedes').filter(s => s.clienteId === c.id);
        let sede = sedes.find(s => U.norm(s.cidade) === U.norm(cidade)) || (!cidade ? sedes[0] : null);
        if (!sede) sede = DB.save('sedes', { clienteId: c.id, nome: c.nomeFantasia + (cidade ? ' ' + cidade : ''), tipo: 'Planta', cidade, uf: String(pega(r, 'UF')).toUpperCase(), pais: 'Brasil', ativo: true }, { silencioso: true, semAuditoria: true });
        const vend = (R.usuarios(true).find(u => U.norm(u.nome) === U.norm(pega(r, 'RESPONSÁVEL'))) || {}).id || '';
        const contNome = String(pega(r, 'RESPONSÁVEL (CLIENTE)')).trim(); let contato = contNome ? DB.all('contatos').find(t => t.clienteId === c.id && U.norm(t.nome) === U.norm(contNome)) : null;
        if (!contato && contNome) contato = DB.save('contatos', { clienteId: c.id, sedeId: sede.id, nome: contNome, celular: String(pega(r, 'CONTATO')), email: String(pega(r, 'E-MAIL')), ativo: true, principal: false }, { silencioso: true, semAuditoria: true });
        const etapa = R.idLista('etapa', String(pega(r, 'FUNIL DE VENDAS')).replace('pós vendas', 'pós-vendas')) || R.etapas()[0].id;
        const prob = nn(pega(r, 'PROB')); const base = x.existe || {};
        const op = DB.save('oportunidades', { ...(DB.get('oportunidades', base.oportunidadeId) || { historicoEtapas: [{ etapaId: etapa, data: dt(pega(r, 'DATA DE ENTRADA')), usuario: 'Importação' }], qualificacao: {}, perdida: false, natureza: 'Proposta efetiva' }), titulo: String(pega(r, 'DESCRIÇÃO', 'DESCRICAO')), clienteId: c.id, sedeId: sede.id, contatoId: contato ? contato.id : '', vendedorId: vend, segmentoId: R.idLista('segmento', pega(r, 'SEGMENTO')) || c.segmentoId, origemId: R.idLista('origem', pega(r, 'ENTRADA DO LEAD')), etapaId: etapa, probabilidade: prob !== null ? (prob <= 10 ? prob * 10 : prob) : null }, { silencioso: true, semAuditoria: true });
        DB.save('propostas', { ...base, codigo: x.cod, categoria: opt.categoria, oportunidadeId: op.id, clienteId: c.id, sedeId: sede.id, contatoId: contato ? contato.id : '', vendedorId: vend, descricao: String(pega(r, 'DESCRIÇÃO', 'DESCRICAO')), linhas: x.tipos.length ? x.tipos : (base.linhas || []), valores: x.valores, moeda: 'BRL',
          status: opt.categoria === 'CAPEX' ? (base.status || '') : x.st || 'Recebida', statusElaboracao: opt.categoria === 'CAPEX' ? '' : String(pega(r, 'STATUS ATIVIDADE')), statusCapex: opt.categoria === 'CAPEX' ? String(pega(r, 'STATUS ATIVIDADE')) : '',
          dataEntrada: dt(pega(r, 'DATA DE ENTRADA')), dataLimite: dt(pega(r, 'DATA LIMITE')), dataEnvio: dt(pega(r, 'DATA DE ENVIO')), dataPedido: dt(pega(r, 'ENTRADA PEDIDO')), valorFechado: nn(pega(r, 'VALOR FECHADO')), motivoPerdaId: R.idLista('motivoPerda', pega(r, 'MOTIVO DA PERDA')),
          observacoes: String(pega(r, 'OBSERVAÇÕES', 'OBSERVACOES')), arquivada: false, origemDado: 'Importação ' + prev.arquivo,
          historico: (base.historico || []).concat({ data: U.agora(), usuario: DB.usuarioAtual(), acao: base.id ? 'Atualizada por importação' : 'Importada', detalhe: prev.arquivo + ' (linha ' + x.i + ')' }) }, { silencioso: true, resumo: 'Importação: ' + x.cod });
      });
      DB.setCfg('_import', U.agora()); UI.toast(`${validos.length} proposta(s) importada(s)` + (criados ? `, ${criados} cliente(s) criado(s)` : '') + '.', 'ok'); setPrev(null);
    };
    const exportarTudo = () => U.exportarExcel('CRM_I9TMG_dados_completos_' + U.hoje() + '.xlsx', Object.keys(DB.STORES).filter(s => DB.all(s).length).map(s => {
      const regs = DB.all(s); const ks = U.uniq(regs.flatMap(r => Object.keys(r)));
      return { nome: s, linhas: regs, colunas: ks.map(k => ({ t: k, v: r => { const v = r[k]; return v && typeof v === 'object' ? JSON.stringify(v) : v; } })) };
    }));
    return html`<div>
      <div class="grid g3">
        <${Card} title="Exportar"><p class="small muted" style=${{ marginTop: 0 }}>Cada módulo possui botão "Excel" com os dados filtrados. Aqui você exporta todas as tabelas de uma vez (uma aba por tabela).</p><${Btn} icon="download" onClick=${exportarTudo}>Exportar todas as tabelas (.xlsx)</${Btn}></${Card}>
        <${Card} title="Importar clientes"><p class="small muted" style=${{ marginTop: 0 }}>Planilha Excel/CSV com uma linha por cliente. Duplicidades (CNPJ, nome ou código) são detectadas e ignoradas.</p><div class="row"><${Btn} icon="upload" onClick=${analisarClientes}>Selecionar arquivo</${Btn}><${Btn} v="ghost" icon="download" onClick=${modeloClientes}>Modelo</${Btn}></div></${Card}>
        <${Card} title="Importar propostas (histórico)"><p class="small muted" style=${{ marginTop: 0 }}>Planilha no formato "Controle de propostas" (2022, 2023…). Clientes são vinculados pelo código/nome.</p>
          <div class="row mb"><${Seg} value=${opt.categoria} onChange=${v => setOpt(o => ({ ...o, categoria: v }))} options=${['Comercial', 'CAPEX']}/></div>
          <div class="col mb"><${Check} checked=${opt.criarClientes} onChange=${v => setOpt(o => ({ ...o, criarClientes: v }))} label="Criar clientes não encontrados (status Prospect)"/><${Check} checked=${opt.atualizar} onChange=${v => setOpt(o => ({ ...o, atualizar: v }))} label="Atualizar propostas com código já existente"/></div>
          <div class="row"><${Btn} icon="upload" onClick=${analisarPropostas}>Selecionar planilha</${Btn}><${Btn} v="ghost" icon="download" onClick=${modeloPropostas}>Modelo</${Btn}></div></${Card}>
      </div>
      ${prev && html`<${Card} className="mt" title=${'Prévia da importação — ' + prev.arquivo} sub="Nada é gravado antes da confirmação" pad=${false} right=${html`<${Btn} onClick=${() => setPrev(null)}>Cancelar</${Btn}><${Btn} v="primary" icon="check" onClick=${importar}>Confirmar importação</${Btn}>`}>
        ${prev.tipo === 'clientes' ? html`<${Table} rows=${prev.itens.map(x => ({ ...x, id: x.i }))} pageSize=${25} cols=${[{ k: 'i', t: 'Linha' }, { k: 'nome', t: 'Nome', r: x => x.rec.nomeFantasia }, { k: 'cnpj', t: 'CNPJ', r: x => x.rec.cnpj }, { k: 'cid', t: 'Cidade/UF', r: x => [x.rec.cidade, x.rec.uf].filter(Boolean).join('/') }, { k: 'sit', t: 'Situação', v: x => x.erro || x.dup || 'ok', r: x => x.erro ? html`<${Badge} c="red">${x.erro}</${Badge}>` : x.dup ? html`<${Badge} c="amber">Duplicado: ${x.dup}</${Badge}>` : html`<${Badge} c="green">Será importado</${Badge}>` }]}/>`
          : html`<${Table} rows=${prev.itens.map(x => ({ ...x, id: x.i }))} pageSize=${25} cols=${[{ k: 'i', t: 'Linha' }, { k: 'cod', t: 'Código' }, { k: 'emp', t: 'Empresa' }, { k: 'cli', t: 'Cliente no CRM', v: x => x.cli ? x.cli.nomeFantasia : '', r: x => x.cli ? x.cli.nomeFantasia : html`<${Badge} c=${opt.criarClientes ? 'orange' : 'red'}>${opt.criarClientes ? 'será criado' : 'não encontrado'}</${Badge}>` }, { k: 'st', t: 'Status' }, { k: 'valor', t: 'Valor', al: 'r', r: x => U.brl(U.sum(Object.values(x.valores))) },
            { k: 'sit', t: 'Situação', v: x => x.erro || (x.existe ? 'existe' : 'ok'), r: x => x.erro ? html`<${Badge} c="red">${x.erro}</${Badge}>` : x.existe ? html`<${Badge} c="amber">${opt.atualizar ? 'atualizará' : 'já existe — ignorada'}</${Badge}>` : (!x.cli && !opt.criarClientes) ? html`<${Badge} c="red">ignorada</${Badge}>` : html`<${Badge} c="green">nova</${Badge}>` }]}/>`}
      </${Card}>`}
    </div>`;
  }

  /* ---------- Validação de dados ---------- */
  function Validacao() {
    DB.useDB();
    const [aberto, setAberto] = useState(null);
    const checks = useMemo(() => {
      const P = DB.all('propostas'), C = DB.all('clientes'), h = U.hoje();
      const cod = U.groupBy(P.filter(p => p.codigo), p => p.codigo.trim().toUpperCase());
      const nomes = U.groupBy(C, c => U.norm(c.nomeFantasia)); const cnpjs = U.groupBy(C.filter(c => U.soDigitos(c.cnpj)), c => U.soDigitos(c.cnpj));
      const quebra = P.filter(p => !DB.get('clientes', p.clienteId) || (p.sedeId && !DB.get('sedes', p.sedeId)) || (p.contatoId && !DB.get('contatos', p.contatoId)) || (p.stoId && !DB.get('stos', p.stoId)) || (p.contratoId && !DB.get('contratos', p.contratoId)) || !DB.get('oportunidades', p.oportunidadeId));
      const etapaFinal = R.ordemEtapa(R.idLista('etapa', 'Concluído Aprovado'));
      return [
        { k: 'cod', nivel: 'err', t: 'Códigos de proposta duplicados', regs: Object.values(cod).filter(a => a.length > 1).flat(), tipo: 'proposta' },
        { k: 'clidup', nivel: 'err', t: 'Clientes com mesmo nome ou CNPJ', regs: Object.values(nomes).concat(Object.values(cnpjs)).filter(a => a.length > 1).flat().filter((c, i, a) => a.indexOf(c) === i), tipo: 'cliente', dica: 'Use Cadastros › Clientes › Mesclar duplicados' },
        { k: 'ref', nivel: 'err', t: 'Propostas com vínculos quebrados (cliente, sede, contato, oportunidade, STO ou contrato)', regs: quebra, tipo: 'proposta' },
        { k: 'cnpjinv', nivel: 'warn', t: 'Clientes com CNPJ inválido', regs: C.filter(c => c.cnpj && !U.cnpjValido(c.cnpj)), tipo: 'cliente' },
        { k: 'semvend', nivel: 'warn', t: 'Clientes sem responsável comercial', regs: C.filter(c => !c.vendedorId && c.status !== 'Inativo'), tipo: 'cliente' },
        { k: 'propvend', nivel: 'warn', t: 'Propostas sem responsável comercial', regs: P.filter(p => !p.vendedorId && !p.arquivada), tipo: 'proposta' },
        { k: 'perdmot', nivel: 'warn', t: 'Propostas perdidas sem motivo da perda', regs: P.filter(p => !p.arquivada && p.categoria === 'Comercial' && R.resultado(p) === 'perdida' && !p.motivoPerdaId), tipo: 'proposta' },
        { k: 'prazo', nivel: 'warn', t: 'Propostas em aberto, não enviadas, com data limite vencida', regs: P.filter(p => !p.arquivada && p.categoria === 'Comercial' && R.resultado(p) === 'aberta' && !p.dataEnvio && p.dataLimite && p.dataLimite < h), tipo: 'proposta' },
        { k: 'semvalor', nivel: 'info', t: 'Propostas enviadas sem valor informado', regs: P.filter(p => !p.arquivada && p.dataEnvio && !R.valorTotal(p)), tipo: 'proposta' },
        { k: 'etapaperd', nivel: 'info', t: 'Propostas perdidas cuja oportunidade permaneceu em etapa intermediária', regs: P.filter(p => !p.arquivada && R.resultado(p) === 'perdida' && R.ordemEtapa(R.etapaDaProposta(p)) < etapaFinal), tipo: 'proposta', dica: 'Mantido como está (decisão pendente). A situação "Perdida" já é considerada no funil e nos indicadores.' },
        { k: 'ganhaetapa', nivel: 'info', t: 'Propostas aprovadas com oportunidade antes de "Concluído Aprovado"', regs: P.filter(p => !p.arquivada && R.resultado(p) === 'ganha' && R.ordemEtapa(R.etapaDaProposta(p)) < etapaFinal), tipo: 'proposta' },
        { k: 'semcnpj', nivel: 'info', t: 'Clientes sem CNPJ cadastrado', regs: C.filter(c => !c.cnpj), tipo: 'cliente', dica: 'O CNPJ é o principal controle contra duplicidade.' },
        { k: 'stoinc', nivel: 'info', t: 'STO em elaboração com pendências ISO', regs: DB.all('stos').filter(s => s.situacao !== 'Cancelada' && !s.propostaId && R.stoFaltando(s).length), tipo: 'sto' },
      ];
    }, [DB.version]);
    const abrir = (tipo, r) => tipo === 'cliente' ? CRM.abrir('clienteFicha', { id: r.id }) : tipo === 'sto' ? CRM.abrir('stoForm', { id: r.id }) : CRM.abrir('propostaDetalhe', { id: r.id });
    const cor = { err: 'red', warn: 'amber', info: 'blue' };
    return html`<div>
      <div class="notice mb"><${Icon} n="shield" s=${16}/>Verificações automáticas de integridade e qualidade dos dados. Clique em um item para ver os registros. Nenhuma correção é feita automaticamente.</div>
      <${Card} pad=${false}>${checks.map(c => html`<div key=${c.k}>
        <div class="list-item" style=${{ padding: '10px 16px', cursor: c.regs.length ? 'pointer' : 'default' }} onClick=${() => c.regs.length && setAberto(aberto === c.k ? null : c.k)}>
          <${Badge} c=${c.regs.length ? cor[c.nivel] : 'green'}>${c.regs.length ? U.int(c.regs.length) : 'OK'}</${Badge}><div style=${{ flex: 1 }}><div class="strong">${c.t}</div>${c.dica && html`<div class="small muted">${c.dica}</div>`}</div>
          ${c.regs.length > 0 && html`<${Icon} n=${aberto === c.k ? 'down' : 'right'} s=${15}/>`}</div>
        ${aberto === c.k && html`<div style=${{ padding: '0 16px 12px' }}><${Table} rows=${c.regs} pageSize=${10} onRow=${r => abrir(c.tipo, r)} cols=${c.tipo === 'cliente' ? [{ k: 'codigo', t: 'Código' }, { k: 'nomeFantasia', t: 'Cliente' }, { k: 'cnpj', t: 'CNPJ' }, { k: 'cid', t: 'Cidade/UF', r: x => [x.cidade, x.uf].filter(Boolean).join('/') }]
          : c.tipo === 'sto' ? [{ k: 'numero', t: 'STO' }, { k: 'cli', t: 'Cliente', r: s => R.nomeCliente(s.clienteId) }, { k: 'falta', t: 'Falta', r: s => R.stoFaltando(s).join(', ') }]
          : [{ k: 'codigo', t: 'Código' }, { k: 'dataEntrada', t: 'Entrada', r: p => U.data(p.dataEntrada) }, { k: 'cli', t: 'Cliente', r: p => R.nomeCliente(p.clienteId) || html`<${Badge} c="red">inexistente</${Badge}>` }, { k: 'descricao', t: 'Descrição' }, { k: 'status', t: 'Status' }]}/></div>`}
      </div>`)}</${Card}>
    </div>`;
  }

  /* ---------- Histórico de alterações (auditoria) ---------- */
  function Auditoria() {
    DB.useDB();
    const { f, set, limpar, ativos } = UI.useFiltros({ q: '', store: '', acao: '', usuario: '' }, 'aud');
    const rows = useMemo(() => DB.all('auditoria').filter(a => (!f.store || a.store === f.store) && (!f.acao || a.acao === f.acao) && (!f.usuario || a.usuario === f.usuario) && (!f.q || U.normTxt(a.resumo).includes(U.normTxt(f.q)))), [DB.version, f]);
    const abrir = a => { const map = { clientes: 'clienteFicha', propostas: 'propostaDetalhe', oportunidades: 'oportunidade', stos: 'stoForm', prospeccoes: 'prospeccaoForm', atividades: 'atividade', contratos: 'contrato' }; if (map[a.store] && DB.get(a.store, a.registroId)) CRM.abrir(map[a.store], { id: a.registroId }); };
    return html`<div>
      <${Filtros} ativos=${ativos} limpar=${limpar} right=${html`<${Btn} icon="download" onClick=${() => U.exportarExcel('Historico_alteracoes_' + U.hoje() + '.xlsx', [{ nome: 'Auditoria', linhas: rows, colunas: [{ t: 'Data', v: a => a.data }, { t: 'Usuário', v: a => a.usuario }, { t: 'Tabela', v: a => DB.STORES[a.store] || a.store }, { t: 'Ação', v: a => a.acao }, { t: 'Resumo', v: a => a.resumo }, { t: 'Registro', v: a => a.registroId }] }])}>Excel</${Btn}>`}>
        <${FBusca} value=${f.q} onChange=${v => set('q', v)} placeholder="Texto do resumo"/>
        <${FSel} label="Tabela" value=${f.store} onChange=${v => set('store', v)} options=${Object.keys(DB.STORES).map(s => ({ v: s, l: DB.STORES[s] }))}/>
        <${FSel} label="Ação" value=${f.acao} onChange=${v => set('acao', v)} options=${U.uniq(DB.all('auditoria').map(a => a.acao))}/>
        <${FSel} label="Usuário" value=${f.usuario} onChange=${v => set('usuario', v)} options=${U.uniq(DB.all('auditoria').map(a => a.usuario))}/>
      </${Filtros}>
      <${Card} pad=${false} title=${U.int(rows.length) + ' registro(s)'} sub="Inclusões, alterações e exclusões ficam registradas para controle de histórico">
        <${Table} rows=${rows} sortInicial=${{ k: 'data', d: 'desc' }} onRow=${abrir} cols=${[{ k: 'data', t: 'Data/hora', r: a => U.dataHora(a.data) }, { k: 'usuario', t: 'Usuário' }, { k: 'store', t: 'Tabela', r: a => DB.STORES[a.store] || a.store }, { k: 'acao', t: 'Ação', r: a => html`<${Badge} c=${a.acao === 'exclusão' ? 'red' : a.acao === 'inclusão' ? 'green' : ''}>${a.acao}</${Badge}>` }, { k: 'resumo', t: 'Resumo' }]}/></${Card}>
    </div>`;
  }

  /* ---------- Preferências ---------- */
  function Preferencias() {
    DB.useDB();
    const [nome, setNome] = useState(DB.cfg('usuarioNome', ''));
    const recarregar = async () => {
      if (!await UI.confirmar('Substituir TODOS os dados atuais pela base de estruturação (R17 + planilha 2026)?\nTodas as inclusões e alterações feitas no CRM serão perdidas. Gere um backup antes.', { perigo: true, palavra: 'RECARREGAR', ok: 'Recarregar base' })) return;
      if (!window.CRM_SEED) await U.carregarScript('data/base_estruturacao.js');
      const s = JSON.parse(JSON.stringify(window.CRM_SEED.stores)); s.config = (s.config || []).concat(DB.all('config').filter(c => ['usuarioNome', 'ultimoBackup'].includes(c.k)));
      s.auditoria = [{ id: U.uid('aud'), store: 'sistema', registroId: '-', acao: 'carga inicial', resumo: 'Base de estruturação recarregada', usuario: DB.usuarioAtual(), data: U.agora() }];
      await DB.substituirTudo(s); UI.toast('Base de estruturação recarregada.', 'ok');
    };
    const apagar = async () => { if (!await UI.confirmar('Apagar TODOS os dados do CRM neste navegador?\nEsta ação não pode ser desfeita sem um backup.', { perigo: true, palavra: 'APAGAR', ok: 'Apagar tudo' })) return; await DB.apagarTudo(); UI.toast('Dados apagados.', 'ok'); CRM.irPara('dashboard'); };
    return html`<div class="grid g2" style=${{ alignItems: 'start' }}>
      <${Card} title="Identificação do usuário" sub="Nome gravado no histórico de alterações deste computador">
        <div class="row" style=${{ flexWrap: 'nowrap' }}><${Sel} value=${nome} onChange=${setNome} options=${R.usuarios().map(u => u.nome)} placeholder="Selecione seu nome"/><${Btn} v="primary" onClick=${() => { DB.setCfg('usuarioNome', nome); UI.toast('Usuário definido: ' + (nome || '—'), 'ok'); }}>Salvar</${Btn}></div>
        <div class="small muted mt">Atual: ${DB.cfg('usuarioNome', '') || 'não definido'}. O filtro "Visão" no topo é independente e serve para ver o CRM como um vendedor específico.</div>
      </${Card}>
      <${Card} title="Modo administrador" sub="Libera exclusão definitiva de propostas e de clientes sem vínculos">
        <${Check} checked=${DB.cfg('admin', false)} onChange=${v => { DB.setCfg('admin', v); UI.toast(v ? 'Modo administrador ativado.' : 'Modo administrador desativado.'); }} label="Ativar modo administrador"/>
        <div class="small muted mt">Fora deste modo, registros são arquivados ou inativados (o histórico é preservado).</div>
      </${Card}>
      <${Card} title="Base de estruturação" sub="Clientes, histórico e STO do CRM R17 + propostas 2026 da planilha">
        <p class="small muted" style=${{ marginTop: 0 }}>Use para voltar ao estado inicial de validação do layout. Substitui todos os dados.</p><${Btn} icon="refresh" onClick=${recarregar}>Recarregar base de estruturação</${Btn}>
      </${Card}>
      <${Card} title="Apagar dados"><p class="small muted" style=${{ marginTop: 0 }}>Remove todos os registros deste navegador.</p><${Btn} v="danger" icon="trash" onClick=${apagar}>Apagar todos os dados</${Btn}></${Card}>
    </div>`;
  }

  Object.assign(CRM.ROTAS, { 'sistema/backup': Backup, 'sistema/importar': Importar, 'sistema/validacao': Validacao, 'sistema/auditoria': Auditoria, 'sistema/preferencias': Preferencias });
})();
