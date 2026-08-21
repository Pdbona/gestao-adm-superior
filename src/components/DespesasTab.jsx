import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Landmark } from 'lucide-react';
import { C, styles, brl, mesLabel, variacaoPct } from '../styles';
import { listarDespesas, listarFornecedores, listarCentrosCusto } from '../lib/db';
import { Variacao } from './Variacao';
import ErroCarregamento from './ErroCarregamento';
import DetalheModal from './DetalheModal';
import FolhaMatrizTab from './FolhaMatrizTab';
import { agruparDespesaPorCC, COLUNAS_DESPESA_POR_CC } from '../lib/agregacoes';

const COLUNAS_DETALHE = [
  { key: 'emissao', label: 'Emissão', formato: 'data' },
  { key: 'documento', label: 'Documento' },
  { key: 'fornecedorNome', label: 'Fornecedor' },
  { key: 'tipoDocumentoLabel', label: 'Tipo' },
  { key: 'valor', label: 'Valor', formato: 'moeda' }
];

const SUBITENS = [
  { id: 'gerais', label: 'Despesas Gerais', icon: Wallet },
  { id: 'folha', label: 'Folha de Pagto', icon: Landmark }
];

export default function DespesasTab() {
  const [despesas, setDespesas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [ccSelecionado, setCcSelecionado] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [subitem, setSubitem] = useState('gerais');

  const carregar = async () => {
    setCarregando(true); setErro(false);
    try {
      const [d, f, cc] = await Promise.all([listarDespesas(), listarFornecedores(), listarCentrosCusto()]);
      setDespesas(d); setFornecedores(f); setCentrosCusto(cc);
    } catch (e) {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); }, []);

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
      if (!porFornecedor[d.fornecedorCodigo]) porFornecedor[d.fornecedorCodigo] = { codigo: d.fornecedorCodigo, nome: d.fornecedorNome, total: 0, n: 0 };
      porFornecedor[d.fornecedorCodigo].total += d.valor;
      porFornecedor[d.fornecedorCodigo].n += 1;
    });
    return Object.values(porFornecedor).sort((a, b) => b.total - a.total);
  }, [validadas, fornecedoresMapa, ccAtivo]);

  const ccIdDe = (d) => fornecedoresMapa.get(d.fornecedorCodigo)?.centroCustoId || 'sem_cc';
  const nomeCC = (id) => id === 'sem_cc' ? 'Não Classificado' : (centrosCusto.find(c => c.id === id)?.nome || '—');

  /* célula do Sintético: mês + Centro de Custo (lista crua, já vem bem
     recortada) — ou mês inteiro sem ccId (Total do mês, mistura todos os
     CCs), aí resume por Centro de Custo em vez de listar cada lançamento
     (combinado com Pablo em 21/ago/2026). */
  const abrirDetalheSintetico = (competencia, ccId) => {
    const linhas = validadas.filter(d => d.competencia === competencia && (!ccId || ccIdDe(d) === ccId));
    if (!ccId) {
      setDetalhe({
        titulo: `Todas as despesas — ${mesLabel(competencia)}`,
        subtitulo: `Por Centro de Custo · ${linhas.length} lançamento(s) validado(s)`,
        colunas: COLUNAS_DESPESA_POR_CC, linhas: agruparDespesaPorCC(linhas, fornecedoresMapa, centrosCusto)
      });
      return;
    }
    setDetalhe({
      titulo: `${nomeCC(ccId)} — ${mesLabel(competencia)}`,
      subtitulo: `${linhas.length} lançamento(s) validado(s)`,
      colunas: COLUNAS_DETALHE, linhas
    });
  };

  /* linha do Analítico: fornecedor dentro do CC ativo */
  const abrirDetalheFornecedor = (fornecedorCodigo, nome) => {
    const linhas = validadas.filter(d => d.fornecedorCodigo === fornecedorCodigo && ccIdDe(d) === ccAtivo);
    setDetalhe({
      titulo: nome, subtitulo: `${nomeCC(ccAtivo)} — todos os meses`,
      colunas: COLUNAS_DETALHE.filter(c => c.key !== 'fornecedorNome'), linhas
    });
  };

  return (
    <div>
      <div style={styles.secTitle}><Wallet size={19} /> Despesas</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.prataClaro}`, paddingBottom: 14 }}>
        {SUBITENS.map(s => {
          const Icone = s.icon;
          const ativo = subitem === s.id;
          return (
            <button key={s.id} onClick={() => setSubitem(s.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 20,
              padding: '8px 16px', cursor: 'pointer', fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
              fontSize: 12.5, background: ativo ? C.navy : C.bgLeve, color: ativo ? C.branco : C.navy2
            }}>
              <Icone size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {subitem === 'folha' ? (
        <FolhaMatrizTab />
      ) : erro ? (
        <ErroCarregamento onTentarDeNovo={carregar} />
      ) : carregando ? (
        <div style={styles.empty}>Carregando…</div>
      ) : (
      <>
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
                    {sintetico.colunas.map(c => l.porCC[c.id] ? (
                      <td key={c.id} style={styles.tdValorClicavel} onClick={() => abrirDetalheSintetico(l.competencia, c.id)}>{brl(l.porCC[c.id])}</td>
                    ) : <td key={c.id} style={styles.tdMono}>—</td>)}
                    <td style={{ ...styles.tdValorClicavel, fontWeight: 700 }} onClick={() => abrirDetalheSintetico(l.competencia)}>{brl(l.total)}<Variacao pct={pct} /></td>
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
                    <td style={styles.tdValorClicavel} onClick={() => abrirDetalheFornecedor(f.codigo, f.nome)}>{brl(f.total)}</td>
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
      </>
      )}
      <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  );
}
