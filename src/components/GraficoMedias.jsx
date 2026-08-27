import React from 'react';
import { DollarSign, Receipt, Users, PiggyBank } from 'lucide-react';
import { C, brl } from '../styles';
import { AZUL_FORTE } from './GraficoResultado';
import { Variacao } from './Variacao';

/* Médias mensais de Faturamento, Despesa, RH e Resultado, ao lado do
   gráfico de evolução, no mesmo cartão da aba Resultado. Pedido de Pablo
   em 27/ago/2026; trocado de barras por ícone + valor no mesmo dia, a
   pedido dele — um "retrato" de cada item (cifrão pro Faturamento, dois
   bonecos pro RH etc.) em vez de mais um gráfico de barras. Ao lado do
   valor, o % de variação do último mês em relação a essa média (mesmo
   pedido, mesmo dia) — sem o corte de 10% do selo padrão, porque aqui a
   ideia é sempre mostrar onde o último mês está frente à média. */
const fmtCompacto = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1000).toFixed(0)}k`;
  return brl(v);
};

export default function GraficoMedias({ meses }) {
  if (!meses || meses.length === 0) return null;
  const n = meses.length;
  const media = (campo) => meses.reduce((s, m) => s + m[campo], 0) / n;
  const ultimoMes = meses[meses.length - 1];
  const pctVsMedia = (campo, mediaValor) => mediaValor ? ((ultimoMes[campo] - mediaValor) / mediaValor) * 100 : null;

  const itens = [
    { label: 'Faturamento', campo: 'faturamento', cor: AZUL_FORTE, Icone: DollarSign },
    { label: 'Despesa', campo: 'despesa', cor: C.vermelho, Icone: Receipt },
    { label: 'RH', campo: 'rh', cor: C.laranja, Icone: Users },
    { label: 'Resultado', campo: 'resultado', cor: C.verde, Icone: PiggyBank },
  ].map(item => {
    const valor = media(item.campo);
    return { ...item, valor, pct: pctVsMedia(item.campo, valor) };
  });

  return (
    <div>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 13.5, color: C.navy, marginBottom: 2 }}>
        Médias mensais
      </div>
      <p style={{ fontSize: 11, color: C.prata, marginBottom: 14 }}>Média de {n} {n === 1 ? 'mês' : 'meses'} no período.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {itens.map(({ label, valor, pct, cor, Icone }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: `${cor}1F`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icone size={22} color={cor} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Roboto Mono',monospace", fontWeight: 800, fontSize: 17, color: C.navy, lineHeight: 1.2 }}>
                  {fmtCompacto(valor)}
                </span>
                <Variacao pct={pct} min={0} />
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: C.navy2, letterSpacing: .3 }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
