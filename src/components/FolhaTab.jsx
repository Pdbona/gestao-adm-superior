import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, CheckCircle2, AlertTriangle } from 'lucide-react';
import { C, styles, brl } from '../styles';
import { salvarFolha, listarFolha } from '../lib/db';

/* Os 10 itens extraídos do PDF "Resumo Geral" do RH — mesma lista já
   validada manualmente no projeto DRE_Diretoria_Superior. Preenchimento
   manual por enquanto: o PDF tem layout de relatório impresso (não é
   dado tabular), então a extração automática fica pra uma v2 — hoje quem
   lê o PDF e digita aqui é a Pablo (ou eu, no chat, e ele só confere). */
const CAMPOS = [
  { id: 'totalLiquidoPagar', label: 'Total Líquido a Pagar', destaque: true },
  { id: 'totalLiquidoPagarFerias', label: 'Total Líquido a Pagar (Férias)', destaque: true },
  { id: 'gps', label: 'Total Líquido (GPS)' },
  { id: 'fgtsApurado', label: 'Total FGTS apurado (recibos)' },
  { id: 'fgtsRecolhido', label: 'Total FGTS recolhido s/CS' },
  { id: 'emprestimo', label: 'Total de Empréstimo' },
  { id: 'irrfFolha', label: 'IRRF Folha' },
  { id: 'horaExtra50', label: 'Hora Extra 50% (401)' },
  { id: 'horaExtra100', label: 'Hora Extra 100% (402)' },
  { id: 'dsrHorasExtras', label: 'DSR s/ Horas Extras (420)' },
  { id: 'custoDemissao', label: 'Custo de Demissão (líq.)' }
];

const vazio = Object.fromEntries(CAMPOS.map(c => [c.id, '']));

export default function FolhaTab({ usuario }) {
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [valores, setValores] = useState(vazio);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setHistorico(await listarFolha());
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    const existente = historico.find(h => h.competencia === competencia);
    if (existente) {
      setValores(Object.fromEntries(CAMPOS.map(c => [c.id, existente[c.id] != null ? String(existente[c.id]) : ''])));
    } else {
      setValores(vazio);
    }
  }, [competencia, historico]);

  const set = (id, v) => setValores(s => ({ ...s, [id]: v }));

  const salvar = async () => {
    setSalvando(true); setErro(''); setMsg(null);
    try {
      const numericos = Object.fromEntries(CAMPOS.map(c => [c.id, parseFloat((valores[c.id] || '0').replace(',', '.')) || 0]));
      await salvarFolha(competencia, numericos, usuario);
      setMsg(`Folha de ${competencia} salva.`);
      await carregar();
    } catch (e) {
      setErro('Falha ao salvar no banco. Verifique a internet e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const custoFolhaMes = (h) => (h.totalLiquidoPagar || 0) + (h.totalLiquidoPagarFerias || 0);
  const totalAcumulado = useMemo(() => historico.reduce((s, h) => s + custoFolhaMes(h), 0), [historico]);

  return (
    <div>
      <div style={styles.secTitle}><Landmark size={19} /> Folha de Pagamento</div>
      <p style={styles.helper}>
        Um lançamento por mês, com os 10 itens do "Resumo Geral" do RH. Pro cálculo de RH Total na
        aba Resultado, conta só o <b>Total Líquido a Pagar</b> (+ a parcela de Férias, quando houver) —
        os demais itens ficam guardados como referência.
      </p>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Custo de folha acumulado</div>
          <div style={{ ...styles.kpiValor, color: C.vermelho }}>{brl(totalAcumulado)}</div>
          <div style={styles.kpiNota}>{historico.length} mês(es) lançado(s)</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ marginBottom: 14 }}>
          <label style={styles.fieldLabel}>Competência</label>
          <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
            style={{ ...styles.input, maxWidth: 200 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
          {CAMPOS.map(c => (
            <div key={c.id}>
              <label style={{ ...styles.fieldLabel, color: c.destaque ? C.laranjaEsc : C.navy2 }}>{c.label}</label>
              <input type="text" inputMode="decimal" placeholder="0,00" value={valores[c.id]}
                onChange={e => set(c.id, e.target.value)}
                style={{ ...styles.input, borderColor: c.destaque ? C.laranja : C.prataClaro }} />
            </div>
          ))}
        </div>

        {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
        {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

        <button onClick={salvar} disabled={salvando} style={{ ...styles.btnPrimary, marginTop: 16, opacity: salvando ? .7 : 1 }}>
          {salvando ? 'Salvando…' : `Salvar folha de ${competencia}`}
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
          Histórico mensal
        </div>
        {carregando ? (
          <div style={styles.empty}>Carregando…</div>
        ) : historico.length === 0 ? (
          <div style={styles.empty}>Nenhuma folha lançada ainda.</div>
        ) : (
          <div className="scroll-x" style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead><tr>{['Mês', 'Líquido a Pagar', 'Líquido (Férias)', 'Custo de Folha', 'Horas Extras (50+100)'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {historico.slice().sort((a, b) => b.competencia.localeCompare(a.competencia)).map(h => (
                  <tr key={h.id}>
                    <td style={styles.td}>{h.competencia}</td>
                    <td style={styles.tdMono}>{brl(h.totalLiquidoPagar)}</td>
                    <td style={styles.tdMono}>{brl(h.totalLiquidoPagarFerias)}</td>
                    <td style={{ ...styles.tdMono, fontWeight: 700 }}>{brl(custoFolhaMes(h))}</td>
                    <td style={styles.tdMono}>{brl((h.horaExtra50 || 0) + (h.horaExtra100 || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
