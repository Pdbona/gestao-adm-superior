import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { C } from '../styles';

/* Selo ▲/▼ ao lado de um valor — só aparece quando a variação em
   relação ao período anterior passa de 10% (combinado com Pablo em
   20/ago/2026). Alta em despesa é ruim (vermelho); em faturamento seria
   o oposto, mas por simplicidade mantemos a mesma leitura visual
   (alta=vermelho, queda=verde) em todas as tabelas — é só um alerta de
   "mudou bastante", não um juízo de bom/ruim. */
export function Variacao({ pct }) {
  if (pct == null || Math.abs(pct) < 10) return null;
  const alta = pct > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 6, fontSize: 10.5, fontWeight: 700,
      color: alta ? C.vermelho : C.verde
    }}>
      {alta ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}
