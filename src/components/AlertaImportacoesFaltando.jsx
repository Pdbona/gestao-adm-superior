import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { C, styles, mesLabel } from '../styles';
import { listarFaturamento, listarDespesas, listarFolha } from '../lib/db';

/* Combinado com Pablo em 21/ago/2026: avisa quando falta a importação
   de algum arquivo (Locação, Serviço, Despesas, Folha) pro mês corrente
   ou pra algum mês já passado. Olha do primeiro mês com QUALQUER dado
   até o mês atual — não avisa antes disso (a operação pode não ter
   começado ainda) nem depois (mês futuro, ainda não fechou). */
const TIPOS = [
  { id: 'locacao', label: 'Faturamento — Locação (ND)' },
  { id: 'servico', label: 'Faturamento — Nota de Serviço' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'folha', label: 'Folha de Pagamento (RH)' }
];

const mesAtual = () => new Date().toISOString().slice(0, 7);

function proximoMes(competencia) {
  const [y, m] = competencia.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // m já é 1-based aqui vira o mês seguinte
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function AlertaImportacoesFaltando({ versao }) {
  const [faltando, setFaltando] = useState(null); // null = ainda carregando/sem dado suficiente

  const carregar = async () => {
    try {
      const [faturamento, despesas, folha] = await Promise.all([listarFaturamento(), listarDespesas(), listarFolha()]);
      const presentes = {
        locacao: new Set(faturamento.filter(l => l.tipo === 'locacao').map(l => l.competencia).filter(Boolean)),
        servico: new Set(faturamento.filter(l => l.tipo === 'servico').map(l => l.competencia).filter(Boolean)),
        despesa: new Set(despesas.map(d => d.competencia).filter(Boolean)),
        folha: new Set(folha.map(h => h.competencia).filter(Boolean))
      };
      const todasCompetencias = [...presentes.locacao, ...presentes.servico, ...presentes.despesa, ...presentes.folha];
      if (todasCompetencias.length === 0) { setFaltando([]); return; }

      const primeiro = todasCompetencias.sort()[0];
      const atual = mesAtual();
      const meses = [];
      for (let c = primeiro; c <= atual; c = proximoMes(c)) meses.push(c);

      const resultado = TIPOS.map(t => ({
        ...t, meses: meses.filter(m => !presentes[t.id].has(m))
      })).filter(t => t.meses.length > 0);

      setFaltando(resultado);
    } catch (e) {
      setFaltando([]); // silencioso — não é crítico a ponto de travar a tela de importação
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [versao]);

  if (!faltando || faltando.length === 0) return null;

  return (
    <div style={{ ...styles.card, borderColor: C.laranja, background: '#FFF8F0', marginBottom: 18 }}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.laranjaEsc, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={16} /> Faltando importar
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {faltando.map(t => (
          <div key={t.id} style={{ fontSize: 12.5, color: C.texto }}>
            <b>{t.label}:</b> {t.meses.map(mesLabel).join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
}
