import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { C, styles } from '../styles';

/* Estado de erro ao buscar dados do Firestore — sem isso, uma falha (rede,
   permissão, etc.) deixava a aba presa em "Carregando…" pra sempre, sem
   avisar nada (bug encontrado em 21/ago/2026: regras do Firestore negando
   leitura). Toda aba que busca dados no mount usa este componente em vez
   de estourar a exceção sem tratamento. */
export default function ErroCarregamento({ onTentarDeNovo }) {
  return (
    <div style={styles.erroCarregamento}>
      <AlertTriangle size={22} color={C.vermelho} />
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.vermelho, margin: '10px 0 4px' }}>
        Não consegui carregar os dados
      </div>
      <div style={{ fontSize: 12.5, color: C.texto, marginBottom: 14 }}>Verifique a internet e tente de novo.</div>
      <button onClick={onTentarDeNovo} style={{ ...styles.btnGhost, borderColor: C.vermelho, color: C.vermelho, borderStyle: 'solid' }}>
        <RefreshCw size={14} /> Tentar de novo
      </button>
    </div>
  );
}
