import React, { useState } from 'react';
import { C, brl, mesLabel } from '../styles';

/* Gráfico de destaque da aba Resultado: Faturamento x Saída (Despesa+RH)
   em barras, com Resultado sobreposto em linha — os três na mesma escala
   de R$ (sem eixo duplo). Paleta ajustada a pedido em 21/ago/2026: azul
   mais forte (Faturamento), vermelho no lugar do laranja (Saída) e linha
   de Resultado em verde com sombreamento, mais grossa — diferenciados
   também pela forma (linha x barra), não só pela cor.
   Ajustes a pedido de Pablo em 27/ago/2026: barra de Saída segregada em
   Despesa (vermelho) + RH (laranja) com % de cada dentro da coluna; linha
   de Resultado mais grossa e com sombra no rótulo do último mês; eixo de
   valores em passos fixos de R$50 mil, com "k" no lugar de "mil" (o "R$"
   estava sendo cortado). */
export const AZUL_FORTE = "#1B5C8C";

const VBW = 800, VBH = 340;
const MARGEM = { topo: 26, baixo: 40, esquerda: 60, direita: 16 };
const PASSO_EIXO = 50000;

const fmtCompacto = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1000).toFixed(0)}k`;
  return brl(v);
};

function pathBarraTopoArredondado(x, yTopo, largura, yBase, r) {
  const rr = Math.max(0, Math.min(r, largura / 2, Math.abs(yBase - yTopo)));
  if (rr <= 0.5) return `M${x},${yBase} L${x},${yTopo} L${x + largura},${yTopo} L${x + largura},${yBase} Z`;
  return `M${x},${yBase} L${x},${yTopo + rr} Q${x},${yTopo} ${x + rr},${yTopo} L${x + largura - rr},${yTopo} Q${x + largura},${yTopo} ${x + largura},${yTopo + rr} L${x + largura},${yBase} Z`;
}

export default function GraficoResultado({ meses }) {
  const [hoverI, setHoverI] = useState(null);

  if (!meses || meses.length === 0) return null;

  const saidas = meses.map(m => m.despesa + m.rh);
  const rawMax = Math.max(1, ...meses.map(m => m.faturamento), ...saidas, ...meses.map(m => m.resultado));
  const rawMin = Math.min(0, ...meses.map(m => m.resultado));
  // eixo de valores em passos fixos de R$50 mil, com uma folga de ~8% acima do maior valor
  const valorMax = Math.ceil((rawMax * 1.08) / PASSO_EIXO) * PASSO_EIXO;
  const valorMin = rawMin < 0 ? Math.floor(rawMin / PASSO_EIXO) * PASSO_EIXO : 0;
  const span = valorMax - valorMin || 1;

  const plotW = VBW - MARGEM.esquerda - MARGEM.direita;
  const plotH = VBH - MARGEM.topo - MARGEM.baixo;
  const y = (v) => MARGEM.topo + plotH - ((v - valorMin) / span) * plotH;
  const y0 = y(0);

  const bandW = plotW / meses.length;
  const barW = Math.min(24, bandW * 0.3);
  const gap = 3;

  const linhasGrade = [];
  for (let v = valorMin; v <= valorMax + 1; v += PASSO_EIXO) linhasGrade.push(v);

  const pontosLinha = meses.map((m, i) => ({
    x: MARGEM.esquerda + bandW * i + bandW / 2,
    y: y(m.resultado)
  }));
  const dLinha = pontosLinha.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const dArea = `${dLinha} L${pontosLinha[pontosLinha.length - 1].x},${y0} L${pontosLinha[0].x},${y0} Z`;

  const hover = hoverI != null ? meses[hoverI] : null;
  const hoverX = hoverI != null ? MARGEM.esquerda + bandW * hoverI + bandW / 2 : 0;

  const MIN_ALTURA_ROTULO = 13;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 6, fontSize: 12, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: C.navy2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: AZUL_FORTE, display: 'inline-block' }} /> Faturamento</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.vermelho, display: 'inline-block' }} /> Despesa</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.laranja, display: 'inline-block' }} /> RH</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, background: C.verde, display: 'inline-block', borderRadius: 1.5 }} /> Resultado</span>
      </div>

      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="sombraRotuloResultado" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* gradeado horizontal, recessivo, em passos fixos de R$50 mil */}
        {linhasGrade.map((v, i) => (
          <g key={i}>
            <line x1={MARGEM.esquerda} x2={VBW - MARGEM.direita} y1={y(v)} y2={y(v)} stroke={C.prataClaro} strokeWidth={1} />
            <text x={MARGEM.esquerda - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={C.prata} fontFamily="'Roboto Mono',monospace">{fmtCompacto(v)}</text>
          </g>
        ))}
        {/* linha zero, um pouco mais forte, se houver valores negativos */}
        {valorMin < 0 && <line x1={MARGEM.esquerda} x2={VBW - MARGEM.direita} y1={y0} y2={y0} stroke={C.prata} strokeWidth={1} />}

        {/* barras: Faturamento e Saída (Despesa + RH empilhadas), agrupadas por mês */}
        {meses.map((m, i) => {
          const cx = MARGEM.esquerda + bandW * i + bandW / 2;
          const saida = m.despesa + m.rh;
          const xFat = cx - barW - gap / 2;
          const xSai = cx + gap / 2;
          const yDespesaTop = y(m.despesa);
          const ySaidaTop = y(saida);
          const despesaPct = saida > 0 ? (m.despesa / saida) * 100 : 0;
          const rhPct = saida > 0 ? (m.rh / saida) * 100 : 0;
          const altDespesa = y0 - yDespesaTop;
          const altRh = yDespesaTop - ySaidaTop;

          return (
            <g key={m.competencia}>
              <path d={pathBarraTopoArredondado(xFat, y(m.faturamento), barW, y0, 4)} fill={AZUL_FORTE} />

              {m.rh > 0 ? (
                <>
                  <rect x={xSai} y={yDespesaTop} width={barW} height={Math.max(0, altDespesa)} fill={C.vermelho} />
                  <path d={pathBarraTopoArredondado(xSai, ySaidaTop, barW, yDespesaTop, 4)} fill={C.laranja} />
                </>
              ) : (
                <path d={pathBarraTopoArredondado(xSai, yDespesaTop, barW, y0, 4)} fill={C.vermelho} />
              )}

              {m.despesa > 0 && altDespesa >= MIN_ALTURA_ROTULO && (
                <text x={xSai + barW / 2} y={(y0 + yDespesaTop) / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={8.5} fontWeight={700} fill={C.branco} fontFamily="'Roboto Mono',monospace">
                  {despesaPct.toFixed(0)}%
                </text>
              )}
              {m.rh > 0 && altRh >= MIN_ALTURA_ROTULO && (
                <text x={xSai + barW / 2} y={(yDespesaTop + ySaidaTop) / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={8.5} fontWeight={700} fill={C.branco} fontFamily="'Roboto Mono',monospace">
                  {rhPct.toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Resultado: área sombreada + linha (mais grossa) + pontos, em verde */}
        <path d={dArea} fill={C.verde} opacity={0.16} />
        <path d={dLinha} fill="none" stroke={C.verde} strokeWidth={5.5} strokeLinejoin="round" strokeLinecap="round" />
        {pontosLinha.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5.5} fill={C.verde} stroke={C.branco} strokeWidth={2} />
        ))}
        {/* rótulo direto só no último ponto (extremidade), com sombra pra se destacar do grid/área — o resto fica no hover/tabela */}
        <text x={pontosLinha[pontosLinha.length - 1].x} y={pontosLinha[pontosLinha.length - 1].y - 13}
          textAnchor="middle" fontSize={12.5} fontWeight={800} fill={C.verde} fontFamily="'Roboto Mono',monospace"
          filter="url(#sombraRotuloResultado)">
          {fmtCompacto(meses[meses.length - 1].resultado)}
        </text>

        {/* eixo X */}
        {meses.map((m, i) => (
          <text key={m.competencia} x={MARGEM.esquerda + bandW * i + bandW / 2} y={VBH - MARGEM.baixo + 18}
            textAnchor="middle" fontSize={10.5} fill={C.navy2} fontFamily="'Montserrat',sans-serif" fontWeight={700}>
            {mesLabel(m.competencia)}
          </text>
        ))}

        {/* faixas de hover, uma por mês */}
        {meses.map((m, i) => (
          <rect key={m.competencia} x={MARGEM.esquerda + bandW * i} y={MARGEM.topo} width={bandW} height={plotH}
            fill="transparent" onMouseEnter={() => setHoverI(i)} onMouseLeave={() => setHoverI(null)} style={{ cursor: 'pointer' }} />
        ))}
        {hoverI != null && <line x1={hoverX} x2={hoverX} y1={MARGEM.topo} y2={VBH - MARGEM.baixo} stroke={C.navy2} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />}
      </svg>

      {hover && (
        <div style={{
          position: 'absolute', top: 4, left: `${(hoverX / VBW) * 100}%`, transform: 'translateX(-50%)',
          background: C.navy, color: C.branco, borderRadius: 8, padding: '10px 13px', fontSize: 12,
          boxShadow: '0 6px 18px rgba(30,58,95,.3)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5
        }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, marginBottom: 5 }}>{mesLabel(hover.competencia)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 10px', fontFamily: "'Roboto Mono',monospace" }}>
            <span style={{ color: C.prataClaro }}>Faturamento</span><span>{brl(hover.faturamento)}</span>
            <span style={{ color: C.prataClaro }}>Despesa</span><span>{brl(hover.despesa)}</span>
            <span style={{ color: C.prataClaro }}>RH</span><span>{brl(hover.rh)}</span>
            <span style={{ color: C.prataClaro }}>Resultado</span><span style={{ fontWeight: 700 }}>{brl(hover.resultado)} ({hover.resultadoPct.toFixed(1)}%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
