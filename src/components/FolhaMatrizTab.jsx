import React, { useEffect, useMemo, useState } from 'react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarFolha } from '../lib/db';
import { Variacao } from './Variacao';
import ErroCarregamento from './ErroCarregamento';

/* Subitem "Folha de Pagto" dentro de Despesas — mês na linha, os 10
   itens do RH na coluna, igual ao padrão das matrizes de Faturamento
   (mesma leitura: evolução mês a mês). Só leitura — importar/editar é
   na aba Importação, excluir é no bloco "Excluir uma importação" de lá.
   Combinado com Pablo em 21/ago/2026. */
const COLUNAS = [
  { id: 'totalLiquidoPagar', label: 'Líquido a Pagar' },
  { id: 'totalLiquidoPagarFerias', label: 'Líquido (Férias)' },
  { id: 'gps', label: 'GPS' },
  { id: 'fgtsApurado', label: 'FGTS Apurado' },
  { id: 'fgtsRecolhido', label: 'FGTS Recolhido' },
  { id: 'emprestimo', label: 'Empréstimo' },
  { id: 'irrfFolha', label: 'IRRF' },
  { id: 'horaExtra50', label: 'Hora Extra 50%' },
  { id: 'horaExtra100', label: 'Hora Extra 100%' },
  { id: 'dsrHorasExtras', label: 'DSR Horas Extras' },
  { id: 'custoDemissao', label: 'Custo Demissão' }
];

export default function FolhaMatrizTab() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro(false);
    try {
      setHistorico(await listarFolha());
    } catch (e) {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); }, []);

  const custoFolhaMes = (h) => (h.totalLiquidoPagar || 0) + (h.totalLiquidoPagarFerias || 0);

  const linhas = useMemo(() => historico.slice().sort((a, b) => a.competencia.localeCompare(b.competencia)), [historico]);
  const totalAcumulado = useMemo(() => historico.reduce((s, h) => s + custoFolhaMes(h), 0), [historico]);
  const mediaAcumulada = linhas.length ? totalAcumulado / linhas.length : 0;

  const totalPorColuna = (id) => linhas.reduce((s, h) => s + (h[id] || 0), 0);

  if (erro) return <ErroCarregamento onTentarDeNovo={carregar} />;
  if (carregando) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <p style={styles.helper}>
        Os 10 itens do "Resumo Geral" do RH, mês a mês. Pra importar ou corrigir um mês, use a aba
        Importação → Folha de Pagamento (RH).
      </p>

      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderTopColor: C.navy }}>
          <div style={styles.kpiLabel}>Custo de folha acumulado</div>
          <div style={{ ...styles.kpiValor, color: C.navy }}>{brl(totalAcumulado)}</div>
          <div style={styles.kpiNota}>{linhas.length} mês(es) lançado(s)</div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div style={styles.empty}>Nenhuma folha lançada ainda — importe em Importação → Folha de Pagamento (RH).</div>
      ) : (
        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>
              <th style={styles.th}>Mês</th>
              {COLUNAS.map(c => <th key={c.id} style={styles.th}>{c.label}</th>)}
              <th style={styles.th}>Custo de Folha</th>
            </tr></thead>
            <tbody>
              {linhas.map((h, i) => {
                const anterior = linhas[i - 1];
                const custo = custoFolhaMes(h);
                const pct = anterior ? variacaoPct(custo, custoFolhaMes(anterior)) : null;
                return (
                  <tr key={h.id}>
                    <td style={styles.td}>{mesLabel(h.competencia)}</td>
                    {COLUNAS.map(c => <td key={c.id} style={styles.tdMono}>{brl(h[c.id])}</td>)}
                    <td style={{ ...styles.tdMono, fontWeight: 700 }}>{brl(custo)}<Variacao pct={pct} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.navy }}>
                <td style={{ ...styles.tf, color: C.branco }}>Total</td>
                {COLUNAS.map(c => <td key={c.id} style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalPorColuna(c.id))}</td>)}
                <td style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalAcumulado)}</td>
              </tr>
              <tr style={{ background: '#EAF2F9' }}>
                <td style={{ ...styles.tf, color: C.navy2 }}>Média/mês</td>
                {COLUNAS.map(c => <td key={c.id} style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(totalPorColuna(c.id) / linhas.length)}</td>)}
                <td style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(mediaAcumulada)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.prata, marginTop: 6 }}>Sinalizado ▲/▼ quando o Custo de Folha do mês varia mais de 10% em relação ao mês anterior.</div>
    </div>
  );
}
