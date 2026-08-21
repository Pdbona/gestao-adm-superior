import { celulasPreenchidas } from './xls';

/* ============================================================
   REGRAS DE CATEGORIZAÇÃO — combinadas com Pablo em 19/ago/2026,
   herdadas do projeto DRE_Diretoria_Superior (Google Sheets) que
   já rodava manualmente. Se aparecer um código de Tipo de Serviço
   novo que não esteja aqui, o lançamento cai em "outros_nao_mapeado"
   e fica destacado na prévia de importação — nunca é descartado
   silenciosamente.
   ============================================================ */
export const CATEGORIA_SERVICO_POR_CODIGO = {
  '1': 'armazenagem', '272': 'armazenagem', '283': 'armazenagem',
  '284': 'movimentacao', '289': 'movimentacao',
  '285': 'seguro', '290': 'seguro',
  '286': 'outros', '291': 'outros',
  '288': 'cross_docking'
};
export const CATEGORIA_SERVICO_LABEL = {
  armazenagem: 'Armazenagem',
  movimentacao: 'Movimentação',
  seguro: 'Seguro',
  outros: 'Outros — Etiquetagem/Paletização',
  cross_docking: 'Cross Docking',
  outros_nao_mapeado: 'Não mapeado (verificar)'
};

/* dd/mm/yyyy, dd/mm/yy ou d/m/yy (Locação vem sem zero à esquerda) → ISO
   "yyyy-mm-dd". Ano com 2 dígitos é sempre 20xx neste contexto. */
export function dataBRparaISO(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function competenciaDe(iso) {
  return iso ? iso.slice(0, 7) : null; // "yyyy-mm"
}

/* "R$ 7.120,52" (pt-BR, formatado pelo Excel/relatório) ou já "7,120.52"
   (en-US, como o XLSX.js costuma devolver célula numérica formatada) —
   os dois formatos aparecem dependendo do relatório de origem. Estratégia:
   remove tudo que não é dígito/vírgula/ponto, depois decide o separador
   decimal pela ÚLTIMA ocorrência de , ou . (a mais próxima do fim é o
   decimal; o resto é separador de milhar). */
export function valorParaNumero(str) {
  let s = String(str || '').replace(/R\$\s?/i, '').trim();
  if (!s) return 0;
  const ultimaVirgula = s.lastIndexOf(',');
  const ultimoPonto = s.lastIndexOf('.');
  if (ultimaVirgula > ultimoPonto) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function splitCodigoNome(str, separador) {
  const re = separador === 'traço' ? /^([\d.]+)\s*-\s*(.+)$/ : /^([\d.]+)\s+(.+)$/;
  const m = String(str || '').trim().match(re);
  return m ? { codigo: m[1], nome: m[2].trim() } : { codigo: '', nome: str || '' };
}

/* ---------- Faturamento por Tipo de Serviço (fp_faturamento_por_servico_*.xls) ----------
   Cada linha de dado, depois de remover células vazias, tem sempre 8
   campos nesta ordem: Filial, Cliente, Documento, Série, Código, Total
   (com "R$"), Data, Tipo Serviço. Linhas de título de seção, subtotal e
   rodapé têm outra contagem de células e são ignoradas.
   competenciaManual (obrigatório, "yyyy-mm"): combinado com Pablo em
   20/ago/2026 — quem importa escolhe o mês na tela de Importação, não
   se usa mais a data que vem dentro do arquivo pra isso (a data do
   documento continua guardada em `data`, só de referência). */
export function parseFaturamentoServico(rows, competenciaManual) {
  const linhas = [];
  const avisos = [];
  for (const row of rows) {
    const c = celulasPreenchidas(row);
    if (c.length !== 8) continue;
    if (!/^\d{1,2}\s*-\s*/.test(c[0])) continue;   // c[0] tem que parecer Filial
    if (!/^R\$/i.test(c[5])) continue;              // c[5] tem que ser o Total

    const { codigo: clienteCodigo, nome: clienteNome } = splitCodigoNome(c[1], 'traço');
    const dataISO = dataBRparaISO(c[6]);
    const tipoServicoStr = c[7];
    const codTipo = (tipoServicoStr.match(/^(\d+)/) || [])[1];
    const categoria = CATEGORIA_SERVICO_POR_CODIGO[codTipo] || 'outros_nao_mapeado';
    if (categoria === 'outros_nao_mapeado') {
      avisos.push(`Código de Tipo de Serviço "${codTipo}" (${tipoServicoStr}) não está mapeado — confirme a categoria antes de importar.`);
    }
    linhas.push({
      tipo: 'servico',
      categoria, categoriaLabel: CATEGORIA_SERVICO_LABEL[categoria],
      filial: c[0], clienteCodigo, clienteNome,
      documento: c[2], serie: c[3], numero: c[4],
      data: dataISO, competencia: competenciaManual,
      valor: valorParaNumero(c[5])
    });
  }
  return { linhas, avisos };
}

/* ---------- Faturamento Locação (rs_relacao_faturamento nd_detalhado_*.xls) ----------
   Cada linha de dado tem 8 campos: Filial, Cliente, Documento (NFD/NFS),
   Tipo Documento, Série, Código, Data, Total (sem "R$"). Combinado com
   Pablo em 19/ago/2026: só as linhas NFD (débito) viram Locação — as NFS
   deste mesmo arquivo são ignoradas porque já vêm detalhadas por
   categoria no arquivo de Serviços. competenciaManual: ver nota acima
   em parseFaturamentoServico. */
export function parseFaturamentoLocacao(rows, competenciaManual) {
  const linhas = [];
  for (const row of rows) {
    const c = celulasPreenchidas(row);
    if (c.length !== 8) continue;
    if (!/^\d{1,2}\s*-\s*/.test(c[0])) continue;
    if (c[2] !== 'NFD') continue; // só Débito/Locação
    if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c[6])) continue;

    const { codigo: clienteCodigo, nome: clienteNome } = splitCodigoNome(c[1], 'traço');
    const dataISO = dataBRparaISO(c[6]);
    linhas.push({
      tipo: 'locacao',
      filial: c[0], clienteCodigo, clienteNome,
      documento: c[2], tipoDocumento: c[3], serie: c[4], numero: c[5],
      data: dataISO, competencia: competenciaManual,
      valor: valorParaNumero(c[7])
    });
  }
  return { linhas, avisos: [] };
}

