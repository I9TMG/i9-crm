/* =========================================================
   Aplicação: barra lateral, navegação, cabeçalho e janelas
   ========================================================= */
(function () {
  const { html } = CRM.U; const U = CRM.U, DB = CRM.DB, R = CRM.R, UI = CRM.UI;
  const { useState, useEffect } = React;
  const { Icon, Btn } = UI;
  CRM.ROTAS = CRM.ROTAS || {};

  /* ---------- Estrutura de navegação ---------- */
  const MENU = [
    { sec: 'COMERCIAL' },
    { k: 'dashboard', l: 'Dashboard', i: 'dashboard' },
    { k: 'cadastros', l: 'Cadastros', i: 'database', sub: [
      ['cadastros/clientes', 'Clientes'], ['cadastros/usuarios', 'Vendedores e usuários'], ['cadastros/produto', 'Produtos e serviços'],
      ['cadastros/equipamentos', 'Equipamentos'], ['cadastros/segmento', 'Segmentos'], ['cadastros/etapa', 'Etapas comerciais'],
      ['cadastros/origem', 'Origens do lead'], ['cadastros/motivoPerda', 'Motivos de perda'], ['cadastros/atividades', 'Tipos de atividade e visita'],
      ['cadastros/status', 'Status e listas auxiliares'], ['cadastros/categoriaContrato', 'Categorias de contrato'], ['cadastros/sto', 'Listas do STO'],
      ['cadastros/posvenda', 'Pós-venda (cadência)'], ['cadastros/metas', 'Metas de vendas']] },
    { k: 'sto', l: 'STO', i: 'wrench' },
    { k: 'propostas', l: 'Propostas', i: 'file', sub: [['propostas/controle', 'Controle de propostas'], ['propostas/indicadores', 'Indicadores'], ['propostas/radar', 'Radar de prazos']] },
    { k: 'capex', l: 'CAPEX', i: 'trending', sub: [['capex/controle', 'Controle de propostas CAPEX'], ['capex/indicadores', 'Indicadores']] },
    { k: 'funil', l: 'Funil de Vendas', i: 'columns', sub: [['funil/kanban', 'Kanban'], ['funil/indicadores', 'Indicadores']] },
    { k: 'prospeccao', l: 'Prospecção', i: 'compass', sub: [['prospeccao/visitas', 'Prospecções'], ['prospeccao/indicadores', 'Indicadores']] },
    { k: 'clientes', l: 'Clientes', i: 'building', sub: [['clientes/lista', 'Clientes'], ['clientes/indicadores', 'Indicadores']] },
    { k: 'agenda', l: 'Agenda', i: 'calendar', sub: [['agenda/calendario', 'Calendário'], ['agenda/followup', 'Follow-up'], ['agenda/posvenda', 'Pós-vendas'], ['agenda/visitas', 'Visitas']] },
    { k: 'contratos', l: 'Contratos', i: 'contract', sub: [['contratos/lista', 'Contratos'], ['contratos/indicadores', 'Indicadores']] },
    { sec: 'SISTEMA' },
    { k: 'sistema', l: 'Backup e dados', i: 'shield', sub: [['sistema/backup', 'Backup e restauração'], ['sistema/importar', 'Importar / exportar'], ['sistema/validacao', 'Validação de dados'], ['sistema/auditoria', 'Histórico de alterações'], ['sistema/preferencias', 'Preferências']] },
  ];
  const PADRAO = { cadastros: 'cadastros/clientes', propostas: 'propostas/controle', capex: 'capex/controle', funil: 'funil/kanban', prospeccao: 'prospeccao/visitas', clientes: 'clientes/lista', agenda: 'agenda/calendario', contratos: 'contratos/lista', sistema: 'sistema/backup' };
  const rotaAtual = () => { const h = (window.location.hash || '').replace(/^#\/?/, ''); return h || 'dashboard'; };
  const resolver = r => PADRAO[r] || r;
  const tituloDe = r => { for (const m of MENU) { if (m.k === r) return [m.l, '']; if (m.sub) { const s = m.sub.find(x => x[0] === r); if (s) return [s[1], m.l]; } } return ['', '']; };

  function Sidebar({ rota, aberto, fechar }) {
    DB.useDB();
    const [exp, setExp] = useState(() => ({ [rota.split('/')[0]]: true }));
    useEffect(() => setExp({ [rota.split('/')[0]]: true }), [rota]);
    const atrasadas = DB.all('atividades').filter(a => R.atrasada(a) && R.doUsuario(a, 'responsavelId')).length;
    return html`<aside class=${'sidebar' + (aberto ? ' open' : '')}>
      <div class="brand"><img src="assets/logo.jpg" alt="I9 TMG"/><div><b>CRM Comercial</b><span>I9 TMG</span></div></div>
      <nav class="nav">${MENU.map((m, i) => m.sec ? html`<div key=${i} class="nav-section">${m.sec}</div>` : html`<div key=${m.k}>
        <button class=${'nav-item' + (rota.split('/')[0] === m.k ? ' active' : '')} onClick=${() => { if (m.sub) { setExp(e => ({ ...e, [m.k]: !e[m.k] })); if (rota.split('/')[0] !== m.k) { CRM.irPara(PADRAO[m.k]); fechar(); } } else { CRM.irPara(m.k); fechar(); } }}>
          <${Icon} n=${m.i} s=${17}/><span>${m.l}</span>
          ${m.k === 'agenda' && atrasadas > 0 && html`<span class="count" title=${atrasadas + ' atividade(s) atrasada(s)'} style=${{ marginLeft: 'auto' }}>${atrasadas}</span>`}
          ${m.sub && html`<span class=${'chev' + (exp[m.k] ? ' open' : '')} style=${{ marginLeft: m.k === 'agenda' && atrasadas ? 4 : 'auto' }}><${Icon} n="right" s=${14}/></span>`}
        </button>
        ${m.sub && exp[m.k] && html`<div class="nav-sub">${m.sub.map(s => html`<button key=${s[0]} class=${'nav-item' + (rota === s[0] ? ' active' : '')} onClick=${() => { CRM.irPara(s[0]); fechar(); }}>${s[1]}</button>`)}</div>`}
      </div>`)}</nav>
      <div class="foot">Dados salvos neste navegador · <a href="#/sistema/backup">Backup</a></div>
    </aside>`;
  }

  function Topbar({ rota, abrirMenu }) {
    DB.useDB();
    const [t, sec] = tituloDe(rota);
    const vendo = R.vendoComo(); const oculto = DB.cfg('oculto', false);
    const ultimo = DB.cfg('ultimoBackup', ''); const diasBk = ultimo ? U.dias(ultimo.slice(0, 10), U.hoje()) : null;
    return html`<header class="topbar">
      <button class="btn ghost icon menu-btn" onClick=${abrirMenu} title="Menu"><${Icon} n="menu"/></button>
      <div><div class="crumb">${sec || 'Comercial'}</div><h1>${t}</h1></div>
      <div class="right">
        ${!DB.vazio() && (diasBk === null || diasBk >= 7) && html`<${Btn} sm v="ghost" icon="alert" onClick=${() => CRM.irPara('sistema/backup')} title="Recomenda-se fazer backup semanal">${diasBk === null ? 'Sem backup' : 'Backup há ' + diasBk + ' dias'}</${Btn}>`}
        <div class="row" style=${{ gap: 6, flexWrap: 'nowrap' }} title="Filtra todos os módulos pelo vendedor selecionado (visão, não login)">
          <span class="small muted nowrap">Visão</span>
          <select class="sel" style=${{ minHeight: 30, padding: '4px 8px', width: 190, background: vendo ? 'var(--navy-soft)' : '#fff' }} value=${vendo} onChange=${e => DB.setCfg('vendoComo', e.target.value)}>
            <option value="">Gestão (todos)</option>${R.usuarios().map(u => html`<option key=${u.id} value=${u.id}>${u.nome}</option>`)}
          </select></div>
        <${Btn} sm v=${oculto ? 'accent' : ''} icon=${oculto ? 'eyeoff' : 'eye'} onClick=${() => DB.setCfg('oculto', !oculto)} title="Modo apresentação: oculta valores em R$">${oculto ? 'Valores ocultos' : 'Ocultar R$'}</${Btn}>
      </div></header>`;
  }

  /** Host de janelas abertas via CRM.abrir(tipo, props) */
  function ModalHost() {
    const [pilha, setPilha] = useState([]);
    useEffect(() => { const f = e => setPilha(p => p.concat({ k: Math.random(), ...e.detail })); window.addEventListener('crm-abrir', f); return () => window.removeEventListener('crm-abrir', f); }, []);
    return html`${pilha.map(m => { const C = CRM.MODAIS[m.tipo]; if (!C) return null; return html`<${C} key=${m.k} ...${m.props} onClose=${() => setPilha(p => p.filter(x => x.k !== m.k))}/>`; })}`;
  }

  /** Tela inicial quando o banco está vazio. */
  function Boas() {
    const [carregando, setCarregando] = useState(false);
    const carregarBase = async (soCadastros) => {
      setCarregando(true);
      try {
        if (!window.CRM_SEED) await U.carregarScript('data/base_estruturacao.js');
        const s = JSON.parse(JSON.stringify(window.CRM_SEED.stores));
        const base = soCadastros ? { listas: s.listas, usuarios: s.usuarios, equipamentos: s.equipamentos, metas: [], config: s.config } : s;
        base.auditoria = [{ id: U.uid('aud'), store: 'sistema', registroId: '-', acao: 'carga inicial', resumo: soCadastros ? 'Cadastros básicos (listas, usuários, equipamentos)' : window.CRM_SEED.descricao, usuario: 'Sistema', data: U.agora() }];
        await DB.substituirTudo(base);
        UI.toast(soCadastros ? 'Cadastros básicos carregados.' : 'Base de estruturação carregada.', 'ok');
      } catch (e) { console.error(e); UI.toast('Não foi possível carregar a base: ' + e.message, 'err'); }
      setCarregando(false);
    };
    return html`<div style=${{ maxWidth: 760, margin: '40px auto' }}><div class="card"><div class="card-b" style=${{ padding: 28 }}>
      <div class="row" style=${{ gap: 14 }}><img src="assets/logo.jpg" width="56"/><div><h2 style=${{ margin: 0, color: 'var(--navy)' }}>Boas-vindas ao CRM Comercial I9 TMG</h2><div class="muted">O armazenamento deste navegador está vazio. Escolha como iniciar:</div></div></div>
      <div class="grid g3 mt">
        <div class="card"><div class="card-b"><b>Base de estruturação</b><p class="small muted">Clientes, sedes, contatos, histórico 2022–2025 e STO do CRM R17 + propostas 2026 da planilha Controle_de_Propostas_2026. Para validar o layout e os indicadores.</p><${Btn} v="primary" icon="database" disabled=${carregando} onClick=${() => carregarBase(false)}>${carregando ? 'Carregando…' : 'Carregar base'}</${Btn}></div></div>
        <div class="card"><div class="card-b"><b>Somente cadastros básicos</b><p class="small muted">Listas (segmentos, etapas, status…), vendedores e catálogo de equipamentos — sem clientes nem propostas.</p><${Btn} icon="list" disabled=${carregando} onClick=${() => carregarBase(true)}>Iniciar vazio</${Btn}></div></div>
        <div class="card"><div class="card-b"><b>Restaurar backup</b><p class="small muted">Recupere um arquivo .json gerado em "Backup e dados".</p><${Btn} icon="upload" disabled=${carregando} onClick=${() => CRM.restaurarBackup && CRM.restaurarBackup()}>Escolher arquivo</${Btn}></div></div>
      </div></div></div></div>`;
  }

  /** Barreira de erro: uma falha em uma página não derruba o sistema inteiro. */
  class Barreira extends React.Component {
    constructor(p) { super(p); this.state = { erro: null }; }
    static getDerivedStateFromError(erro) { return { erro }; }
    componentDidCatch(e, info) { console.error('Erro na página', e, info); }
    render() {
      if (!this.state.erro) return this.props.children;
      return html`<div class="card"><div class="card-b"><div class="notice err"><${Icon} n="alert" s=${16}/><div><b>Esta tela encontrou um erro e não pôde ser exibida.</b><div class="small">${String(this.state.erro && this.state.erro.message || this.state.erro)}</div><div class="small muted mt">Os dados não foram afetados. Tente outra tela ou recarregue a página (F5).</div></div></div>
        <div class="mt"><${Btn} onClick=${() => this.setState({ erro: null })}>Tentar novamente</${Btn}></div></div></div>`;
    }
  }

  function App() {
    DB.useDB();
    const [rota, setRota] = useState(resolver(rotaAtual()));
    const [menu, setMenu] = useState(false);
    useEffect(() => { const f = () => { const r = resolver(rotaAtual()); if (r !== rotaAtual()) window.location.replace('#/' + r); setRota(r); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); f(); return () => window.removeEventListener('hashchange', f); }, []);
    U.oculto = !!DB.cfg('oculto', false);
    const Pagina = CRM.ROTAS[rota];
    const vazio = DB.vazio() && !rota.startsWith('sistema');
    return html`<div class="app">
      <${Sidebar} rota=${rota} aberto=${menu} fechar=${() => setMenu(false)}/>
      ${menu && html`<div class="overlay" onClick=${() => setMenu(false)}></div>`}
      <div class="main"><${Topbar} rota=${rota} abrirMenu=${() => setMenu(true)}/>
        <main class="content" key=${rota}>${vazio ? html`<${Boas}/>` : Pagina ? html`<${Barreira} key=${rota}><${Pagina} rota=${rota}/></${Barreira}>` : html`<${UI.Empty} icon="alert" title="Página não encontrada">Use o menu lateral.</${UI.Empty}>`}</main>
      </div>
      <${Barreira}><${ModalHost}/></${Barreira}><${UI.ToastHost}/><${UI.ConfirmHost}/>
    </div>`;
  }

  /* ---------- Inicialização ---------- */
  const raiz = ReactDOM.createRoot(document.getElementById('root'));
  DB.init().then(() => raiz.render(html`<${App}/>`)).catch(e => {
    console.error(e);
    document.getElementById('root').innerHTML = '<div class="boot"><img src="assets/logo.jpg" width="64"><p><b>Não foi possível abrir o armazenamento local.</b></p><p>' + (e && e.message || e) + '</p><p class="small">Use o Microsoft Edge ou Google Chrome atualizados e não utilize janela anônima.</p></div>';
  });
  window.addEventListener('error', e => { if (e.message && !/ResizeObserver/.test(e.message)) UI.toast('Erro: ' + e.message, 'err'); });
})();
