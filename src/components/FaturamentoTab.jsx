import React, { useEffect, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarFaturamento } from '../lib/db';
import { Variacao } from './Variacao';
import ErroCarregamento from './ErroCarregamento';

export default function FaturamentoTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro(false);
    try {
      setLancamentos(await listarFaturamento());
    } catch (e) {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); }, []);

  const totalServico = useMemo(() => lancamentos.filter(l => l.tipo === 'servico').reduce((s, l) => s + (l.valor || 0), 0), [lancamentos]);
  const totalLocacao = useMemo(() => lancamentos.filter(l => l.tipo === 'locacao').reduce((s, l) => s + (l.valor || 0), 0), [lancamentos]);
  const totalGeral = totalServico + totalLocacao;

  const sintetico = useMemo(() => {
    const porMes = {};
    lancamentos.forEach(l => {
      if (!l.competencia) return;
      if (!porMes[l.competencia]) porMes[l.competencia] = { competencia: l.competencia, servico: 0, locacao: 0 };
      porMes[l.competencia][l.tipo === 'servico' ? 'servico' : 'locacao'] += l.valor || 0;
    });
    return Object.values(porMes)
      .map(m => ({ ...m, total: m.servico + m.locacao }))
      .sort((a, b) => a.competencia.localeCompare(b.competencia));
  }, [lancamentos]);

  const mediaAno = sintetico.length ? totalGeral / sintetico.length : 0;

  const analiticoClientes = useMemo(() => {
    const porCliente = {};
    lancamentos.forEach(l => {
      const chave = l.clienteNome || l.clienteCodigo || '—';
      if (!porCliente[chave]) porCliente[chave] = { nome: chave, total: 0, n: 0 };
      porCliente[chave].total += l.valor || 0;
      porCliente[chave].n += 1;
    });
    return Object.values(porCliente).sort((a, b) => b.total - a.total);
  }, [lancamentos]);

  if (erro) return <ErroCarregamento onTentarDeNovo={carregar} />;
  if (carregando) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <div style={styles.secTitle}><Receipt size={19} /> Faturamento</div>

      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderTopColor: C.verde }}>
          <div style={styles.kpiLabel}>Total Geral</div>
          <div style={{ ...styles.kpiValor, color: C.verde }}>{brl(totalGeral)}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Nota de Serviço</div>
          <div style={styles.kpiValor}>{brl(totalServico)}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Locação (ND)</div>
          <div style={styles.kpiValor}>{brl(totalLocacao)}</div>
        </div>
      </div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '20px 0 10px' }}>
        Sintético — por mês
      </div>
      {sintetico.length === 0 ? (
        <div style={styles.empty}>Sem faturamento importado ainda.</div>
      ) : (
        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>{['Mês', 'Nota de Serviço', 'Locação (ND)', 'Total'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {sintetico.map((m, i) => {
                const anterior = sintetico[i - 1];
                const pct = anterior ? variacaoPct(m.total, anterior.total) : null;
                return (
                  <tr key={m.competencia}>
                    <td style={styles.td}>{mesLabel(m.competencia)}</td>
                    <td style={styles.tdMono}>{brl(m.servico)}</td>
                    <td style={styles.tdMono}>{brl(m.locacao)}</td>
                    <td style={{ ...styles.tdMono, fontWeight: 700 }}>{brl(m.total)}<Variacao pct={pct} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.bgLeve }}>
                <td style={styles.tf}>Total do ano</td>
                <td style={styles.tfMono}>{brl(totalServico)}</td>
                <td style={styles.tfMono}>{brl(totalLocacao)}</td>
                <td style={styles.tfMono}>{brl(totalGeral)}</td>
              </tr>
              <tr style={{ background: C.bgLeve }}>
                <td style={styles.tf}>Média/mês</td>
                <td style={styles.tfMono}>{brl(sintetico.reduce((s, m) => s + m.servico, 0) / sintetico.length)}</td>
                <td style={styles.tfMono}>{brl(sintetico.reduce((s, m) => s + m.locacao, 0) / sintetico.length)}</td>
                <td style={styles.tfMono}>{brl(mediaAno)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.prata, marginTop: 6 }}>Sinalizado ▲/▼ quando o Total do mês varia mais de 10% em relação ao mês anterior.</div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '28px 0 10px' }}>
        Analítico — por cliente
      </div>
      {analiticoClientes.length === 0 ? (
        <div style={styles.empty}>Sem faturamento importado ainda.</div>
      ) : (
        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>{['Cliente', 'Lançamentos', 'Total'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {analiticoClientes.map(c => (
                <tr key={c.nome}>
                  <td style={styles.td}>{c.nome}</td>
                  <td style={styles.tdMono}>{c.n}</td>
                  <td style={styles.tdMono}>{brl(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