/* Sugestão inicial de Centro de Custo a partir do Tipo de Documento da
   despesa — usada só como PALPITE quando um fornecedor novo aparece
   (ver garantirFornecedores em db.js); o usuário sempre pode trocar.
   Nomes batem com CENTROS_CUSTO_PADRAO (ver db.js) — se não achar
   correspondência, cai em "Não Classificado". */
export const SUGESTAO_CC_POR_TIPO_DOC = {
  ALU: 'Aluguel e Ocupação',
  AGU: 'Utilidades (Água/Energia)',
  ENE: 'Utilidades (Água/Energia)',
  ISS: 'Impostos e Taxas',
  NFP: 'Materiais e Produtos',
  NFS: 'Serviços Gerais',
  BOL: 'Serviços Gerais'
};

/* ---------- Despesas (documentos_contas_a_pagar_data_vencto...xls) ----------
   Relatório agrupado: "DATA DE VENCIMENTO : dd/mm/aaaa" abre um grupo,
   "TIPO DOCUMENTO: COD-Label" abre um subgrupo dentro dele, depois vem a
   linha de cabeçalho de coluna e as linhas de dado (7 campos: Emissão,
   Documento, Fornecedor, Sit. Parcela, Data Pgto, Sit. Documento, Valor).
   É preciso ler de cima pra baixo guardando o vencimento/tipo "correntes".
   competenciaManual: ver nota em parseFaturamentoServico — o vencimento
   real continua guardado em `vencimento`, só de referência. */
