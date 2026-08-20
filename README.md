# Gestão ADM — Superior Transportes

App de gestão administrativa do CD (Serra/ES) — SBS Solution. Importa mensalmente Faturamento
(Locação + Serviços), Despesas e Folha de Pagamento, acumulando histórico mês a mês, e mostra
Faturamento Total, Despesa Total, RH Total e Resultado (R$ e %) na aba Resultado.

Acesso: sem login próprio — é liberado pelo Hub do [APP_Gestao_Operacional](../APP_Gestao_Operacional),
perfil com a permissão "Administrativo" (mesmo modelo do App de Gestão Comercial). Quem entra pelo
Hub já chega identificado (`?usuario=`) e com as abas visíveis já filtradas pelo perfil (`?ocultar=`);
abrindo o link direto, sem passar pelo Hub, pede o nome uma vez (fica salvo no navegador). O botão
"Sair" volta pro [Gestão Superior CD](https://Pdbona.github.io/cd-superior/).

## Abas

- **Importação** — único lugar onde se sobem arquivos. Pra cada arquivo (Locação, Serviços,
  Despesas) escolhe-se o **mês de competência manualmente**; não se usa a data de dentro do arquivo
  pra isso. A Folha de Pagamento (RH) também é lançada aqui, manualmente.
- **Faturamento** — cards (Nota de Serviço / Locação / Total), Sintético por mês (com Total e Média
  do ano) e Analítico por Cliente (ordem decrescente de total).
- **Despesas** — Sintético por mês x Centro de Custo (com Total, Média e sinalização ▲/▼ quando o
  Total do mês varia mais de 10%) e Analítico: escolhe um Centro de Custo, vê por fornecedor.
- **Fornecedores** — cadastro de Centros de Custo (semeado automaticamente com 8 categorias padrão,
  editável) e fila de validação: todo fornecedor novo, achado numa importação de Despesas, entra
  pendente já com uma sugestão de Centro de Custo (baseada no tipo de documento mais comum dele) —
  confirma-se ou troca-se o CC e valida-se "é do CD". Só entra nos totais depois de validado, e a
  validação vale retroativamente pros lançamentos já importados.
- **Resultado** — Faturamento Total, Despesa Total (só fornecedor validado), RH Total (Folha) e
  Resultado, por mês. `Resultado = Faturamento Total − (Despesa Total + RH Total)`.

## Fontes de dados e regras de importação

- **Faturamento — Locação**: relatório "Relação Faturamento por Filial - Detalhado" (`rs_relacao_faturamento_nd_detalhado_*.xls`).
  Só as linhas **NFD/Débito** entram; as NFS do mesmo arquivo são ignoradas (já vêm no arquivo de Serviços).
- **Faturamento — Serviços**: relatório por Tipo de Serviço (`fp_faturamento_por_servico_armazem.xls`).
  Categorias unificadas: **Armazenagem** (1/272/283), **Movimentação** (284/289), **Seguro** (285/290),
  **Outros** (286/291), **Cross Docking** (288). Código não mapeado aparece como aviso na prévia,
  nunca é descartado silenciosamente.
- **Despesas**: relatório "Documentos C. Pagar por Vencimento", filtrado pra filial do CD. Cada
  fornecedor novo entra no cadastro como pendente, com sugestão de Centro de Custo por tipo de
  documento (`SUGESTAO_CC_POR_TIPO_DOC` em `lib/parsers.js`); só conta no total de despesa depois de
  validado "É do CD" na aba Fornecedores.
- **Folha de Pagamento**: lançamento manual mensal com os 10 itens do PDF "Resumo Geral" do RH
  (Total Líquido a Pagar, GPS, FGTS apurado/recolhido, Empréstimo, IRRF, Horas Extras 50%/100%,
  DSR s/ HE, Custo de Demissão). Só Total Líquido a Pagar (+ Férias) entra no RH Total da aba
  Resultado — os demais ficam como referência. Extração automática do PDF fica pra uma v2.

Cada importação é tratada como um mês fechado, sem sobreposição — não há trava de duplicidade por
enquanto (decidido com Pablo em 19/ago/2026).

## RBAC (permissões por perfil)

As 5 abas (`importacao`, `faturamento`, `despesas`, `fornecedores`, `resultado`) têm os mesmos ids
usados em `SUBITENS_POR_ABA.administrativo` no Operacional — o perfil de lá controla granularmente
quais o usuário vê, e a URL chega pronta com `?ocultar=id1,id2`. Mantenha as duas listas em
sincronia manualmente (repos diferentes, sem import compartilhado) — ver `Layout.jsx` (`ABAS`) aqui
e `SUBITENS_POR_ABA.administrativo` no `App.jsx` do Operacional.

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
`lancamentos_despesa`, `fornecedores`, `centros_custo`, `folha_pagamento`, `lotes_importacao`.
Regras abertas de propósito — o controle de acesso fica no Hub do Operacional, não no Firestore.
