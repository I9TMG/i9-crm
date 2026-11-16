/* =========================================================
   Utilitários gerais (formatação, datas, ids, exportação)
   ========================================================= */
window.CRM = window.CRM || {};
CRM.ROTAS = CRM.ROTAS || {};   // páginas registradas pelos módulos
CRM.MODAIS = CRM.MODAIS || {}; // janelas registradas pelos módulos
(function () {
  const U = {};
  U.html = htm.bind(React.createElement);
  U.oculto = false; // modo apresentação: oculta valores em R$

  U.uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  U.norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  U.normTxt = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  U.soDigitos = s => (s || '').toString().replace(/\D/g, '');
  U.num = v => { if (v === null || v === undefined || v === '') return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
  U.numOrNull = v => { if (v === null || v === undefined || v === '') return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

  /* ---- Moeda / números ---- */
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  U.brl = n => U.oculto ? 'R$ •••' : fmtBRL.format(U.num(n));
  U.brlK = n => {
    if (U.oculto) return 'R$ •••';
    const v = U.num(n), a = Math.abs(v);
    if (a >= 1e9) return 'R$ ' + (v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' bi';
    if (a >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    if (a >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return fmtBRL.format(v);
  };
  U.axisK = v => U.oculto ? '' : (Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : Math.abs(v) >= 1e3 ? (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil' : String(v));
  U.int = n => U.num(n).toLocaleString('pt-BR');
  U.pct = (n, d = 1) => (isFinite(n) ? (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '0') + '%';
  U.div = (a, b) => (b ? a / b : 0);

  /* ---- Datas (ISO yyyy-mm-dd) ---- */
  const pad = n => String(n).padStart(2, '0');
  U.iso = d => { const x = d instanceof Date ? d : new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
  U.hoje = () => U.iso(new Date());
  U.agora = () => new Date().toISOString();
  U.str = v => (v === null || v === undefined ? '' : v instanceof Date ? U.iso(v) : String(v));
  U.parse = s => { s = U.str(s); if (!s) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  U.data = s => { s = U.str(s); if (!s) return '—'; const p = s.slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
  U.dataHora = s => { if (!s) return '—'; const d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  U.addDias = (s, n) => { const d = U.parse(s) || new Date(); d.setDate(d.getDate() + n); return U.iso(d); };
  U.addMeses = (s, n) => { const d = U.parse(s) || new Date(); d.setMonth(d.getMonth() + n); return U.iso(d); };
  U.dias = (a, b) => { const x = U.parse(a), y = U.parse(b); return x && y ? Math.round((y - x) / 86400000) : null; };
  U.ano = s => { s = U.str(s); return s ? Number(s.slice(0, 4)) : null; };
  U.mes = s => { s = U.str(s); return s ? Number(s.slice(5, 7)) : null; };
  U.MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  U.MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  U.DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  U.inicioSemana = s => { const d = U.parse(s); d.setDate(d.getDate() - d.getDay()); return U.iso(d); };
  U.dataValida = s => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && Number(s.slice(0, 4)) >= 1990 && Number(s.slice(0, 4)) <= 2100);
  U.noPeriodo = (s, ini, fim) => { s = U.str(s).slice(0, 10); return !!s && (!ini || s >= ini) && (!fim || s <= fim); };

  /* ---- Regiões ---- */
  U.UF_REGIAO = { RS: 'Sul', SC: 'Sul', PR: 'Sul', SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste', DF: 'Centro-Oeste', BA: 'Nordeste', PE: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', RN: 'Nordeste', PB: 'Nordeste', AL: 'Nordeste', SE: 'Nordeste', PI: 'Nordeste', PA: 'Norte', AM: 'Norte', RO: 'Norte', AC: 'Norte', RR: 'Norte', AP: 'Norte', TO: 'Norte' };
  U.UFS = Object.keys(U.UF_REGIAO).sort();
  U.REGIOES = ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte', 'Exterior'];
  U.regiao = uf => (uf ? U.UF_REGIAO[uf.toUpperCase()] || 'Exterior' : '');

  /* ---- CNPJ ---- */
  U.cnpjValido = c => {
    const s = U.soDigitos(c); if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
    const calc = n => { let sum = 0, pos = n - 7; for (let i = n; i >= 1; i--) { sum += Number(s.charAt(n - i)) * pos--; if (pos < 2) pos = 9; } const r = sum % 11; return r < 2 ? 0 : 11 - r; };
    return calc(12) === Number(s.charAt(12)) && calc(13) === Number(s.charAt(13));
  };
  U.fmtCNPJ = c => { const s = U.soDigitos(c); return s.length === 14 ? s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : c || ''; };

  /* ---- Ordenação / agrupamento ---- */
  U.groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
  U.sum = (arr, f) => arr.reduce((a, x) => a + U.num(f ? f(x) : x), 0);
  U.uniq = arr => [...new Set(arr)];
  U.cmp = (a, b) => {
    if (a === b) return 0; if (a === null || a === undefined || a === '') return 1; if (b === null || b === undefined || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
  };
  U.iniciais = s => (s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ---- Download / exportação ---- */
  U.download = (nome, conteudo, tipo = 'application/octet-stream') => {
    const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  // abas: [{nome, colunas:[{t, v:(row)=>valor}], linhas:[]}]
  U.exportarExcel = (arquivo, abas) => {
    const wb = XLSX.utils.book_new();
    abas.forEach(a => {
      const dados = [a.colunas.map(c => c.t)].concat(a.linhas.map(r => a.colunas.map(c => { const v = c.v(r); return v === undefined || v === null ? '' : v; })));
      const ws = XLSX.utils.aoa_to_sheet(dados);
      ws['!cols'] = a.colunas.map(c => ({ wch: Math.min(48, Math.max(10, (c.t || '').length + 2, c.w || 0)) }));
      XLSX.utils.book_append_sheet(wb, ws, (a.nome || 'Dados').slice(0, 31).replace(/[\\/?*\[\]:]/g, '-'));
    });
    XLSX.writeFile(wb, arquivo);
  };
  U.lerArquivo = (file, modo = 'text') => new Promise((ok, err) => {
    const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = err;
    modo === 'buffer' ? r.readAsArrayBuffer(file) : r.readAsText(file, 'utf-8');
  });
  U.escolherArquivo = accept => new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept || '';
    i.onchange = () => ok(i.files[0] || null); i.click();
  });
  U.carregarScript = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = err; document.body.appendChild(s); });

  CRM.U = U;
})();
