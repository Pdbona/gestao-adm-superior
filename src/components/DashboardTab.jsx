import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown } from 'lucide-react';
import { C, styles, brl } from '../styles';
import { listarFaturamento, listarDespesas, listarFornecedores, listarFolha } from '../lib/db';

export default function DashboardTab() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    (async () => {
      const [faturamento, despesas, fornecedores, folha] = await Promise.all([
        listarFaturamento(), listarDespesas(), listarFornecedores(), listarFolha()
      ]);
      setDados({ faturamento, despesas, fornecedores, folha });
    })();
  }, []);

  const meses = useMemo(() => {
    if (!dados) return [];
    const fornecedoresMapa = new Map(dados.fornecedores.map(f => [f.codigo, f]));
    const m = {};
    const touch = (comp) => { if (!m[comp]) m[comp] = { competencia: comp, faturamento: 0, despesa: 0, folha: 0 }; return m[comp]; };

    dados.faturamento.forEach(l => { if (l.competencia) touch(l.competencia).faturamento += l.valor || 0; });
    dados.despesas.forEach(d => {
      if (!d.competencia) return;
      if (fornecedoresMapa.get(d.fornecedorCodigo)?.ehDoCD === true) touch(d.competencia).despesa += d.valor || 0;
    });
    dados.folha.forEach(h => { touch(h.competencia).folha += (h.totalLiquidoPagar || 0) + (h.totalLiquidoPagarFerias || 0); });

    return Object.values(m)
      .map(x => {
        const despesaTotal = x.despesa + x.folha;
        const margem = x.faturamento - despesaTotal;
        return { ...x, despesaTotal, margem, lucratividade: x.faturamento ? (margem / x.faturamento) * 100 : 0 };
      })
      .sort((a, b) => b.competencia.localeCompare(a.competencia));
  }, [dados]);

  const atual = meses[0];
  const ytd = useMemo(() => {
    if (!atual) return null;
    const ano = atual.competencia.slice(0, 4);
    const doAno = meses.filter(m => m.competencia.startsWith(ano));
    const faturamento = doAno.reduce((s, m) => s + m.faturamento, 0);
    const despesaTotal = doAno.reduce((s, m) => s + m.despesaTotal, 0);
    const margem = faturamento - despesaTotal;
    return { faturamento, despesaTotal, margem, lucratividade: faturamento ? (margem / faturamento) * 100 : 0, ano };
  }, [meses, atual]);

  if (!dados) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <div style={styles.secTitle}><LayoutDashboard size={19} /> Dashboard</div>

      {!atual ? (
        <div style={styles.empty}>Sem dados ainda — importe Faturamento, Despesas e Folha de Pagamento pra ver os indicadores aqui.</div>
      ) : (
        <>
          <p style={styles.helper}>
            Acumulado de <b>{ytd.ano}</b> (ano-a-data, todos os meses já lançados).
          </p>
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Faturamento Total</div>
              <div style={{ ...styles.kpiValor, color: C.verde }}>{brl(ytd.faturamento)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.vermelho }}>
              <div style={styles.kpiLabel}>Despesa Total</div>
              <div style={{ ...styles.kpiValor, color: C.vermelho }}>{brl(ytd.despesaTotal)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.navy2 }}>
              <div style={styles.kpiLabel}>Margem</div>
              <div style={styles.kpiValor}>{brl(ytd.margem)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.laranja }}>
              <div style={styles.kpiLabel}>Lucratividade</div>
              <div style={{ ...styles.kpiValor, color: C.laranjaEsc, display: 'flex', alignItems: 'center', gap: 6 }}>
                {ytd.lucratividade >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {ytd.lucratividade.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '20px 0 10px' }}>
            Evolução mensal
          </div>
          <div className="scroll-x" style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead><tr>{['Mês', 'Faturamento', 'Despesas (fornecedor + folha)', 'Margem', 'Lucratividade'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {meses.map(m => (
                  <tr key={m.competencia}>
                    <td style={styles.td}>{m.competencia}</td>
                    <td style={styles.tdMono}>{brl(m.faturamento)}</td>
                    <td style={styles.tdMono}>{brl(m.despesaTotal)}</td>
                    <td style={{ ...styles.tdMono, color: m.margem >= 0 ? C.verde : C.vermelho }}>{brl(m.margem)}</td>
                    <td style={styles.tdMono}>{m.lucratividade.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
