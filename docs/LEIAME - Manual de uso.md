# CRM Comercial I9 TMG — Manual de uso

## 1. Como abrir

1. Abra a pasta `CRM_I9TMG`.
2. Dê dois cliques em **`index.html`**. Use o **Microsoft Edge** ou o **Google Chrome**, e não use janela anônima.
3. Na primeira abertura, escolha uma opção:
   - **Carregar base**: carrega a base de estruturação, com clientes, sedes, contatos, histórico 2022–2025 e STO do CRM R17, mais as propostas de 2026 da planilha `Controle_de_Propostas_2026` extraída em 16/11/2026.
   - **Iniciar vazio**: carrega somente as listas, os vendedores e o catálogo de equipamentos.
   - **Restaurar backup**: recupera um arquivo `.json` salvo antes.

Não precisa de internet nem de servidor. Todas as bibliotecas estão na pasta `vendor/`.

> **Importante:** os dados ficam salvos **no navegador deste computador** (IndexedDB), e não no OneDrive. Se você abrir o CRM em outro computador ou em outro navegador, a base estará vazia: use backup e restauração para levar os dados. Também **não limpe os dados de navegação** do Edge/Chrome para "arquivos locais" sem antes fazer backup.

## 2. Navegação

| Menu | Para que serve |
|---|---|
| **Dashboard** | Visão gerencial: propostas, aprovado, conversão, pipeline, contratos, meta, clientes, prospecção e agenda. Use o seletor de ano para comparar com o ano anterior. |
| **Cadastros** | Base única do sistema: clientes (com sedes e contatos), vendedores, produtos/serviços, equipamentos, segmentos, etapas, origens, motivos de perda, tipos de atividade/visita, status, categorias de contrato, listas do STO, cadência de pós-venda e metas. |
| **STO** | Solicitações técnicas de orçamento, com equipamentos do catálogo, premissas técnicas, revisões e atualizações. A checagem ISO 9001 aponta o que falta antes de gerar a proposta. |
| **Propostas** | Controle de propostas com seletor de ano (2022…2027 ou Todos), filtros, colunas por grupo, exportação para Excel, duplicação, arquivamento e histórico. Inclui **Indicadores** e **Radar de prazos**, que reproduz o gráfico RADAR da planilha. |
| **CAPEX** | Mesmo controle, só para as propostas CAPEX, separadas pela classificação "categoria". |
| **Funil de Vendas** | Kanban das oportunidades: arraste os cartões entre as etapas. Inclui indicadores, conversão entre etapas e previsão de fechamento. |
| **Prospecção** | Visitas e contatos, inclusive com empresas ainda não cadastradas, que podem ser convertidas em cliente depois. Inclui indicadores. |
| **Clientes** | Visão comercial dos clientes e **ficha individual**: propostas, oportunidades, STO, visitas, contratos, atividades e histórico. |
| **Agenda** | Calendário (dia, semana, mês e lista), follow-up, pós-vendas (A fazer / Feitos) e visitas. |
| **Contratos** | Contratos guarda-chuva: teto, demandas vinculadas, consumo e saldo. |
| **Backup e dados** | Backup, restauração, importação/exportação, validação de dados, histórico de alterações e preferências. |

No topo da tela:
- **Visão**: mostra o CRM como um vendedor específico.
- **Ocultar R$**: modo apresentação, que esconde os valores.
- **Aviso de backup**: aparece quando o último backup tem mais de 7 dias.

## 3. Regras de funcionamento

- **Cliente é cadastrado uma única vez.** O botão "Novo cliente", em qualquer tela, abre o mesmo cadastro mestre. O sistema bloqueia CNPJ e código duplicados e avisa quando já existe um cliente com o mesmo nome.
- **Proposta cria a oportunidade automaticamente** no Funil, sem digitação dupla. Também é possível vincular uma oportunidade que já existe, por exemplo para uma revisão.
- O **número da proposta** segue o padrão atual: código do cliente + sequência + ano (ex.: `AM_340126`).
- O **valor da proposta** é informado por tipo (Fabricação, Obra, Projeto…), como nas colunas "PREÇO …" da planilha. O total é calculado automaticamente.
- **Proposta aprovada:** a oportunidade vai para "Concluído Aprovado" e o pós-venda é agendado conforme a cadência (30/90/180/360 dias).
- **Proposta perdida** exige o motivo da perda. A etapa do funil em que ela parou é mantida.
- **Visita planejada** na Prospecção cria o compromisso na Agenda. Ao concluir a visita na Agenda, a prospecção é atualizada.
- **Contrato guarda-chuva:** cada demanda é uma proposta vinculada ao contrato. As demandas aprovadas debitam o saldo.
- **Exclusões:** clientes e cadastros em uso são **inativados**, não apagados. Propostas são **arquivadas**. A exclusão definitiva exige o modo administrador (Backup e dados › Preferências). Toda inclusão, alteração e exclusão fica registrada em "Histórico de alterações".

## 4. Backup (faça toda semana)

1. Vá em **Backup e dados › Backup e restauração › Gerar backup agora**.
2. O arquivo `CRM_I9TMG_backup_AAAA-MM-DD_HHhMM.json` é baixado. Mova-o para uma pasta do OneDrive, por exemplo `CRM - Comercial/Backups`.
3. Para restaurar, use **Restaurar backup** e escolha o arquivo. O sistema valida o arquivo, mostra o conteúdo e pede que você digite RESTAURAR para confirmar.

Para levar os dados a outro computador, gere o backup em um computador e restaure no outro.

## 5. Importar histórico (anos anteriores)

Use **Backup e dados › Importar / exportar › Importar propostas (histórico)**:
- Use uma planilha no formato "Controle de propostas", com os mesmos cabeçalhos da planilha 2026. Há um botão "Modelo".
- Os clientes são vinculados pelo código da proposta e pelo nome. Os que não forem encontrados podem ser criados automaticamente como Prospect.
- Uma **prévia** mostra o que será incluído, atualizado ou ignorado. Nada é gravado antes da confirmação.

Clientes também podem ser importados por planilha (há um modelo), com controle de duplicidade.

## 6. Validação de dados

**Backup e dados › Validação de dados** lista, sem alterar nada:
- códigos duplicados;
- clientes repetidos;
- vínculos quebrados;
- propostas perdidas sem motivo;
- prazos vencidos;
- clientes sem CNPJ;
- STO com pendências.

Clique em cada item para abrir os registros.

## 7. Sobre a base de estruturação

A base serve para validar o layout e os indicadores. Ela será revisada na próxima etapa (cadastro dos retroativos e alimentação dos novos dados). Para voltar ao estado inicial, use **Preferências › Recarregar base de estruturação**.

Itens já identificados para tratar:
- 7 códigos duplicados vindos do CRM R17 (`CP_260126`, `MO_010126`, `MO_010226`, `MO_010326`, `PB_020126`, `EU_080126`, `c_035_01_25`);
- o código `VF_040326` aparece em duas linhas da planilha. No CRM ficou um único registro, com os dados da última linha;
- nenhum cliente tem CNPJ cadastrado;
- 747 propostas perdidas permanecem em etapas intermediárias do funil: 509 em "Análise do cliente", 144 em "Entrada de lead", 58 em "Negociação" e 36 nas demais etapas (decisão pendente);
- **JR Monteiro** e **CCCC** existiam só na planilha e foram criados como Prospect;
- o contrato guarda-chuva `m_023_02_25` tem valor proposto na planilha (R$ 2,29 mi) diferente do valor fechado no R17 (R$ 12,44 mi).
