import React, { useState } from 'react';
import { C, brl, mesLabel } from '../styles';

/* Gráfico de destaque da aba Resultado: Faturamento x Saída (Despesa+RH)
   em barras, com Resultado sobreposto em linha — os três na mesma escala
   de R$ (sem eixo duplo). Cores calibradas com validate_palette.js da
   skill dataviz (evita o par verde/vermelho, que falha o teste de
   daltonismo): azul (Faturamento) e laranja (Saída) passam CVD ΔE 21+;
   a linha de Resultado usa o navy da marca, já diferenciado por ser
   outra forma de marca (linha x barra), não só por cor. Combinado com
   Pablo em 21/ago/2026. */

const VBW = 800, VBH = 340;
const MARGEM = { topo: 26, baixo: 40, esquerda: 64, direita: 16 };

const fmtCompacto = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1000).toFixed(0)} mil`;
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
  const valorMax = Math.max(1, ...meses.map(m => m.faturamento), ...saidas, ...meses.map(m => m.resultado)) * 1.15;
  const valorMin = Math.min(0, ...meses.map(m => m.resultado));
  const span = valorMax - valorMin || 1;

  const plotW = VBW - MARGEM.esquerda - MARGEM.direita;
  const plotH = VBH - MARGEM.topo - MARGEM.baixo;
  const y = (v) => MARGEM.topo + plotH - ((v - valorMin) / span) * plotH;
  const y0 = y(0);

  const bandW = plotW / meses.length;
  const barW = Math.min(24, bandW * 0.3);
  const gap = 3;

  const ticks = 4;
  const linhasGrade = Array.from({ length: ticks + 1 }, (_, i) => valorMin + (span * i) / ticks);

  const pontosLinha = meses.map((m, i) => ({
    x: MARGEM.esquerda + bandW * i + bandW / 2,
    y: y(m.resultado)
  }));
  const dLinha = pontosLinha.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const dArea = `${dLinha} L${pontosLinha[pontosLinha.length - 1].x},${y0} L${pontosLinha[0].x},${y0} Z`;

  const hover = hoverI != null ? meses[hoverI] : null;
  const hoverX = hoverI != null ? MARGEM.esquerda + bandW * hoverI + bandW / 2 : 0;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 6, fontSize: 12, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: C.navy2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.azul, display: 'inline-block' }} /> Faturamento</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.laranja, display: 'inline-block' }} /> Despesa + RH</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 2, background: C.navy, display: 'inline-block' }} /> Resultado</span>
      </div>

      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* gradeado horizontal, recessivo */}
        {linhasGrade.map((v, i) => (
          <g key={i}>
            <line x1={MARGEM.esquerda} x2={VBW - MARGEM.direita} y1={y(v)} y2={y(v)} stroke={C.prataClaro} strokeWidth={1} />
            <text x={MARGEM.esquerda - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={C.prata} fontFamily="'Roboto Mono',monospace">{fmtCompacto(v)}</text>
          </g>
        ))}
        {/* linha zero, um pouco mais forte, se houver valores negativos */}
        {valorMin < 0 && <line x1={MARGEM.esquerda} x2={VBW - MARGEM.direita} y1={y0} y2={y0} stroke={C.prata} strokeWidth={1} />}

        {/* barras: Faturamento e Saída, agrupadas por mês */}
        {meses.map((m, i) => {
          const cx = MARGEM.esquerda + bandW * i + bandW / 2;
          const saida = m.despesa + m.rh;
          const xFat = cx - barW - gap / 2;
          const xSai = cx + gap / 2;
          return (
            <g key={m.competencia}>
              <path d={pathBarraTopoArredondado(xFat, y(m.faturamento), barW, y0, 4)} fill={C.azul} />
              <path d={pathBarraTopoArredondado(xSai, y(saida), barW, y0, 4)} fill={C.laranja} />
            </g>
          );
        })}

        {/* Resultado: área leve + linha + pontos */}
        <path d={dArea} fill={C.navy} opacity={0.08} />
        <path d={dLinha} fill="none" stroke={C.navy} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontosLinha.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill={C.navy} stroke={C.branco} strokeWidth={2} />
        ))}
        {/* rótulo direto só no último ponto (extremidade) — o resto fica no hover/tabela */}
        <text x={pontosLinha[pontosLinha.length - 1].x} y={pontosLinha[pontosLinha.length - 1].y - 12}
          textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.navy} fontFamily="'Roboto Mono',monospace">
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
