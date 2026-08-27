import React, { useEffect, useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarFaturamento, listarDespesas, listarFornecedores, listarFolha, listarCentrosCusto } from '../lib/db';
import { Variacao } from './Variacao';
import ErroCarregamento from './ErroCarregamento';
import DetalheModal from './DetalheModal';
import GraficoResultado from './GraficoResultado';
import GraficoMedias from './GraficoMedias';
import { agruparFaturamentoPorCliente, COLUNAS_FATURAMENTO_POR_CLIENTE, agruparDespesaPorCC, COLUNAS_DESPESA_POR_CC } from '../lib/agregacoes';

/* Resultado = Faturamento Total − (Despesa Total + RH Total).
   Combinado com Pablo em 20/ago/2026. Despesa Total aqui é só fornecedor
   validado "é do CD" (mesma regra de sempre); RH Total é a Folha de
   Pagamento (Total Líquido a Pagar + Férias, do mês). */
export default function ResultadoTab() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  const carregar = async () => {
    setErro(false);
    try {
      const [faturamento, despesas, fornecedores, folha, centrosCusto] = await Promise.all([
        listarFaturamento(), listarDespesas(), listarFornecedores(), listarFolha(), listarCentrosCusto()
      ]);
      setDados({ faturamento, despesas, fornecedores, folha, centrosCusto });
    } catch (e) {
      setErro(true);
    }
  };
  useEffect(() => { carregar(); }, []);

  const meses = useMemo(() => {
    if (!dados) return [];
    const fornecedoresMapa = new Map(dados.fornecedores.map(f => [f.codigo, f]));
    const m = {};
    const touch = (c) => { if (!m[c]) m[c] = { competencia: c, faturamento: 0, despesa: 0, rh: 0 }; return m[c]; };

    dados.faturamento.forEach(l => { if (l.competencia) touch(l.competencia).faturamento += l.valor || 0; });
    dados.despesas.forEach(d => {
      if (!d.competencia) return;
      if (fornecedoresMapa.get(d.fornecedorCodigo)?.ehDoCD === true) touch(d.competencia).despesa += d.valor || 0;
    });
    dados.folha.forEach(h => { touch(h.competencia).rh += (h.totalLiquidoPagar || 0) + (h.totalLiquidoPagarFerias || 0); });

    return Object.values(m)
      .map(x => {
        const resultado = x.faturamento - (x.despesa + x.rh);
        return { ...x, resultado, resultadoPct: x.faturamento ? (resultado / x.faturamento) * 100 : 0 };
      })
      .sort((a, b) => a.competencia.localeCompare(b.competencia));
  }, [dados]);

  const totais = useMemo(() => {
    const faturamento = meses.reduce((s, m) => s + m.faturamento, 0);
    const despesa = meses.reduce((s, m) => s + m.despesa, 0);
    const rh = meses.reduce((s, m) => s + m.rh, 0);
    const resultado = faturamento - (despesa + rh);
    return { faturamento, despesa, rh, resultado, resultadoPct: faturamento ? (resultado / faturamento) * 100 : 0 };
  }, [meses]);

  /* resume por cliente (Faturamento) e por Centro de Custo (Despesa) em
     vez de listar lançamento cru — combinado com Pablo em 21/ago/2026. */
  const abrirDetalheFaturamento = (competencia) => {
    const linhas = dados.faturamento.filter(l => l.competencia === competencia);
    setDetalhe({
      titulo: `Faturamento — ${mesLabel(competencia)}`, subtitulo: `Por cliente · ${linhas.length} lançamento(s)`,
      colunas: COLUNAS_FATURAMENTO_POR_CLIENTE, linhas: agruparFaturamentoPorCliente(linhas, competencia)
    });
  };

  const abrirDetalheDespesa = (competencia) => {
    const fornecedoresMapa = new Map(dados.fornecedores.map(f => [f.codigo, f]));
    const linhas = dados.despesas.filter(d => d.competencia === competencia && fornecedoresMapa.get(d.fornecedorCodigo)?.ehDoCD === true);
    setDetalhe({
      titulo: `Despesa — ${mesLabel(competencia)}`, subtitulo: `Por Centro de Custo · ${linhas.length} lançamento(s) validado(s)`,
      colunas: COLUNAS_DESPESA_POR_CC, linhas: agruparDespesaPorCC(linhas, fornecedoresMapa, dados.centrosCusto, competencia)
    });
  };

  if (erro) return <ErroCarregamento onTentarDeNovo={carregar} />;
  if (!dados) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <div style={styles.secTitle}><LineChart size={19} /> Resultado</div>
      <p style={styles.helper}>Resultado = Faturamento Total − (Despesa Total + RH Total), mês a mês.</p>

      {meses.length === 0 ? (
        <div style={styles.empty}>Sem dados ainda — importe Faturamento, Despesas e Folha de Pagamento em Importação.</div>
      ) : (
        <>
          <div style={styles.kpiGrid}>
            <div style={{ ...styles.kpiCard, borderTopColor: C.azul }}>
              <div style={styles.kpiLabel}>Faturamento Total</div>
              <div style={{ ...styles.kpiValor, color: C.azul }}>{brl(totais.faturamento)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.laranja }}>
              <div style={styles.kpiLabel}>Despesa Total</div>
              <div style={{ ...styles.kpiValor, color: C.laranjaEsc }}>{brl(totais.despesa)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.laranja }}>
              <div style={styles.kpiLabel}>RH Total</div>
              <div style={{ ...styles.kpiValor, color: C.laranjaEsc }}>{brl(totais.rh)}</div>
            </div>
            <div style={{ ...styles.kpiCard, borderTopColor: C.navy }}>
              <div style={styles.kpiLabel}>Resultado</div>
              <div style={{ ...styles.kpiValor, color: totais.resultado >= 0 ? C.navy : C.vermelho }}>{brl(totais.resultado)}</div>
              <div style={styles.kpiNota}>{totais.resultadoPct.toFixed(1)}% do faturado</div>
            </div>
          </div>

          <div style={{
            ...styles.card, borderTop: `4px solid ${C.navy}`, padding: '22px 24px 16px', marginBottom: 26,
            boxShadow: '0 6px 24px rgba(30,58,95,.12)'
          }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ flex: '4 1 600px', minWidth: 360 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 14.5, color: C.navy, marginBottom: 4 }}>
                  Evolução Mensal - Faturamento, Despesas/Custos e Resultado
                </div>
                <p style={{ ...styles.helper, marginBottom: 14 }}>Passe o mouse sobre um mês pra ver o detalhe. Saída = Despesa Total + RH Total.</p>
                <GraficoResultado meses={meses} />
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 200, maxWidth: 240, borderLeft: `1px solid ${C.prataClaro}`, paddingLeft: 24, display: 'flex' }}>
                <GraficoMedias meses={meses} />
              </div>
            </div>
          </div>

          <div className="scroll-x" style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={styles.table}>
              <thead><tr>{['Mês', 'Faturamento Total', 'Despesa Total', 'RH Total', 'Resultado (R$)', 'Resultado (%)'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {meses.map((m, i) => {
                  const anterior = meses[i - 1];
                  const pct = anterior ? variacaoPct(m.resultado, anterior.resultado) : null;
                  return (
                    <tr key={m.competencia}>
                      <td style={styles.td}>{mesLabel(m.competencia)}</td>
                      <td style={styles.tdValorClicavel} onClick={() => abrirDetalheFaturamento(m.competencia)}>{brl(m.faturamento)}</td>
                      <td style={styles.tdValorClicavel} onClick={() => abrirDetalheDespesa(m.competencia)}>{brl(m.despesa)}</td>
                      <td style={styles.tdMono}>{brl(m.rh)}</td>
                      <td style={{ ...styles.tdMono, fontWeight: 700, color: m.resultado >= 0 ? C.verde : C.vermelho }}>{brl(m.resultado)}<Variacao pct={pct} /></td>
                      <td style={styles.tdMono}>{m.resultadoPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: C.bgLeve }}>
                  <td style={styles.tf}>Total</td>
                  <td style={styles.tfMono}>{brl(totais.faturamento)}</td>
                  <td style={styles.tfMono}>{brl(totais.despesa)}</td>
                  <td style={styles.tfMono}>{brl(totais.rh)}</td>
                  <td style={styles.tfMono}>{brl(totais.resultado)}</td>
                  <td style={styles.tfMono}>{totais.resultadoPct.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ fontSize: 11, color: C.prata, marginTop: 6 }}>Sinalizado ▲/▼ quando o Resultado do mês varia mais de 10% em relação ao mês anterior.</div>
        </>
      )}
      <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  );
}
