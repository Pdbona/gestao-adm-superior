import * as XLSX from 'xlsx';

/* Lê um arquivo .xls/.xlsx (File do <input type="file">) e devolve a
   primeira aba como matriz de linhas (array de arrays), cada célula já
   como string ("" para vazia) — é o formato que os parsers em parsers.js
   esperam. */
export function lerPlanilha(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

/* Só as células não-vazias de uma linha, na ordem em que aparecem — os
   relatórios de origem têm células mescladas, então o índice da coluna
   "pula" de linha pra linha; a ORDEM dos campos preenchidos é o que se
   mantém estável. */
export function celulasPreenchidas(row) {
  return (row || []).map(c => String(c ?? '').trim()).filter(c => c !== '');
}
