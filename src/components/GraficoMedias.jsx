import React from 'react';
import { C, brl } from '../styles';
import { AZUL_FORTE } from './GraficoResultado';

/* Gráfico compacto com as médias mensais de Faturamento, Despesa, RH e
   Resultado — ao lado do gráfico de evolução, no mesmo cartão da aba
   Resultado. Pedido de Pablo em 27/ago/2026. */
const VBW = 320, VBH = 340;
const MARGEM = { topo: 26, baixo: 46, esquerda: 8, direita: 8 };

const fmtCompacto = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1000).toFixed(0)}k`;
  return brl(v);
};

export default function GraficoMedias({ meses }) {
  if (!meses || meses.length === 0) return null;
  const n = meses.length;
  const media = (campo) => meses.reduce((s, m) => s + m[campo], 0) / n;

  const barras = [
    { label: 'Faturamento', valor: media('faturamento'), cor: AZUL_FORTE },
    { label: 'Despesa', valor: media('despesa'), cor: C.vermelho },
    { label: 'RH', valor: media('rh'), cor: C.laranja },
    { label: 'Resultado', valor: media('resultado'), cor: C.verde },
  ];

  const valorMax = Math.max(1, ...barras.map(b => Math.abs(b.valor))) * 1.25;
  const plotW = VBW - MARGEM.esquerda - MARGEM.direita;
  const plotH = VBH - MARGEM.topo - MARGEM.baixo;
  const y0 = MARGEM.topo + plotH;
  const bandW = plotW / barras.length;
  const barW = Math.min(50, bandW * 0.56);

  return (
    <div>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 13.5, color: C.navy, marginBottom: 2 }}>
        Médias mensais
      </div>
      <p style={{ fontSize: 11, color: C.prata, marginBottom: 8 }}>Média de {n} {n === 1 ? 'mês' : 'meses'} no período.</p>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={MARGEM.esquerda} x2={VBW - MARGEM.direita} y1={y0} y2={y0} stroke={C.prataClaro} strokeWidth={1} />
        {barras.map((b, i) => {
          const cx = MARGEM.esquerda + bandW * i + bandW / 2;
          const altura = (Math.abs(b.valor) / valorMax) * plotH;
          const yTopo = y0 - altura;
          return (
            <g key={b.label}>
              <rect x={cx - barW / 2} y={yTopo} width={barW} height={altura} rx={4} fill={b.cor} />
              <text x={cx} y={yTopo - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.navy2} fontFamily="'Roboto Mono',monospace">
                {fmtCompacto(b.valor)}
              </text>
              <text x={cx} y={y0 + 20} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.navy2} fontFamily="'Montserrat',sans-serif">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
