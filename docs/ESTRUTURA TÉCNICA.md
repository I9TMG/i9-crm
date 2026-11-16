# CRM Comercial I9 TMG — Estrutura técnica

## Arquivos

```
CRM_I9TMG/
├── index.html                 ← abre o sistema (duplo clique)
├── assets/logo.jpg            ← logo oficial (cores #013D59 e #F46F22)
├── css/tema.css               ← identidade visual (Segoe UI, paleta da logo)
├── data/base_estruturacao.js  ← base inicial (só é lida ao clicar em "Carregar base")
├── vendor/                    ← React 18, Recharts 2, htm, SheetJS (offline)
├── docs/                      ← manual de uso e esta documentação
└── js/
    ├── core/
    │   ├── util.js            ← formatação, datas, regiões, CNPJ, Excel
    │   ├── db.js              ← IndexedDB + cache em memória + auditoria + backup
    │   ├── regras.js          ← regras de negócio (resultado, situação, consumo, códigos…)
    │   ├── ui.js              ← componentes (tabela, filtros, modais, combos, ícones)
    │   ├── graficos.js        ← gráficos com a paleta da marca
    │   └── formularios.js     ← cadastro mestre de clientes e atividade (compartilhados)
    ├── modulos/               ← um arquivo por módulo
    └── app.js                 ← barra lateral, rotas, cabeçalho
```

Não há etapa de compilação: os arquivos JavaScript são carregados diretamente pelo `index.html`, na ordem acima. As telas usam `htm` (sintaxe parecida com HTML) sobre React.

## Banco de dados (IndexedDB `crm_i9tmg`)

Cada tabela é um object store, com chave `id` (em `config`, a chave é `k`). Os registros guardam **somente o ID** dos cadastros relacionados.

| Tabela | Conteúdo | Principais vínculos |
|---|---|---|
| `listas` | Cadastros simples: segmento, produto, origem, etapa, statusProposta, statusElaboracao, statusCapex, motivoPerda, tipoAtividade, tipoVisita, statusProspeccao, faixaValor, categoriaContrato, itemAluguel, itemManutencao, tipoProjeto, tipoFrete, tipoSede, areaContato, papelContato | campo `tipo` |
| `usuarios` | Vendedores e responsáveis | — |
| `equipamentos` | Catálogo do STO com premissas técnicas | `segmentoIds[]` |
| `clientes` / `sedes` / `contatos` | Cadastro mestre | sede → cliente; contato → cliente/sede |
| `metas` | Meta anual (geral ou por vendedor) | `vendedorId` |
| `oportunidades` | Funil (etapa, probabilidade, qualificação, histórico de etapas) | cliente, sede, contato, vendedor, prospecção |
| `propostas` | Comercial **e** CAPEX (campo `categoria`), valores por linha em `valores{produtoId: valor}` | oportunidade (obrigatória), STO, contrato (demanda) |
| `stos` | Solicitações técnicas | cliente, oportunidade, proposta, equipamentos |
| `prospeccoes` | Visitas/contatos; `empresa{}` quando ainda não é cliente | cliente, atividade (agenda), oportunidade gerada |
| `atividades` | Agenda: Follow-up, Visita, Pós-venda, Tarefa, Lembrete | cliente, proposta, oportunidade, prospecção, contrato |
| `contratos` | Guarda-chuva (teto, vigência) | cliente, proposta de origem; demandas = propostas com `contratoId` |
| `auditoria` | Registro de inclusões, alterações e exclusões | tabela + id |
| `config` | Preferências (backup, visão, modo admin, cadência de pós-venda) | — |

**Valores calculados (não gravados):** valor total da proposta, resultado (pelo status), situação da oportunidade (pelas propostas), consumo e saldo de contrato, região (pela UF), dias de elaboração, faixa de valor, agenda de pós-venda e todos os indicadores. Isso substitui as colunas auxiliares da planilha (AH–AS) e as abas "Funil de vendas" e "RADAR".

## Migração futura para servidor (multiusuário)

A estrutura já está normalizada, com IDs únicos e chaves estrangeiras, e pode ser levada a SharePoint Lists, Dataverse ou SQL. Os passos seriam:

1. Criar uma tabela por store, com as mesmas colunas.
2. Importar o backup `.json`, que já vem separado por tabela.
3. Substituir `js/core/db.js` por uma camada que leia e grave na API. As telas usam apenas `DB.all`, `DB.get`, `DB.save`, `DB.remove` e `DB.cfg`.

## Testes realizados (16/11/2026)

- **Navegação:** as 38 telas foram abertas com a base carregada, sem erros.
- **Testes funcionais automatizados no Edge:** 46 de 46 aprovados. Cobriram:
  - cadastro, validação, CNPJ duplicado/inválido e código automático;
  - proposta → oportunidade automática, valor por linha, follow-up e código duplicado;
  - aprovação → etapa, pós-venda e contrato com demandas e saldo;
  - duplicar, arquivar e arrastar no Kanban;
  - prospecção ↔ Agenda, conversão em cliente e atividade recorrente;
  - filtros, limpar filtros, seletor de ano e ordenação;
  - exportação para Excel, backup, validação, restauração e persistência após recarregar;
  - importação da planilha original (detecta códigos existentes);
  - modo "Ocultar R$" e visão por vendedor.
- **Janelas:** ficha do cliente (todas as abas), formulários e detalhes abertos sem erros. O layout responsivo foi verificado em 820 px.
