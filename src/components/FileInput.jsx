import React, { useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { C } from '../styles';

/* Botão de seleção de arquivo com o mesmo tratamento visual do resto do
   app — nada de <input type="file"> nu na tela. */
export default function FileInput({ label, arquivo, onSelecionar, aceitar }) {
  const ref = useRef(null);
  return (
    <div>
      <input ref={ref} type="file" accept={aceitar || '.xls,.xlsx'} style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onSelecionar(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        background: C.bgLeve, border: `1.5px dashed ${C.prata}`, borderRadius: 10,
        padding: '16px 18px', cursor: 'pointer', font: 'inherit'
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 9, background: C.branco, border: `1px solid ${C.prataClaro}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {arquivo ? <FileSpreadsheet size={19} color={C.verde} /> : <Upload size={19} color={C.prata} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>
            {label}
          </div>
          <div style={{
            fontSize: 12, color: arquivo ? C.verde : C.prata, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {arquivo ? arquivo.name : 'Clique para selecionar o arquivo (.xls ou .xlsx)'}
          </div>
        </div>
      </button>
    </div>
  );
}
