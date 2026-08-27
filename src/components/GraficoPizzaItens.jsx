import React, { useState } from 'react';
import { C, brl } from '../styles';

/* Gráfico de pizza em pseudo-3D (SVG puro, sem lib externa — mesmo padrão
   dos outros gráficos deste app) pro Analítico por item de faturamento,
   pedido de Pablo em 27/ago/2026: "insira um gráfico de pizza (em 3D) ao
   lado da tabela, com dados do total da tabela por item". A ilusão de
   volume é feita com uma elipse (perspectiva) + uma "parede" lateral mais
   escura só na metade frontal de cada fatia (a metade de trás fica
   encoberta pelo topo, como num cilindro visto de cima). */
const PALETA = [C.azul, C.laranja, C.verde, C.vermelho, C.amarelo, C.navy2, C.laranjaEsc, C.prata];

function pontoElipse(cx, cy, rx, ry, anguloDeg) {
  const r = (anguloDeg * Math.PI) / 180;
  return { x: cx + rx * Math.cos(r), y: cy + ry * Math.sin(r) };
}

// escurece uma cor hex pra fazer a "parede" lateral da fatia (sombra do volume)
function escurecer(hex, fator = 0.72) {
  const n = hex.replace('#', '');
  const r = Math.round(parseInt(n.substring(0, 2), 16) * fator);
  const g = Math.round(parseInt(n.substring(2, 4), 16) * fator);
  const b = Math.round(parseInt(n.substring(4, 6), 16) * fator);
  return `rgb(${r},${g},${b})`;
}

const CX = 148, CY = 104, RX = 104, RY = 60, ALTURA = 24;
const VBW = 296, VBH = CY + RY + ALTURA + 12;

export default function GraficoPizzaItens({ dados, titulo }) {
  const [hoverI, setHoverI] = useState(null);
  const total = (dados || []).reduce((s, d) => s + (d.valor || 0), 0);
  if (!dados || dados.length === 0 || total <= 0) return null;

  let cursor = -90; // começa no topo (12h), sentido horário
  const fatias = dados.map((d, i) => {
    const frac = (d.valor || 0) / total;
    const a0 = cursor, a1 = cursor + frac * 360;
    cursor = a1;
    const cor = PALETA[i % PALETA.length];
    return { ...d, a0, a1, pct: frac * 100, cor, corEscura: escurecer(cor) };
  });

  const topoFatia = (a0, a1) => {
    const largeArc = a1 - a0 > 180 ? 1 : 0;
    const p0 = pontoElipse(CX, CY, RX, RY, a0);
    const p1 = pontoElipse(CX, CY, RX, RY, a1);
    return `M${CX},${CY} L${p0.x},${p0.y} A${RX},${RY} 0 ${largeArc} 1 ${p1.x},${p1.y} Z`;
  };

  // parede lateral: só existe na parte visível da elipse (metade da frente, ângulo 0°–180°)
  const paredeFatia = (a0, a1) => {
    const c0 = Math.max(a0, 0), c1 = Math.min(a1, 180);
    if (c1 <= c0) return null;
    const large = c1 - c0 > 180 ? 1 : 0;
    const t0 = pontoElipse(CX, CY, RX, RY, c0);
    const t1 = pontoElipse(CX, CY, RX, RY, c1);
    const b0 = { x: t0.x, y: t0.y + ALTURA }, b1 = { x: t1.x, y: t1.y + ALTURA };
    return `M${t0.x},${t0.y} A${RX},${RY} 0 ${large} 1 ${t1.x},${t1.y} L${b1.x},${b1.y} A${RX},${RY} 0 ${large} 0 ${b0.x},${b0.y} Z`;
  };

  return (
    <div>
      {titulo && (
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12.5, color: C.navy2, marginBottom: 10, textAlign: 'center' }}>
          {titulo}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block' }}>
          {/* sombra projetada no "chão" */}
          <ellipse cx={CX} cy={CY + ALTURA + 3} rx={RX} ry={RY} fill="#00000018" />
          {fatias.map((f, i) => {
            const d = paredeFatia(f.a0, f.a1);
            return d ? <path key={`parede-${i}`} d={d} fill={f.corEscura} /> : null;
          })}
          {fatias.map((f, i) => (
            <path key={`topo-${i}`} d={topoFatia(f.a0, f.a1)} fill={f.cor}
              stroke={C.branco} strokeWidth={1.5}
              opacity={hoverI == null || hoverI === i ? 1 : 0.5}
              onMouseEnter={() => setHoverI(i)} onMouseLeave={() => setHoverI(null)}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }} />
          ))}
        </svg>
        <div style={{ display: 'grid', gap: 7, width: '100%', maxWidth: 300 }}>
          {fatias.map((f, i) => (
            <div key={f.label} onMouseEnter={() => setHoverI(i)} onMouseLeave={() => setHoverI(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                opacity: hoverI == null || hoverI === i ? 1 : 0.5, transition: 'opacity .15s' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: f.cor, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: C.navy, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
              <span style={{ fontFamily: "'Roboto Mono',monospace", color: C.texto, whiteSpace: 'nowrap' }}>{brl(f.valor)}</span>
              <span style={{ fontFamily: "'Roboto Mono',monospace", color: C.navy2, fontWeight: 700, width: 34, textAlign: 'right' }}>{f.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
