import {
  collection, doc, getDocs, setDoc, addDoc, writeBatch, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

/* ---------- fornecedores ---------- */
export async function listarFornecedores() {
  const snap = await getDocs(collection(db, 'fornecedores'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Garante que cada fornecedor encontrado numa importação exista no
   cadastro. Fornecedor novo entra com ehDoCD:null (pendente de validação)
   — nunca é criado já validado. Não sobrescreve quem já existe. */
export async function garantirFornecedores(fornecedores, mapaExistente) {
  const batch = writeBatch(db);
  let novos = 0;
  for (const [codigo, nome] of fornecedores) {
    if (mapaExistente.has(codigo)) continue;
    const ref = doc(db, 'fornecedores', codigo);
    batch.set(ref, { codigo, nome, ehDoCD: null, criadoEm: Date.now() });
    novos++;
  }
  if (novos > 0) await batch.commit();
  return novos;
}

export async function validarFornecedor(codigo, ehDoCD, validadoPor) {
  await setDoc(doc(db, 'fornecedores', codigo),
    { ehDoCD, validadoPor, validadoEm: Date.now() }, { merge: true });
}

/* ---------- lançamentos ---------- */
async function salvarEmLote(colecao, linhas, loteImportacaoId) {
  const CHUNK = 400; // limite do writeBatch é 500 operações
  for (let i = 0; i < linhas.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const linha of linhas.slice(i, i + CHUNK)) {
      const ref = doc(collection(db, colecao));
      batch.set(ref, { ...linha, loteImportacaoId, importadoEm: Date.now() });
    }
    await batch.commit();
  }
}

export async function salvarFaturamento(linhas, loteImportacaoId) {
  return salvarEmLote('lancamentos_faturamento', linhas, loteImportacaoId);
}
export async function salvarDespesas(linhas, loteImportacaoId) {
  return salvarEmLote('lancamentos_despesa', linhas, loteImportacaoId);
}

export async function listarFaturamento() {
  const snap = await getDocs(collection(db, 'lancamentos_faturamento'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function listarDespesas() {
  const snap = await getDocs(collection(db, 'lancamentos_despesa'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ---------- folha de pagamento (um doc por mês, chave = competência) ---------- */
export async function salvarFolha(competencia, valores, importadoPor) {
  await setDoc(doc(db, 'folha_pagamento', competencia),
    { competencia, ...valores, atualizadoPor: importadoPor, atualizadoEm: Date.now() });
}
export async function listarFolha() {
  const snap = await getDocs(query(collection(db, 'folha_pagamento'), orderBy('competencia')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ---------- lotes de importação (rastreabilidade) ---------- */
export async function registrarLote({ tipo, arquivoNome, importadoPor, linhasImportadas, competencias }) {
  const ref = await addDoc(collection(db, 'lotes_importacao'), {
    tipo, arquivoNome, importadoPor, linhasImportadas,
    competencias, importadoEm: Date.now()
  });
  return ref.id;
}
export async function listarLotes() {
  const snap = await getDocs(query(collection(db, 'lotes_importacao'), orderBy('importadoEm', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
