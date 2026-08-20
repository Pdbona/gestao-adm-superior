import React, { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarDespesas, listarFornecedores, listarCentrosCusto } from '../lib/db';
import { Variacao } from './Variacao';

export default function DespesasTab() {
  const [despesas, setDespesas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ccSelecionado, setCcSelecionado] = useState('');

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const [d, f, cc] = await Promise.all([listarDespesas(), listarFornecedores(), listarCentrosCusto()]);
      setDespesas(d); setFornecedores(f); setCentrosCusto(cc);
      setCarregando(false);
    })();
  }, []);

  const fornecedoresMapa = useMemo(() => new Map(fornecedores.map(f => [f.codigo, f])), [fornecedores]);
  /* só entram despesas de fornecedor validado "é do CD" — é a mesma regra
     usada na aba Resultado */
  const validadas = useMemo(() => despesas.filter(d => fornecedoresMapa.get(d.fornecedorCodigo)?.ehDoCD === true), [despesas, fornecedoresMapa]);

  /* ---------- Sintético: mês (linha, crescente) x Centro de Custo (coluna) ---------- */
  const sintetico = useMemo(() => {
    const ccsComDado = [...new Set(validadas.map(d => fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId || 'sem_cc'))];
    const colunas = ccsComDado.map(id => ({ id, nome: id === 'sem_cc' ? 'Não Classificado' : (centrosCusto.find(c => c.id === id)?.nome || '—') })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const porMes = {};
    validadas.forEach(d => {
      if (!d.competencia) return;
      if (!porMes[d.competencia]) porMes[d.competencia] = { competencia: d.competencia, total: 0, porCC: {} };
      const ccId = fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId || 'sem_cc';
      porMes[d.competencia].porCC[ccId] = (porMes[d.competencia].porCC[ccId] || 0) + d.valor;
      porMes[d.competencia].total += d.valor;
    });
    const linhas = Object.values(porMes).sort((a, b) => a.competencia.localeCompare(b.competencia));
    return { colunas, linhas };
  }, [validadas, fornecedoresMapa, centrosCusto]);

  const totalGeral = sintetico.linhas.reduce((s, l) => s + l.total, 0);
  const mediaGeral = sintetico.linhas.length ? totalGeral / sintetico.linhas.length : 0;

  /* ---------- Analítico: escolhe um CC, vê por fornecedor ---------- */
  const ccsDisponiveis = useMemo(() => {
    const ids = [...new Set(validadas.map(d => fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId || 'sem_cc'))];
    return ids.map(id => ({ id, nome: id === 'sem_cc' ? 'Não Classificado' : (centrosCusto.find(c => c.id === id)?.nome || '—') })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [validadas, fornecedoresMapa, centrosCusto]);

  const ccAtivo = ccSelecionado || ccsDisponiveis[0]?.id || '';

  const analitico = useMemo(() => {
    const porFornecedor = {};
    validadas.forEach(d => {
      const ccId = fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId || 'sem_cc';
      if (ccId !== ccAtivo) return;
      if (!porFornecedor[d.fornecedorCodigo]) porFornecedor[d.fornecedorCodigo] = { nome: d.fornecedorNome, total: 0, n: 0 };
      porFornecedor[d.fornecedorCodigo].total += d.valor;
      porFornecedor[d.fornecedorCodigo].n += 1;
    });
    return Object.values(porFornecedor).sort((a, b) => b.total - a.total);
  }, [validadas, fornecedoresMapa, ccAtivo]);

  if (carregando) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <div style={styles.secTitle}><Wallet size={19} /> Despesas</div>

      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderTopColor: C.vermelho }}>
          <div style={styles.kpiLabel}>Total (todos os meses)</div>
          <div style={{ ...styles.kpiValor, color: C.vermelho }}>{brl(totalGeral)}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Média mensal</div>
          <div style={styles.kpiValor}>{brl(mediaGeral)}</div>
          <div style={styles.kpiNota}>{sintetico.linhas.length} mês(es) com lançamento</div>
        </div>
      </div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '20px 0 10px' }}>
        Sintético — por Centro de Custo
      </div>
      {sintetico.linhas.length === 0 ? (
        <div style={styles.empty}>Sem despesas validadas ainda. Importe em Importação e valide os fornecedores.</div>
      ) : (
        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>
              <th style={styles.th}>Mês</th>
              {sintetico.colunas.map(c => <th key={c.id} style={styles.th}>{c.nome}</th>)}
              <th style={styles.th}>Total</th>
            </tr></thead>
            <tbody>
              {sintetico.linhas.map((l, i) => {
                const anterior = sintetico.linhas[i - 1];
                const pct = anterior ? variacaoPct(l.total, anterior.total) : null;
                return (
                  <tr key={l.competencia}>
                    <td style={styles.td}>{mesLabel(l.competencia)}</td>
                    {sintetico.colunas.map(c => <td key={c.id} style={styles.tdMono}>{l.porCC[c.id] ? brl(l.porCC[c.id]) : '—'}</td>)}
                    <td style={{ ...styles.tdMono, fontWeight: 700 }}>{brl(l.total)}<Variacao pct={pct} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.bgLeve }}>
                <td style={styles.tf}>Total</td>
                {sintetico.colunas.map(c => (
                  <td key={c.id} style={styles.tfMono}>{brl(sintetico.linhas.reduce((s, l) => s + (l.porCC[c.id] || 0), 0))}</td>
                ))}
                <td style={styles.tfMono}>{brl(totalGeral)}</td>
              </tr>
              <tr style={{ background: C.bgLeve }}>
                <td style={styles.tf}>Média/mês</td>
                {sintetico.colunas.map(c => (
                  <td key={c.id} style={styles.tfMono}>{brl(sintetico.linhas.reduce((s, l) => s + (l.porCC[c.id] || 0), 0) / sintetico.linhas.length)}</td>
                ))}
                <td style={styles.tfMono}>{brl(mediaGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.prata, marginTop: 6 }}>Sinalizado ▲/▼ quando o Total do mês varia mais de 10% em relação ao mês anterior.</div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '28px 0 10px' }}>
        Analítico — por fornecedor dentro do Centro de Custo
      </div>
      {ccsDisponiveis.length === 0 ? (
        <div style={styles.empty}>Sem despesas validadas ainda.</div>
      ) : (
        <>
          <select value={ccAtivo} onChange={e => setCcSelecionado(e.target.value)} style={{ ...styles.input, maxWidth: 280, marginBottom: 12 }}>
            {ccsDisponiveis.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
          </select>
          <div className="scroll-x" style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead><tr>{['Fornecedor', 'Lançamentos', 'Total'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {analitico.map(f => (
                  <tr key={f.nome}>
                    <td style={styles.td}>{f.nome}</td>
                    <td style={styles.tdMono}>{f.n}</td>
                    <td style={styles.tdMono}>{brl(f.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: C.bgLeve }}>
                  <td style={styles.tf}>Total do centro de custo</td>
                  <td style={styles.tfMono}>{analitico.reduce((s, f) => s + f.n, 0)}</td>
                  <td style={styles.tfMono}>{brl(analitico.reduce((s, f) => s + f.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
