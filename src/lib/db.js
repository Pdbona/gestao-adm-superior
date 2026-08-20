import {
  collection, doc, getDocs, setDoc, addDoc, writeBatch, query, orderBy, where, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/* ---------- centros de custo ----------
   Lista semeada automaticamente na primeira vez que alguém abre a aba
   Fornecedores/Despesas (se a coleção estiver vazia) — evita exigir
   cadastro manual antes de conseguir usar o app. Continua 100% editável
   depois (criarCentroCusto). */
export const CENTROS_CUSTO_PADRAO = [
  'Aluguel e Ocupação', 'Utilidades (Água/Energia)', 'Impostos e Taxas',
  'Materiais e Produtos', 'Serviços Gerais', 'Manutenção', 'Folha e Encargos',
  'Não Classificado'
];

export async function listarCentrosCusto() {
  const snap = await getDocs(query(collection(db, 'centros_custo'), orderBy('nome')));
  if (snap.empty) {
    const batch = writeBatch(db);
    CENTROS_CUSTO_PADRAO.forEach(nome => batch.set(doc(collection(db, 'centros_custo')), { nome, criadoEm: Date.now() }));
    await batch.commit();
    const snap2 = await getDocs(query(collection(db, 'centros_custo'), orderBy('nome')));
    return snap2.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarCentroCusto(nome) {
  const ref = await addDoc(collection(db, 'centros_custo'), { nome: nome.trim(), criadoEm: Date.now() });
  return ref.id;
}

/* ---------- fornecedores ---------- */
export async function listarFornecedores() {
  const snap = await getDocs(collection(db, 'fornecedores'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Garante que cada fornecedor encontrado numa importação exista no
   cadastro. Fornecedor novo entra com ehDoCD:null e centroCustoId:null
   (pendente de validação) — nunca é criado já validado. Não sobrescreve
   quem já existe. `fornecedores` é um Map(codigo -> {nome,
   centroCustoSugeridoId}), a sugestão vem do tipo de documento mais
   frequente daquele fornecedor no arquivo importado (ver DespesasTab) —
   é só um palpite pra agilizar a validação, o Pablo confirma ou troca. */
export async function garantirFornecedores(fornecedores, mapaExistente) {
  const batch = writeBatch(db);
  let novos = 0;
  for (const [codigo, { nome, centroCustoSugeridoId }] of fornecedores) {
    if (mapaExistente.has(codigo)) continue;
    const ref = doc(db, 'fornecedores', codigo);
    batch.set(ref, { codigo, nome, ehDoCD: null, centroCustoId: null, centroCustoSugeridoId: centroCustoSugeridoId || null, criadoEm: Date.now() });
    novos++;
  }
  if (novos > 0) await batch.commit();
  return novos;
}

export async function validarFornecedor(codigo, { ehDoCD, centroCustoId }, validadoPor) {
  await setDoc(doc(db, 'fornecedores', codigo),
    { ehDoCD, centroCustoId: centroCustoId || null, validadoPor, validadoEm: Date.now() }, { merge: true });
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

/* ---------- excluir uma importação errada (mês + tipo) ----------
   Combinado com Pablo em 20/ago/2026: engano de arquivo/mês acontece —
   busca prévia (buscarParaExcluir) mostra o que seria apagado antes de
   confirmar (excluirDocs). Não mexe em lotes_importacao — o histórico de
   "isso foi importado, depois corrigido" fica, é só auditoria. */
export async function buscarParaExcluir(colecao, filtros) {
  const clauses = Object.entries(filtros).filter(([, v]) => v != null).map(([k, v]) => where(k, '==', v));
  const snap = await getDocs(query(collection(db, colecao), ...clauses));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function excluirDocs(colecao, ids) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK).forEach(id => batch.delete(doc(db, colecao, id)));
    await batch.commit();
  }
}

export async function excluirFolha(competencia) {
  await deleteDoc(doc(db, 'folha_pagamento', competencia));
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
