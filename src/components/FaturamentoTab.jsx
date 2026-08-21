import React, { useEffect, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarFaturamento } from '../lib/db';
import { Variacao } from './Variacao';
import ErroCarregamento from './ErroCarregamento';
import DetalheModal from './DetalheModal';
import { agruparFaturamentoPorCliente, COLUNAS_FATURAMENTO_POR_CLIENTE } from '../lib/agregacoes';

const chaveCliente = (l) => l.clienteNome || l.clienteCodigo || '—';
const chaveItem = (l) => l.categoriaLabel || (l.tipo === 'locacao' ? 'Locação (ND)' : 'Outros');

/* mês (linha, crescente) x uma dimensão qualquer (coluna, ordenada por
   total decrescente) — mesmo padrão do Sintético de Despesas, reusado
   aqui pra Cliente e pra Item de Faturamento (combinado com Pablo em
   21/ago/2026: "pra verificarmos a evolução por cliente/item"). */
function matrizMensal(lancamentos, chaveDe) {
  const totalPorChave = {};
  lancamentos.forEach(l => { const k = chaveDe(l); totalPorChave[k] = (totalPorChave[k] || 0) + (l.valor || 0); });
  const colunas = Object.keys(totalPorChave).sort((a, b) => totalPorChave[b] - totalPorChave[a]);
  const porMes = {};
  lancamentos.forEach(l => {
    if (!l.competencia) return;
    const k = chaveDe(l);
    if (!porMes[l.competencia]) porMes[l.competencia] = { competencia: l.competencia, porChave: {}, total: 0 };
    porMes[l.competencia].porChave[k] = (porMes[l.competencia].porChave[k] || 0) + (l.valor || 0);
    porMes[l.competencia].total += l.valor || 0;
  });
  const linhasMes = Object.values(porMes).sort((a, b) => a.competencia.localeCompare(b.competencia));
  return { colunas, linhasMes, totalPorChave };
}

/* Total em navy (forte) e Média em azul claro — pedido do Pablo em
   21/ago/2026 pra chamar mais atenção pros dois números-resumo. */
function RodapeDestaque({ matriz }) {
  const totalGeral = matriz.linhasMes.reduce((s, l) => s + l.total, 0);
  const media = matriz.linhasMes.length ? totalGeral / matriz.linhasMes.length : 0;
  return (
    <tfoot>
      <tr style={{ background: C.navy }}>
        <td style={{ ...styles.tf, color: C.branco }}>Total</td>
        {matriz.colunas.map(c => <td key={c} style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(matriz.totalPorChave[c])}</td>)}
        <td style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalGeral)}</td>
      </tr>
      <tr style={{ background: '#EAF2F9' }}>
        <td style={{ ...styles.tf, color: C.navy2 }}>Média/mês</td>
        {matriz.colunas.map(c => <td key={c} style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl((matriz.totalPorChave[c] || 0) / matriz.linhasMes.length)}</td>)}
        <td style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(media)}</td>
      </tr>
    </tfoot>
  );
}

function TabelaMatriz({ matriz, colunaLabel, onClique }) {
  return (
    <div className="scroll-x" style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead><tr>
          <th style={styles.th}>Mês</th>
          {matriz.colunas.map(c => <th key={c} style={styles.th}>{c}</th>)}
          <th style={styles.th}>Total</th>
        </tr></thead>
        <tbody>
          {matriz.linhasMes.map((l, i) => {
            const anterior = matriz.linhasMes[i - 1];
            const pct = anterior ? variacaoPct(l.total, anterior.total) : null;
            return (
              <tr key={l.competencia}>
                <td style={styles.td}>{mesLabel(l.competencia)}</td>
                {matriz.colunas.map(c => l.porChave[c] ? (
                  <td key={c} style={styles.tdValorClicavel} onClick={() => onClique(l.competencia, c)}>{brl(l.porChave[c])}</td>
                ) : <td key={c} style={styles.tdMono}>—</td>)}
                <td style={{ ...styles.tdMono, fontWeight: 700 }}>{brl(l.total)}<Variacao pct={pct} /></td>
              </tr>
            );
          })}
        </tbody>
        <RodapeDestaque matriz={matriz} />
      </table>
    </div>
  );
}