export function parseDespesas(rows, competenciaManual) {
  const linhas = [];
  let vencimentoAtual = null;
  let tipoDocCodigo = null, tipoDocLabel = null;

  for (const row of rows) {
    const c = celulasPreenchidas(row);
    if (c.length === 0) continue;

    const linhaCompleta = row.join(' ');
    const mVenc = linhaCompleta.match(/DATA DE VENCIMENTO\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (mVenc) { vencimentoAtual = dataBRparaISO(mVenc[1]); continue; }

    const mTipo = linhaCompleta.match(/TIPO DOCUMENTO:\s*([A-Z0-9]+)-(.+)/);
    if (mTipo) { tipoDocCodigo = mTipo[1].trim(); tipoDocLabel = mTipo[2].trim(); continue; }

    if (c.length !== 7) continue;
    if (!/^\d{2}\/\d{2}\/\d{2,4}$/.test(c[0])) continue; // c[0] = Emissão

    const { codigo: fornecedorCodigo, nome: fornecedorNome } = splitCodigoNome(c[2], 'espaço');
    const emissaoISO = dataBRparaISO(c[0]);
    const dtaPgtoISO = dataBRparaISO(c[4]);

    linhas.push({
      tipoDocumentoCodigo: tipoDocCodigo, tipoDocumentoLabel: tipoDocLabel,
      vencimento: vencimentoAtual, competencia: competenciaManual,
      emissao: emissaoISO, documento: c[1],
      fornecedorCodigo, fornecedorNome,
      situacaoParcela: c[3], dataPagamento: dtaPgtoISO, situacaoDocumento: c[5],
      valor: valorParaNumero(c[6])
    });
  }
  return { linhas, avisos: [] };
}

/* ---------- Folha de Pagamento (planilha Folha_RH_AAAA-MM.xlsx) ----------
   Não é um relatório do ERP como os outros — é o formato próprio que o
   Claude gera a partir do PDF "Resumo Geral" do RH (o PDF em si não tem
   texto extraível, ver FolhaTab.jsx). Linha 1 = cabeçalho com o nome de
   cada campo, linha 2 = os valores; casa pelo texto do cabeçalho, não
   pela posição da coluna, pra não quebrar se alguém reordenar. A
   competência continua escolhida manualmente na tela (mesma regra dos
   outros imports — combinado com Pablo em 20/ago/2026); a coluna
   "Competência" da planilha é só conferência, vira aviso se divergir.
   Combinado com Pablo em 21/ago/2026. */
export const CAMPOS_FOLHA = [
  { header: 'Total Líquido a Pagar', id: 'totalLiquidoPagar' },
  { header: 'Total Líquido a Pagar (Férias)', id: 'totalLiquidoPagarFerias' },
  { header: 'Total Líquido (GPS)', id: 'gps' },
  { header: 'Total FGTS Apurado (Recibos)', id: 'fgtsApurado' },
  { header: 'Total FGTS Recolhido s/CS', id: 'fgtsRecolhido' },
  { header: 'Total de Empréstimo', id: 'emprestimo' },
  { header: 'IRRF Folha', id: 'irrfFolha' },
  { header: 'Hora Extra 50% (401)', id: 'horaExtra50' },
  { header: 'Hora Extra 100% (402)', id: 'horaExtra100' },
  { header: 'DSR s/ Horas Extras (420)', id: 'dsrHorasExtras' },
  { header: 'Custo de Demissão (líq.)', id: 'custoDemissao' }
];

export function parseFolha(rows, competenciaManual) {
  const avisos = [];
  const cabecalho = (rows[0] || []).map(c => String(c ?? '').trim().toLowerCase());
  const linhaValores = rows[1] || [];

  if (cabecalho.length === 0 || linhaValores.length === 0) {
    return { valores: null, avisos: ['Não encontrei cabeçalho e linha de valores nas duas primeiras linhas da planilha.'] };
  }

  const valores = {};
  for (const campo of CAMPOS_FOLHA) {
    const idx = cabecalho.indexOf(campo.header.toLowerCase());
    if (idx < 0) {
      valores[campo.id] = 0;
      avisos.push(`Coluna "${campo.header}" não encontrada — lancei 0,00, confira antes de salvar.`);
    } else {
      valores[campo.id] = valorParaNumero(linhaValores[idx]);
    }
  }

  const idxCompetencia = cabecalho.indexOf('competência');
  if (idxCompetencia >= 0) {
    const competenciaPlanilha = String(linhaValores[idxCompetencia] || '').trim();
    if (competenciaPlanilha && competenciaPlanilha !== competenciaManual) {
      avisos.push(`A planilha indica competência ${competenciaPlanilha}, mas o mês escolhido acima é ${competenciaManual} — confira antes de salvar.`);
    }
  }

  return { valores, avisos };
}
