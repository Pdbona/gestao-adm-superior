/* Agregações usadas no modal de detalhe (DetalheModal) — combinado com
   Pablo em 21/ago/2026: lançamento cru demais pra ler rápido, resumo
   por dimensão é mais útil. `valor` em cada linha é o que o DetalheModal
   soma no rodapé, então toda linha aqui carrega esse campo. */

/* Faturamento: por cliente, com o total dividido em Nota de Serviço e
   Locação (ND) — ordem decrescente pelo total. */
export function agruparFaturamentoPorCliente(linhas) {
  const porCliente = {};
  linhas.forEach(l => {
    const nome = l.clienteNome || l.clienteCodigo || '—';
    if (!porCliente[nome]) porCliente[nome] = { cliente: nome, servico: 0, locacao: 0 };
    porCliente[nome][l.tipo === 'locacao' ? 'locacao' : 'servico'] += l.valor || 0;
  });
  return Object.values(porCliente)
    .map(c => ({ ...c, valor: c.servico + c.locacao }))
    .sort((a, b) => b.valor - a.valor);
}

export const COLUNAS_FATURAMENTO_POR_CLIENTE = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'servico', label: 'Nota de Serviço', formato: 'moeda' },
  { key: 'locacao', label: 'Locação (ND)', formato: 'moeda' },
  { key: 'valor', label: 'Total', formato: 'moeda' }
];

/* Despesas: por Centro de Custo — ordem alfabética. */
export function agruparDespesaPorCC(linhas, fornecedoresMapa, centrosCusto) {
  const nomeCC = (id) => id ? (centrosCusto.find(c => c.id === id)?.nome || '—') : 'Não Classificado';
  const porCC = {};
  linhas.forEach(d => {
    const nome = nomeCC(fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId);
    if (!porCC[nome]) porCC[nome] = { centroCusto: nome, valor: 0 };
    porCC[nome].valor += d.valor || 0;
  });
  return Object.values(porCC).sort((a, b) => a.centroCusto.localeCompare(b.centroCusto, 'pt-BR'));
}

export const COLUNAS_DESPESA_POR_CC = [
  { key: 'centroCusto', label: 'Centro de Custo' },
  { key: 'valor', label: 'Total', formato: 'moeda' }
];
