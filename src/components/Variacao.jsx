import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { C } from '../styles';

/* Selo ▲/▼ ao lado de um valor — só aparece quando a variação em
   relação ao período anterior passa de 10% (combinado com Pablo em
   20/ago/2026). Leitura de direção, não de bom/ruim: subindo = azul,
   descendo = vermelho (combinado com Pablo em 21/ago/2026) — igual em
   todas as tabelas (Despesas, Faturamento, Resultado). */
export function Variacao({ pct, min = 10 }) {
  if (pct == null || Math.abs(pct) < min) return null;
  const alta = pct > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 6, fontSize: 10.5, fontWeight: 700,
      color: alta ? C.azul : C.vermelho
    }}>
      {alta ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}
