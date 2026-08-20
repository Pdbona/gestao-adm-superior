import React, { useEffect, useState } from 'react';
import { Building2, Check, X, AlertTriangle } from 'lucide-react';
import { C, styles } from '../styles';
import { listarFornecedores, validarFornecedor } from '../lib/db';

export default function FornecedoresTab({ usuario }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);

  const carregar = async () => {
    setCarregando(true);
    setFornecedores(await listarFornecedores());
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const validar = async (codigo, ehDoCD) => {
    setProcessando(codigo);
    await validarFornecedor(codigo, ehDoCD, usuario);
    await carregar();
    setProcessando(null);
  };

  const pendentes = fornecedores.filter(f => f.ehDoCD == null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const validados = fornecedores.filter(f => f.ehDoCD != null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div>
      <div style={styles.secTitle}><Building2 size={19} /> Fornecedores</div>
      <p style={styles.helper}>
        Toda importação de Despesas cadastra automaticamente os fornecedores que ainda não conhece.
        Valide aqui se cada um <b>é do CD</b> — só entra nos totais de despesa depois de validado
        "Sim". A validação vale para todos os lançamentos daquele fornecedor, inclusive os já
        importados antes.
      </p>

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
            <thead><tr>{['Código', 'Fornecedor', 'Status', ''].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {validados.map(f => (
                <tr key={f.codigo}>
                  <td style={styles.tdMono}>{f.codigo}</td>
                  <td style={styles.td}>{f.nome}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.pill,
                      background: f.ehDoCD ? '#EAF5EC' : '#FFEBEE',
                      color: f.ehDoCD ? C.verde : C.vermelho
                    }}>{f.ehDoCD ? 'É do CD' : 'Não é do CD'}</span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => validar(f.codigo, !f.ehDoCD)} style={{
                      ...styles.btnGhost, padding: '5px 10px', fontSize: 11
                    }}>Inverter</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