export default function FaturamentoTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

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

  const matrizClientes = useMemo(() => matrizMensal(lancamentos, chaveCliente), [lancamentos]);
  const matrizItens = useMemo(() => matrizMensal(lancamentos, chaveItem), [lancamentos]);

  /* sempre resume por cliente (Nota de Serviço x Locação, ordem decrescente
     de total) — lançamento cru individual é ruído demais aqui, combinado
     com Pablo em 21/ago/2026. */
  const abrirDetalheSintetico = (competencia, tipo) => {
    const linhas = lancamentos.filter(l => l.competencia === competencia && (!tipo || l.tipo === tipo));
    setDetalhe({
      titulo: `${tipo === 'servico' ? 'Nota de Serviço' : tipo === 'locacao' ? 'Locação (ND)' : 'Faturamento'} — ${mesLabel(competencia)}`,
      subtitulo: `Por cliente · ${linhas.length} lançamento(s)`,
      colunas: COLUNAS_FATURAMENTO_POR_CLIENTE, linhas: agruparFaturamentoPorCliente(linhas)
    });
  };

  const abrirDetalheMatriz = (competencia, chave, chaveDe) => {
    const linhas = lancamentos.filter(l => l.competencia === competencia && chaveDe(l) === chave);
    setDetalhe({
      titulo: `${chave} — ${mesLabel(competencia)}`, subtitulo: `Por cliente · ${linhas.length} lançamento(s)`,
      colunas: COLUNAS_FATURAMENTO_POR_CLIENTE, linhas: agruparFaturamentoPorCliente(linhas)
    });
  };

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
                    <td style={styles.tdValorClicavel} onClick={() => abrirDetalheSintetico(m.competencia, 'servico')}>{brl(m.servico)}</td>
                    <td style={styles.tdValorClicavel} onClick={() => abrirDetalheSintetico(m.competencia, 'locacao')}>{brl(m.locacao)}</td>
                    <td style={{ ...styles.tdValorClicavel, fontWeight: 700 }} onClick={() => abrirDetalheSintetico(m.competencia)}>{brl(m.total)}<Variacao pct={pct} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.navy }}>
                <td style={{ ...styles.tf, color: C.branco }}>Total do ano</td>
                <td style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalServico)}</td>
                <td style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalLocacao)}</td>
                <td style={{ ...styles.tfMono, color: C.branco, fontWeight: 800 }}>{brl(totalGeral)}</td>
              </tr>
              <tr style={{ background: '#EAF2F9' }}>
                <td style={{ ...styles.tf, color: C.navy2 }}>Média/mês</td>
                <td style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(sintetico.reduce((s, m) => s + m.servico, 0) / sintetico.length)}</td>
                <td style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(sintetico.reduce((s, m) => s + m.locacao, 0) / sintetico.length)}</td>
                <td style={{ ...styles.tfMono, color: C.navy2, fontWeight: 700 }}>{brl(mediaAno)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.prata, marginTop: 6 }}>Sinalizado ▲/▼ quando o Total do mês varia mais de 10% em relação ao mês anterior.</div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '28px 0 10px' }}>
        Analítico — por cliente, mês a mês
      </div>
      {matrizClientes.colunas.length === 0 ? (
        <div style={styles.empty}>Sem faturamento importado ainda.</div>
      ) : (
        <TabelaMatriz matriz={matrizClientes} onClique={(competencia, cliente) => abrirDetalheMatriz(competencia, cliente, chaveCliente)} />
      )}

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, margin: '28px 0 10px' }}>
        Analítico — por item de faturamento, mês a mês
      </div>
      {matrizItens.colunas.length === 0 ? (
        <div style={styles.empty}>Sem faturamento importado ainda.</div>
      ) : (
        <TabelaMatriz matriz={matrizItens} onClique={(competencia, item) => abrirDetalheMatriz(competencia, item, chaveItem)} />
      )}

      <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  );
}
