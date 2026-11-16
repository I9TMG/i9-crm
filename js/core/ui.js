/* =========================================================
   Componentes de interface reutilizáveis
   ========================================================= */
(function () {
  const { html, cmp } = CRM.U; const U = CRM.U;
  const { useState, useEffect, useRef, useMemo } = React;
  const UI = {};

  /* ---------- Ícones (traço fino, estilo minimalista) ---------- */
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    trending: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27L7.76 16.24l1.8-5.41a2 2 0 0 1 1.27-1.27z"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    contract: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    edit: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10.73 5.08A10.74 10.74 0 0 1 21.94 11.65a1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    restore: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    merge: '<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.17 2.87L4 22"/><path d="m20 22-5-5"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    life: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
  };
  UI.Icon = ({ n, s = 16, c, style }) => React.createElement('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: c || 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', style: Object.assign({ flex: '0 0 auto' }, style), dangerouslySetInnerHTML: { __html: P[n] || '' } });
  const Icon = UI.Icon;

  /* ---------- Básicos ---------- */
  UI.Btn = ({ children, onClick, v, sm, icon, title, disabled, type, style }) => html`<button type=${type || 'button'} class=${'btn ' + (v || '') + (sm ? ' sm' : '') + (!children ? ' icon' : '')} onClick=${onClick} title=${title} disabled=${disabled} style=${style}>${icon && html`<${Icon} n=${icon} s=${sm ? 14 : 15}/>`}${children}</button>`;
  UI.Badge = ({ children, c, title }) => html`<span class=${'badge ' + (c ? 'b-' + c : '')} title=${title}>${children}</span>`;
  UI.Seg = ({ value, onChange, options, acc }) => html`<div class="seg">${options.map(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return html`<button key=${String(v)} class=${(value === v ? 'on' : '') + (acc ? ' acc' : '')} onClick=${() => onChange(v)}>${l}</button>`; })}</div>`;
  UI.Tabs = ({ value, onChange, options }) => html`<div class="tabs">${options.map(o => html`<button key=${o.v} class=${value === o.v ? 'on' : ''} onClick=${() => onChange(o.v)}>${o.l}${o.n !== undefined ? html` <span class="muted small">(${o.n})</span>` : null}</button>`)}</div>`;
  UI.Card = ({ title, sub, right, children, pad = true, className, style }) => html`<div class=${'card ' + (className || '')} style=${style}>
    ${(title || right) && html`<div class="card-h"><div><h3>${title}</h3>${sub && html`<div class="sub">${sub}</div>`}</div><div class="right">${right}</div></div>`}
    ${pad ? html`<div class="card-b">${children}</div>` : children}</div>`;
  UI.Kpi = ({ label, value, foot, accent, icon, small, title }) => html`<div class=${'card kpi' + (accent ? ' accent' : '')} title=${title}>
    <div class="lbl">${icon && html`<${Icon} n=${icon} s=${14}/>`}${label}</div><div class=${'val' + (small ? ' sm' : '')}>${value}</div>${foot && html`<div class="foot">${foot}</div>`}</div>`;
  UI.Empty = ({ icon = 'box', title, children }) => html`<div class="empty"><${Icon} n=${icon} s=${34}/><div class="strong" style=${{ marginTop: 8, color: 'var(--text-2)' }}>${title}</div><div class="small" style=${{ marginTop: 4 }}>${children}</div></div>`;
  UI.Delta = ({ atual, anterior, inverso }) => {
    if (!anterior) return null; const d = (atual - anterior) / Math.abs(anterior); const bom = inverso ? d < 0 : d >= 0;
    return html`<span class=${bom ? 'delta-up' : 'delta-down'}>${d >= 0 ? '▲' : '▼'} ${U.pct(Math.abs(d), 0)}</span>`;
  };
  UI.Bar = ({ v, cor }) => html`<div class="bar"><i style=${{ width: Math.max(0, Math.min(100, v * 100)) + '%', background: cor }}></i></div>`;

  /* ---------- Formulário ---------- */
  UI.Field = ({ label, req, hint, err, children, c, className }) => html`<div class=${'field ' + (c ? 'c' + c : '') + ' ' + (className || '')}>
    ${label && html`<label>${label}${req && html`<span class="req">*</span>`}</label>`}${children}${err ? html`<span class="errmsg">${err}</span>` : hint && html`<span class="hint">${hint}</span>`}</div>`;
  UI.Inp = ({ value, onChange, type = 'text', placeholder, err, disabled, min, max, step, style, onKeyDown, autoFocus, list }) => html`<input class=${'inp' + (err ? ' err' : '')} type=${type} value=${value === null || value === undefined ? '' : value} placeholder=${placeholder} disabled=${disabled} min=${min} max=${max} step=${step} style=${style} onKeyDown=${onKeyDown} autoFocus=${autoFocus} list=${list}
     onChange=${e => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}/>`;
  UI.Txt = ({ value, onChange, placeholder, rows = 3 }) => html`<textarea class="ta" rows=${rows} value=${value || ''} placeholder=${placeholder} onChange=${e => onChange(e.target.value)}></textarea>`;
  UI.Sel = ({ value, onChange, options, placeholder = 'Selecione…', err, disabled, vazio = true, style }) => html`<select class=${'sel' + (err ? ' err' : '')} value=${value === null || value === undefined ? '' : value} disabled=${disabled} style=${style} onChange=${e => onChange(e.target.value)}>
    ${vazio && html`<option value="">${placeholder}</option>`}
    ${options.map(o => typeof o === 'object' ? html`<option key=${o.v} value=${o.v}>${o.l}</option>` : html`<option key=${o} value=${o}>${o}</option>`)}</select>`;
  UI.Check = ({ checked, onChange, label, disabled }) => html`<label class="chk"><input type="checkbox" checked=${!!checked} disabled=${disabled} onChange=${e => onChange(e.target.checked)}/>${label}</label>`;
  UI.Chips = ({ value = [], onChange, options }) => html`<div class="chips">${options.map(o => { const on = value.includes(o.v); return html`<button type="button" key=${o.v} class=${'chip' + (on ? ' on' : '')} onClick=${() => onChange(on ? value.filter(x => x !== o.v) : value.concat(o.v))}>${on && '✓ '}${o.l}</button>`; })}</div>`;
  UI.Money = ({ value, onChange, err, placeholder = '0,00', disabled }) => {
    const [txt, setTxt] = useState(value === null || value === undefined || value === '' ? '' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const [foco, setFoco] = useState(false);
    useEffect(() => { if (!foco) setTxt(value === null || value === undefined || value === '' ? '' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }, [value, foco]);
    return html`<input class=${'inp num' + (err ? ' err' : '')} value=${txt} placeholder=${placeholder} disabled=${disabled} inputMode="decimal"
      onFocus=${() => setFoco(true)} onBlur=${() => setFoco(false)}
      onChange=${e => { const t = e.target.value.replace(/[^\d,.-]/g, ''); setTxt(t); const n = t === '' ? null : Number(t.replace(/\./g, '').replace(',', '.')); onChange(isNaN(n) ? null : n); }}/>`;
  };

  /** Seleção com pesquisa (para listas longas, ex.: clientes). options: [{v,l,s,k}] */
  UI.Combo = ({ value, onChange, options, placeholder = 'Pesquisar…', err, disabled, acao }) => {
    const [aberto, setAberto] = useState(false); const [q, setQ] = useState(''); const [hl, setHl] = useState(0); const ref = useRef();
    const atual = options.find(o => o.v === value);
    const lista = useMemo(() => { const t = U.normTxt(q); return (t ? options.filter(o => (o.k || U.normTxt(o.l + ' ' + (o.s || ''))).includes(t)) : options).slice(0, 80); }, [q, options]);
    useEffect(() => { const f = e => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
    const escolher = o => { onChange(o ? o.v : ''); setAberto(false); setQ(''); };
    return html`<div class="combo" ref=${ref}>
      <input class=${'inp' + (err ? ' err' : '')} disabled=${disabled} placeholder=${atual ? '' : placeholder} value=${aberto ? q : atual ? atual.l : ''}
        onFocus=${() => { setAberto(true); setHl(0); }} onChange=${e => { setQ(e.target.value); setAberto(true); setHl(0); }}
        onKeyDown=${e => { if (e.key === 'ArrowDown') { setHl(h => Math.min(h + 1, lista.length - 1)); e.preventDefault(); } else if (e.key === 'ArrowUp') { setHl(h => Math.max(h - 1, 0)); e.preventDefault(); } else if (e.key === 'Enter') { if (lista[hl]) escolher(lista[hl]); e.preventDefault(); } else if (e.key === 'Escape') setAberto(false); }}/>
      ${value && !disabled && !aberto && html`<button type="button" class="clear" title="Limpar" onClick=${() => escolher(null)}><${Icon} n="x" s=${13}/></button>`}
      ${aberto && html`<div class="list">
        ${lista.length === 0 && html`<div class="opt muted">Nenhum resultado.</div>`}
        ${lista.map((o, i) => html`<div key=${o.v} class=${'opt' + (i === hl ? ' hl' : '')} onMouseDown=${e => { e.preventDefault(); escolher(o); }}><span>${o.l}</span>${o.s && html`<small>${o.s}</small>`}</div>`)}
        ${acao && html`<div class="opt" style=${{ borderTop: '1px solid var(--line-2)', color: 'var(--navy)', fontWeight: 600 }} onMouseDown=${e => { e.preventDefault(); setAberto(false); acao.onClick(q); }}><${Icon} n="plus" s=${13}/> ${acao.l}</div>`}
      </div>`}</div>`;
  };

  /* ---------- Modal ---------- */
  UI.Modal = ({ title, sub, onClose, children, footer, size, icon }) => {
    useEffect(() => { const f = e => { if (e.key === 'Escape') onClose && onClose(); }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
    return ReactDOM.createPortal(html`<div class="modal-bg" onMouseDown=${e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div class=${'modal ' + (size || '')} role="dialog">
        <div class="modal-h">${icon && html`<${Icon} n=${icon} s=${18} c="var(--orange)"/>`}<div style=${{ minWidth: 0 }}><h2>${title}</h2>${sub && html`<div class="sub">${sub}</div>`}</div>
          <div class="spacer"></div>${onClose && html`<button class="btn ghost icon" onClick=${onClose} title="Fechar (Esc)"><${Icon} n="x"/></button>`}</div>
        <div class="modal-b">${children}</div>
        ${footer && html`<div class="modal-f">${footer}</div>`}
      </div></div>`, document.body);
  };

  /* ---------- Toasts e confirmações (globais) ---------- */
  UI.toast = (msg, tipo) => window.dispatchEvent(new CustomEvent('crm-toast', { detail: { msg, tipo } }));
  UI.ToastHost = () => {
    const [l, setL] = useState([]);
    useEffect(() => {
      const add = (msg, tipo) => { const id = Math.random(); setL(x => x.concat({ id, msg, tipo })); setTimeout(() => setL(x => x.filter(t => t.id !== id)), tipo === 'err' ? 6000 : 3200); };
      const f = e => add(e.detail.msg, e.detail.tipo); const g = e => add(e.detail, 'err');
      window.addEventListener('crm-toast', f); window.addEventListener('crm-erro', g);
      return () => { window.removeEventListener('crm-toast', f); window.removeEventListener('crm-erro', g); };
    }, []);
    return html`<div class="toasts">${l.map(t => html`<div key=${t.id} class=${'toast ' + (t.tipo || '')}><${Icon} n=${t.tipo === 'err' ? 'alert' : 'check'} s=${15}/>${t.msg}</div>`)}</div>`;
  };
  /** Confirmação: UI.confirmar('Texto', {titulo, perigo, palavra, ok}) → Promise<boolean> */
  UI.confirmar = (msg, opt = {}) => new Promise(ok => window.dispatchEvent(new CustomEvent('crm-confirm', { detail: { msg, opt, ok } })));
  UI.ConfirmHost = () => {
    const [c, setC] = useState(null); const [w, setW] = useState('');
    useEffect(() => { const f = e => { setW(''); setC(e.detail); }; window.addEventListener('crm-confirm', f); return () => window.removeEventListener('crm-confirm', f); }, []);
    if (!c) return null;
    const fim = v => { c.ok(v); setC(null); };
    const bloqueado = c.opt.palavra && w.trim().toUpperCase() !== c.opt.palavra;
    return html`<${UI.Modal} size="sm" title=${c.opt.titulo || 'Confirmar'} icon=${c.opt.perigo ? 'alert' : 'check'} onClose=${() => fim(false)}
      footer=${html`<div class="spacer"></div><${UI.Btn} onClick=${() => fim(false)}>Cancelar</${UI.Btn}><${UI.Btn} v=${c.opt.perigo ? 'danger' : 'primary'} disabled=${bloqueado} onClick=${() => fim(true)}>${c.opt.ok || 'Confirmar'}</${UI.Btn}>`}>
      <div style=${{ whiteSpace: 'pre-line' }}>${c.msg}</div>
      ${c.opt.palavra && html`<div class="mt"><${UI.Field} label=${'Digite ' + c.opt.palavra + ' para confirmar'}><${UI.Inp} value=${w} onChange=${setW} autoFocus=${true}/></${UI.Field}></div>`}
    </${UI.Modal}>`;
  };

  /* ---------- Tabela de dados (ordenação + paginação) ---------- */
  // cols: [{k, t, grp, v:(r)=>valor p/ ordenar, r:(r)=>render, al:'r', w, nosort}]
  UI.Table = ({ cols, rows, onRow, pageSize = 50, sortInicial, rowClass, footer, vazio = 'Nenhum registro encontrado.', compact }) => {
    const [sort, setSort] = useState(sortInicial || null); const [pg, setPg] = useState(0);
    useEffect(() => setPg(0), [rows.length]);
    const ord = useMemo(() => {
      if (!sort) return rows; const c = cols.find(x => x.k === sort.k); if (!c) return rows;
      const get = c.v || (r => r[c.k]);
      return rows.slice().sort((a, b) => { const x = cmp(get(a), get(b)); return sort.d === 'desc' ? -x : x; });
    }, [rows, sort, cols]);
    const tot = Math.max(1, Math.ceil(ord.length / pageSize)); const p = Math.min(pg, tot - 1);
    const vis = ord.slice(p * pageSize, (p + 1) * pageSize);
    const clicar = c => { if (c.nosort) return; setSort(s => !s || s.k !== c.k ? { k: c.k, d: 'asc' } : s.d === 'asc' ? { k: c.k, d: 'desc' } : null); };
    let ultimoGrp = null;
    return html`<div>
      <div class="tbl-wrap"><table class="tbl" style=${compact ? { fontSize: 12.3 } : null}>
        <thead><tr>${cols.map(c => { const mostraGrp = c.grp && c.grp !== ultimoGrp; ultimoGrp = c.grp || ultimoGrp; return html`<th key=${c.k} class=${c.nosort ? '' : 'sortable'} style=${{ textAlign: c.al === 'r' ? 'right' : 'left', width: c.w }} onClick=${() => clicar(c)}>
          ${c.grp && html`<span class="grp" style=${{ visibility: mostraGrp ? 'visible' : 'hidden' }}>${c.grp}</span>`}${c.t}${sort && sort.k === c.k ? (sort.d === 'asc' ? ' ▲' : ' ▼') : ''}</th>`; })}</tr></thead>
        <tbody>${vis.length === 0 ? html`<tr><td colspan=${cols.length}><div class="empty">${vazio}</div></td></tr>` :
          vis.map((r, i) => html`<tr key=${r.id || i} class=${(onRow ? 'click ' : '') + (rowClass ? rowClass(r) || '' : '')} onClick=${onRow ? (e) => { if (!e.target.closest('button,a,input,select')) onRow(r); } : null}>
            ${cols.map(c => html`<td key=${c.k} class=${c.k === 'acoes' ? 'actions' : ''} style=${{ textAlign: c.al === 'r' ? 'right' : 'left' }}>${c.r ? c.r(r) : r[c.k]}</td>`)}</tr>`)}</tbody>
        ${footer && html`<tfoot><tr>${footer}</tr></tfoot>`}
      </table></div>
      ${ord.length > pageSize && html`<div class="pager"><span>${p * pageSize + 1}–${Math.min(ord.length, (p + 1) * pageSize)} de ${U.int(ord.length)}</span><div class="spacer"></div>
        <${UI.Btn} sm icon="left" disabled=${p === 0} onClick=${() => setPg(p - 1)}/><span>Página ${p + 1} de ${tot}</span><${UI.Btn} sm icon="right" disabled=${p >= tot - 1} onClick=${() => setPg(p + 1)}/></div>`}
    </div>`;
  };

  /* ---------- Filtros ---------- */
  UI.useFiltros = (inicial, chave) => {
    const salvo = chave ? (() => { try { return JSON.parse(sessionStorage.getItem('flt:' + chave) || 'null'); } catch (e) { return null; } })() : null;
    const [f, setF] = useState(salvo ? { ...inicial, ...salvo } : inicial);
    useEffect(() => { if (chave) sessionStorage.setItem('flt:' + chave, JSON.stringify(f)); }, [f]);
    const set = (k, v) => setF(x => ({ ...x, [k]: v }));
    const limpar = () => setF(inicial);
    const ativos = Object.keys(inicial).filter(k => JSON.stringify(f[k]) !== JSON.stringify(inicial[k])).length;
    return { f, set, limpar, ativos, setF };
  };
  UI.Filtros = ({ children, ativos, limpar, right }) => html`<div class="filters">${children}<div class="spacer"></div>
    ${right}${limpar && html`<${UI.Btn} sm v="ghost" icon="x" disabled=${!ativos} onClick=${limpar} title="Limpar filtros">Limpar${ativos ? ' (' + ativos + ')' : ''}</${UI.Btn}>`}</div>`;
  UI.FSel = ({ label, value, onChange, options, todos = 'Todos' }) => html`<${UI.Field} label=${label}><${UI.Sel} value=${value} onChange=${onChange} options=${options} placeholder=${todos}/></${UI.Field}>`;
  UI.FBusca = ({ value, onChange, placeholder = 'Pesquisar…', label = 'Pesquisa' }) => html`<${UI.Field} label=${label} className="wide"><div class="search"><${Icon} n="search" s=${14}/><${UI.Inp} value=${value} onChange=${onChange} placeholder=${placeholder}/></div></${UI.Field}>`;
  UI.FPeriodo = ({ ini, fim, onIni, onFim, label = 'Período' }) => html`<${UI.Field} label=${label}><div class="row" style=${{ flexWrap: 'nowrap', gap: 4 }}><${UI.Inp} type="date" value=${ini} onChange=${onIni} style=${{ minWidth: 0 }}/><span class="muted">a</span><${UI.Inp} type="date" value=${fim} onChange=${onFim} style=${{ minWidth: 0 }}/></div></${UI.Field}>`;
  /** Seletor segmentado de ano (com "Todos"). */
  UI.Anos = ({ value, onChange, anos, todos = true }) => html`<${UI.Seg} value=${value} onChange=${onChange} acc=${true} options=${(todos ? [{ v: 'todos', l: 'Todos' }] : []).concat(anos.map(a => ({ v: a, l: String(a) })))}/>`;

  /* ---------- Exibição ---------- */
  const COR_STATUS = {
    'Recebida': 'blue', 'Entregue/Enviado': 'navy', 'Aprovada': 'green', 'Reprovada': 'red', 'Declinada': 'amber', 'Cancelada': 'red',
    'Não iniciado': '', 'Em andamento': 'blue', 'Concluído': 'green', 'Aberta': 'blue', 'Ganha': 'green', 'Perdida': 'red',
    'A fazer': 'amber', 'Feito': 'green', 'Cancelado': '', 'Ativo': 'green', 'Inativo': '', 'Prospect': 'orange', 'Vigente': 'green', 'Vencido': 'red', 'Encerrado': '', 'A iniciar': 'blue',
    'Em elaboração': 'blue', 'Proposta emitida': 'green', 'Alta': 'red', 'Média': 'amber', 'Baixa': '', 'A visitar': 'amber', 'Contatado': 'blue', 'Visitado': 'green', 'Evoluiu': 'navy', 'Descartado': '',
    aberta: 'blue', ganha: 'green', perdida: 'red', Capex: 'violet',
  };
  UI.Status = ({ s, label }) => s ? html`<${UI.Badge} c=${COR_STATUS[s] || ''}>${label || (CRM.R.ROTULO_RESULTADO[s] || s)}</${UI.Badge}>` : html`<span class="muted">—</span>`;
  UI.Money$ = ({ v }) => html`<span class="num nowrap">${v === null || v === undefined || v === '' ? html`<span class="muted">—</span>` : U.brl(v)}</span>`;

  CRM.UI = UI;
})();
