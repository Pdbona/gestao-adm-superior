import React, { useEffect, useState } from 'react';
import { Building2, Check, X, AlertTriangle, Plus } from 'lucide-react';
import { C, styles } from '../styles';
import { listarFornecedores, validarFornecedor, listarCentrosCusto, criarCentroCusto } from '../lib/db';

export default function FornecedoresTab({ usuario }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [ccEscolha, setCcEscolha] = useState({}); // { [codigoFornecedor]: centroCustoId }
  const [novoCC, setNovoCC] = useState('');
  const [salvandoCC, setSalvandoCC] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const [f, cc] = await Promise.all([listarFornecedores(), listarCentrosCusto()]);
    setFornecedores(f); setCentrosCusto(cc);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const ccPara = (f) => ccEscolha[f.codigo] ?? f.centroCustoId ?? f.centroCustoSugeridoId ?? '';

  const validar = async (codigo, ehDoCD) => {
    const centroCustoId = ccEscolha[codigo] ?? fornecedores.find(f => f.codigo === codigo)?.centroCustoSugeridoId ?? null;
    setProcessando(codigo);
    await validarFornecedor(codigo, { ehDoCD, centroCustoId }, usuario);
    await carregar();
    setProcessando(null);
  };

  const trocarCC = async (codigo, centroCustoId, jaValidado) => {
    setCcEscolha(s => ({ ...s, [codigo]: centroCustoId }));
    if (jaValidado) {
      const f = fornecedores.find(x => x.codigo === codigo);
      await validarFornecedor(codigo, { ehDoCD: f.ehDoCD, centroCustoId }, usuario);
      await carregar();
    }
  };

  const adicionarCC = async () => {
    if (!novoCC.trim()) return;
    setSalvandoCC(true);
    await criarCentroCusto(novoCC);
    setNovoCC('');
    await carregar();
    setSalvandoCC(false);
  };

  const nomeCC = (id) => centrosCusto.find(c => c.id === id)?.nome || '—';

  const pendentes = fornecedores.filter(f => f.ehDoCD == null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const validados = fornecedores.filter(f => f.ehDoCD != null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const seletorCC = (f, jaValidado) => (
    <select style={{ ...styles.input, fontSize: 12.5, padding: '7px 9px' }}
      value={ccPara(f)} onChange={e => trocarCC(f.codigo, e.target.value, jaValidado)}>
      <option value="">Centro de custo…</option>
      {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
    </select>
  );

  return (
    <div>
      <div style={styles.secTitle}><Building2 size={19} /> Fornecedores</div>
      <p style={styles.helper}>
        Toda importação de Despesas cadastra automaticamente os fornecedores que ainda não conhece,
        já com uma <b>sugestão de Centro de Custo</b> (baseada no tipo de documento mais comum daquele
        fornecedor — confirme ou troque). Valide se cada um <b>é do CD</b>: só entra nos totais depois
        de validado "Sim", e a validação vale também pros lançamentos já importados antes.
      </p>

      <div style={{ ...styles.card, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
          Centros de Custo cadastrados
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {centrosCusto.map(cc => <span key={cc.id} style={styles.infoChip}>{cc.nome}</span>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={novoCC} onChange={e => setNovoCC(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarCC()}
            placeholder="Novo centro de custo…" style={{ ...styles.input, maxWidth: 280 }} />
          <button onClick={adicionarCC} disabled={salvandoCC || !novoCC.trim()}
            style={{ ...styles.btnGhost, opacity: novoCC.trim() ? 1 : .5 }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div style={{
        fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy,
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8
      }}>
        Pendentes de validação
        {pendentes.length > 0 && (
          <span style={{ ...styles.pill, background: '#FFF3E0', color: C.laranjaEsc }}>{pendentes.length}</span>
        )}
      </div>

      {carregando ? (
        <div style={styles.empty}>Carregando…</div>
      ) : pendentes.length === 0 ? (
        <div style={styles.empty}>Nenhum fornecedor pendente — tudo validado.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {pendentes.map(f => (
            <div key={f.codigo} style={{
              ...styles.card, padding: '13px 16px', display: 'flex', alignItems: 'center',
              gap: 12, flexWrap: 'wrap', borderLeft: `4px solid ${C.laranja}`
            }}>
              <AlertTriangle size={16} color={C.laranjaEsc} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 11, color: C.prata }}>{f.codigo}</div>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy }}>{f.nome}</div>
              </div>
              <div style={{ minWidth: 170 }}>{seletorCC(f, false)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={processando === f.codigo} onClick={() => validar(f.codigo, true)} style={{
                  ...styles.btnPrimary, background: C.verde, boxShadow: 'none', padding: '9px 16px', fontSize: 12.5
                }}><Check size={14} /> É do CD</button>
                <button disabled={processando === f.codigo} onClick={() => validar(f.codigo, false)} style={{
                  ...styles.btnGhost, borderColor: C.vermelho, color: C.vermelho, padding: '9px 16px', fontSize: 12.5
                }}><X size={14} /> Não é</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
        Já validados ({validados.length})
      </div>
      {validados.length === 0 ? (
        <div style={styles.empty}>Nenhum fornecedor validado ainda.</div>
      ) : (
        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>{['Código', 'Fornecedor', 'Status', 'Centro de Custo'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {validados.map(f => (
                <tr key={f.codigo}>
                  <td style={styles.tdMono}>{f.codigo}</td>
                  <td style={styles.td}>{f.nome}</td>
                  <td style={styles.td}>
                    <button onClick={() => validar(f.codigo, !f.ehDoCD)} style={{
                      ...styles.pill, border: 'none', cursor: 'pointer',
                      background: f.ehDoCD ? '#EAF5EC' : '#FFEBEE',
                      color: f.ehDoCD ? C.verde : C.vermelho
                    }} title="Clique para inverter">{f.ehDoCD ? 'É do CD' : 'Não é do CD'}</button>
                  </td>
                  <td style={styles.td}>{f.ehDoCD ? seletorCC(f, true) : nomeCC(f.centroCustoId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
