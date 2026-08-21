import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { C, styles, brl, fmtDataBR } from '../styles';

/* Modal genérico de "explodir detalhes" — abre ao clicar num valor
   agregado (Sintético/Analítico de Despesas e Faturamento, células da
   aba Resultado) e lista os lançamentos individuais por trás daquele
   número. Combinado com Pablo em 21/ago/2026. `linhas` é um array de
   objetos quaisquer; `colunas` descreve como render (key, label,
   formato: 'data'|'moeda'|undefined). */
export default function DetalheModal({ detalhe, onFechar }) {
  useEffect(() => {
    if (!detalhe) return;
    const onEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [detalhe, onFechar]);

  if (!detalhe) return null;
  const { titulo, subtitulo, colunas, linhas } = detalhe;
  const total = linhas.reduce((s, l) => s + (l.valor || 0), 0);

  const formatar = (col, valor) => {
    if (valor == null || valor === '') return '—';
    if (col.formato === 'moeda') return brl(valor);
    if (col.formato === 'data') return fmtDataBR(valor);
    return valor;
  };

  return (
    <div onClick={onFechar} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,43,60,.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.branco, borderRadius: 12, maxWidth: 760, width: '100%', maxHeight: '82vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(26,43,60,.35)'
      }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.prataClaro}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 15, color: C.navy }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 12, color: C.prata, marginTop: 3 }}>{subtitulo}</div>}
          </div>
          <button onClick={onFechar} style={{ ...styles.headerBtn, background: C.bgLeve, color: C.navy2, flexShrink: 0 }} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 22px' }}>
          {linhas.length === 0 ? (
            <div style={{ ...styles.empty, border: 'none', padding: '30px 0' }}>Nenhum lançamento encontrado.</div>
          ) : (
            <table style={{ ...styles.table, minWidth: 0, marginTop: 16 }}>
              <thead><tr>{colunas.map(c => <th key={c.key} style={styles.th}>{c.label}</th>)}</tr></thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i}>
                    {colunas.map(c => (
                      <td key={c.key} style={c.formato === 'moeda' ? styles.tdMono : styles.td}>{formatar(c, l[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${C.prataClaro}`, background: C.bgLeve,
          borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, color: C.prata }}>{linhas.length} lançamento(s)</span>
          <span style={{ fontFamily: "'Roboto Mono',monospace", fontWeight: 700, fontSize: 15, color: C.navy }}>{brl(total)}</span>
        </div>
      </div>
    </div>
  );
}
