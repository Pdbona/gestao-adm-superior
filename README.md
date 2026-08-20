# Gestão ADM — Superior Transportes

App de gestão administrativa do CD (Serra/ES) — SBS Solution. Importa mensalmente Faturamento
(Locação + Serviços), Despesas e Folha de Pagamento, acumulando histórico mês a mês, e mostra
Faturamento Total, Despesa Total, Margem e Lucratividade no Dashboard.

Acesso: sem login próprio — é liberado pelo Hub do [APP_Gestao_Operacional](../APP_Gestao_Operacional),
perfil com a permissão "Administrativo" (mesmo modelo do App de Gestão Comercial). Quem abre o link
só se identifica pelo nome (fica salvo no navegador), pra rastrear quem importou/validou o quê.

## Fontes de dados e regras de importação

- **Faturamento — Locação**: relatório "Relação Faturamento por Filial - Detalhado" (`rs_relacao_faturamento_nd_detalhado_*.xls`).
  Só as linhas **NFD/Débito** entram; as NFS do mesmo arquivo são ignoradas (já vêm no arquivo de Serviços).
- **Faturamento — Serviços**: relatório por Tipo de Serviço (`fp_faturamento_por_servico_armazem.xls`).
  Categorias unificadas: **Armazenagem** (1/272/283), **Movimentação** (284/289), **Seguro** (285/290),
  **Outros** (286/291), **Cross Docking** (288). Código não mapeado aparece como aviso na prévia,
  nunca é descartado silenciosamente.
- **Despesas**: relatório "Documentos C. Pagar por Vencimento", filtrado pra filial do CD. Cada
  fornecedor novo entra no cadastro como pendente; só conta no total de despesa depois de validado
  "É do CD" na aba Fornecedores — a validação vale retroativamente pros lançamentos já importados.
- **Folha de Pagamento**: lançamento manual mensal com os 10 itens do PDF "Resumo Geral" do RH
  (Total Líquido a Pagar, GPS, FGTS apurado/recolhido, Empréstimo, IRRF, Horas Extras 50%/100%,
  DSR s/ HE, Custo de Demissão). Só Total Líquido a Pagar (+ Férias) entra na Despesa Total do
  Dashboard — os demais ficam como referência. Extração automática do PDF fica pra uma v2.

Cada importação é tratada como um mês fechado, sem sobreposição — não há trava de duplicidade por
enquanto (decidido com Pablo em 19/ago/2026).

## Rodar localmente

```bash
npm install
npm start
```

## Deploy

Automático: todo push em `main` roda `.github/workflows/deploy.yml` (build + GitHub Pages via
GitHub Actions) — não precisa rodar nada manualmente.

## Firestore

Projeto `gestao-adm-superior`, região `southamerica-east1`. Coleções: `lancamentos_faturamento`,
`lancamentos_despesa`, `fornecedores`, `folha_pagamento`, `lotes_importacao`. Regras abertas de
propósito — o controle de acesso fica no Hub do Operacional, não no Firestore.
