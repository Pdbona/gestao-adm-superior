import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Upload, Trash2, Landmark } from 'lucide-react';
import { C, styles, brl } from '../styles';
import { lerPlanilha } from '../lib/xls';
import { parseFaturamentoLocacao, parseFaturamentoServico, parseDespesas, parseFolha, SUGESTAO_CC_POR_TIPO_DOC } from '../lib/parsers';
import {
  salvarFaturamento, salvarDespesas, salvarFolha, registrarLote, listarFornecedores, garantirFornecedores,
  listarCentrosCusto, buscarParaExcluir, excluirDocs, listarFolha, excluirFolha
} from '../lib/db';
import FileInput from './FileInput';
import AlertaImportacoesFaltando from './AlertaImportacoesFaltando';

const mesAtual = () => new Date().toISOString().slice(0, 7);

/* Trava de duplicidade — combinado com Pablo em 21/ago/2026 (reverte a
   decisão de 19/ago/2026 de deixar sem trava): antes de liberar a
   confirmação, checa se já existe alguma importação daquele tipo pra
   aquela competência. Achou aconteceu de verdade em jul/26 (Despesas e
   Faturamento-Serviço com múltiplos lotes registrados pro mesmo mês). */
async function contarExistentes(colecao, filtros) {
  const docs = await buscarParaExcluir(colecao, filtros);
  return docs.length;
}

const CAMPOS_FOLHA_UI = [
  { id: 'totalLiquidoPagar', label: 'Total Líquido a Pagar', destaque: true },
  { id: 'totalLiquidoPagarFerias', label: 'Total Líquido a Pagar (Férias)', destaque: true },
  { id: 'gps', label: 'Total Líquido (GPS)' },
  { id: 'fgtsApurado', label: 'Total FGTS apurado (recibos)' },
  { id: 'fgtsRecolhido', label: 'Total FGTS recolhido s/CS' },
  { id: 'emprestimo', label: 'Total de Empréstimo' },
  { id: 'irrfFolha', label: 'IRRF Folha' },
  { id: 'horaExtra50', label: 'Hora Extra 50% (401)' },
  { id: 'horaExtra100', label: 'Hora Extra 100% (402)' },
  { id: 'dsrHorasExtras', label: 'DSR s/ Horas Extras (420)' },
  { id: 'custoDemissao', label: 'Custo de Demissão (líq.)' }
];
const FOLHA_VAZIO = Object.fromEntries(CAMPOS_FOLHA_UI.map(c => [c.id, '']));

/* ---------- bloco genérico: Faturamento (Locação ou Serviços) ----------
   Mês escolhido manualmente uma única vez pra tela inteira (não é a data
   que vem dentro do arquivo — combinado com Pablo em 20/ago/2026) e
   compartilhado por todos os cards (combinado com Pablo em 21/ago/2026:
   escolhe o mês uma vez, anexa cada arquivo, importa tudo de uma vez).
   Se o mês mudar depois de já ter anexado um arquivo, reprocessa o mesmo
   arquivo pro mês novo — não obriga reanexar. Expõe confirmar() por ref
   pro botão "Importar tudo" do pai; confirmar() não faz nada se não tiver
   arquivo pronto, então é seguro chamar em todos os cards de uma vez. */
const BlocoFaturamento = forwardRef(function BlocoFaturamento({ titulo, ajuda, tipo, parser, usuario, competencia, aoImportar }, ref) {
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');

  const processar = async (file, comp) => {
    setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parser(rows, comp);
      if (resultado.linhas.length === 0) {
        setErro('Não encontrei nenhuma linha reconhecível neste arquivo. Confira se é o relatório certo.');
        setParse(null);
        return;
      }
      const existentes = await contarExistentes('lancamentos_faturamento', { tipo, competencia: comp });
      if (existentes > 0) {
        setErro(`Já existe uma importação de "${titulo}" pra ${comp} (${existentes} lançamento(s)). Pra reimportar, exclua a anterior primeiro em "Excluir uma importação", logo abaixo.`);
        setParse(null);
        return;
      }
      setParse(resultado);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
      setParse(null);
    }
  };

  const onSelecionar = (file) => { setArquivo(file); processar(file, competencia); };

  useEffect(() => {
    setMsg(null);
    if (arquivo) processar(arquivo, competencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const confirmar = async () => {
    if (!parse) return;
    setImportando(true); setErro('');
    try {
      const loteId = await registrarLote({
        tipo, arquivoNome: arquivo.name, importadoPor: usuario,
        linhasImportadas: parse.linhas.length, competencias: [competencia]
      });
      await salvarFaturamento(parse.linhas, loteId);
      setMsg(`Importado: ${parse.linhas.length} lançamentos (${brl(parse.linhas.reduce((s, l) => s + l.valor, 0))}) em ${competencia}.`);
      setArquivo(null); setParse(null);
      aoImportar();
    } catch (e) {
      setErro('Falha ao salvar no banco. Verifique a internet e tente de novo.');
    } finally {
      setImportando(false);
    }
  };

  useImperativeHandle(ref, () => ({ confirmar }));

  const total = parse ? parse.linhas.reduce((s, l) => s + l.valor, 0) : 0;

  return (
    <div style={styles.card}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>{titulo}</div>
      <p style={{ ...styles.helper, marginTop: 4 }}>{ajuda}</p>

      <FileInput label={titulo} arquivo={arquivo} onSelecionar={onSelecionar} />

      {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
      {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

      {parse && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span style={styles.infoChip}>{parse.linhas.length} lançamentos lidos</span>
            <span style={{ ...styles.infoChip, color: C.verde, borderColor: C.verde }}>{brl(total)}</span>
            <span style={{ ...styles.infoChip, color: C.navy2, borderColor: C.navy2 }}>competência {competencia}</span>
          </div>
          {parse.avisos.length > 0 && (
            <div style={{ ...styles.erro, background: '#FFF3E0', color: C.laranjaEsc, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              {parse.avisos.map((a, i) => <div key={i} style={{ display: 'flex', gap: 8 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{a}</div>)}
            </div>
          )}
          <button onClick={confirmar} disabled={importando}
            style={{ ...styles.btnPrimary, marginTop: 14, opacity: importando ? .7 : 1 }}>
            {importando ? 'Importando…' : `Confirmar e importar ${parse.linhas.length} lançamentos`}
          </button>
        </div>
      )}
    </div>
  );
});

/* ---------- bloco Despesas — igual acima, mas cruza fornecedor x Centro de Custo ---------- */
const BlocoDespesas = forwardRef(function BlocoDespesas({ usuario, competencia, aoImportar }, ref) {
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');
  const [fornecedoresMapa, setFornecedoresMapa] = useState(new Map());
  const [centrosCusto, setCentrosCusto] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [f, cc] = await Promise.all([listarFornecedores(), listarCentrosCusto()]);
        setFornecedoresMapa(new Map(f.map(x => [x.codigo, x])));
        setCentrosCusto(cc);
      } catch (e) {
        // silencioso: sem sugestão de CC pro fornecedor novo, mas não bloqueia
        // a importação — a mensagem de erro real aparece ao tentar confirmar.
      }
    })();
  }, []);

  const processar = async (file, comp) => {
    setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parseDespesas(rows, comp);
      if (resultado.linhas.length === 0) {
        setErro('Não encontrei nenhuma linha reconhecível neste arquivo. Confira se é o relatório "Documentos C. Pagar por Vencimento".');
        setParse(null);
        return;
      }
      const existentes = await contarExistentes('lancamentos_despesa', { competencia: comp });
      if (existentes > 0) {
        setErro(`Já existe uma importação de Despesas pra ${comp} (${existentes} lançamento(s)). Pra reimportar, exclua a anterior primeiro em "Excluir uma importação", logo abaixo.`);
        setParse(null);
        return;
      }
      setParse(resultado);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
      setParse(null);
    }
  };

  const onSelecionar = (file) => { setArquivo(file); processar(file, competencia); };

  useEffect(() => {
    setMsg(null);
    if (arquivo) processar(arquivo, competencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const confirmar = async () => {
    if (!parse) return;
    setImportando(true); setErro('');
    try {
      /* sugestão de Centro de Custo pro fornecedor NOVO: olha o tipo de
         documento mais frequente das linhas dele neste arquivo e casa
         com SUGESTAO_CC_POR_TIPO_DOC pelo NOME do centro de custo. */
      const porFornecedor = new Map();
      parse.linhas.forEach(l => {
        if (!porFornecedor.has(l.fornecedorCodigo)) porFornecedor.set(l.fornecedorCodigo, { nome: l.fornecedorNome, tipos: {} });
        const reg = porFornecedor.get(l.fornecedorCodigo);
        reg.tipos[l.tipoDocumentoCodigo] = (reg.tipos[l.tipoDocumentoCodigo] || 0) + 1;
      });
      const fornecedoresComSugestao = new Map();
      porFornecedor.forEach(({ nome, tipos }, codigo) => {
        const tipoMaisComum = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0]?.[0];
        const nomeSugerido = SUGESTAO_CC_POR_TIPO_DOC[tipoMaisComum] || 'Não Classificado';
        const cc = centrosCusto.find(c => c.nome === nomeSugerido);
        fornecedoresComSugestao.set(codigo, { nome, centroCustoSugeridoId: cc?.id || null });
      });
      const novosFornecedores = await garantirFornecedores(fornecedoresComSugestao, fornecedoresMapa);

      const loteId = await registrarLote({
        tipo: 'despesa', arquivoNome: arquivo.name, importadoPor: usuario,
        linhasImportadas: parse.linhas.length, competencias: [competencia]
      });
      await salvarDespesas(parse.linhas, loteId);

      setMsg(`Importado: ${parse.linhas.length} lançamentos em ${competencia}${novosFornecedores > 0 ? ` · ${novosFornecedores} fornecedor(es) novo(s) foram para a fila de validação` : ''}.`);
      setArquivo(null); setParse(null);
      const f = await listarFornecedores();
      setFornecedoresMapa(new Map(f.map(x => [x.codigo, x])));
      aoImportar();
    } catch (e) {
      setErro('Falha ao salvar no banco. Verifique a internet e tente de novo.');
    } finally {
      setImportando(false);
    }
  };

  useImperativeHandle(ref, () => ({ confirmar }));

  const total = parse ? parse.linhas.reduce((s, l) => s + l.valor, 0) : 0;
  const fornecedoresNovos = parse ? new Set(parse.linhas.map(l => l.fornecedorCodigo).filter(c => !fornecedoresMapa.has(c))).size : 0;

  return (
    <div style={styles.card}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>Despesas</div>
      <p style={{ ...styles.helper, marginTop: 4 }}>
        Relatório "Documentos C. Pagar por Vencimento" (Filial do CD). Fornecedor novo entra na fila
        de validação (aba Fornecedores) já com sugestão de Centro de Custo.
      </p>

      <FileInput label="Documentos C. Pagar por Vencimento" arquivo={arquivo} onSelecionar={onSelecionar} />

      {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
      {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

      {parse && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span style={styles.infoChip}>{parse.linhas.length} lançamentos lidos</span>
            <span style={{ ...styles.infoChip, color: C.verde, borderColor: C.verde }}>{brl(total)}</span>
            <span style={{ ...styles.infoChip, color: C.navy2, borderColor: C.navy2 }}>competência {competencia}</span>
            {fornecedoresNovos > 0 && (
              <span style={{ ...styles.infoChip, color: C.laranjaEsc, borderColor: C.laranja }}>{fornecedoresNovos} fornecedor(es) novo(s)</span>
            )}
          </div>
          <button onClick={confirmar} disabled={importando}
            style={{ ...styles.btnPrimary, marginTop: 14, opacity: importando ? .7 : 1 }}>
            {importando ? 'Importando…' : `Confirmar e importar ${parse.linhas.length} lançamentos`}
          </button>
        </div>
      )}
    </div>
  );
});

/* ---------- bloco Folha de Pagamento — mesma família dos outros, mas
   também aceita digitação manual (o PDF de origem não é extraível, ver
   parseFolha em lib/parsers.js). O botão "Salvar" fica sempre visível,
   não só depois de anexar arquivo. Combinado com Pablo em 21/ago/2026:
   saiu do card único que tinha antes, entrou na família dos outros
   imports; o histórico/consulta mensal foi pra Despesas > Folha de
   Pagto. `tocado` evita que o botão "Importar tudo" sobrescreva um mês
   com zeros só porque o card está com o mês em foco sem ter sido
   preenchido. ---------- */
const BlocoFolha = forwardRef(function BlocoFolha({ usuario, competencia, aoImportar }, ref) {
  const [arquivo, setArquivo] = useState(null);
  const [valores, setValores] = useState(FOLHA_VAZIO);
  const [avisos, setAvisos] = useState([]);
  const [tocado, setTocado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');
  const [jaExiste, setJaExiste] = useState(false);

  const resetar = () => { setArquivo(null); setValores(FOLHA_VAZIO); setAvisos([]); setTocado(false); setMsg(null); setErro(''); };

  useEffect(() => {
    resetar();
    /* Folha sobrescreve (não duplica, é um doc por mês) — então é só
       aviso, não trava, diferente de Faturamento/Despesas. */
    let cancelado = false;
    contarExistentes('folha_pagamento', { competencia }).then(n => { if (!cancelado) setJaExiste(n > 0); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const importarArquivo = async (file) => {
    setArquivo(file); setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parseFolha(rows, competencia);
      if (!resultado.valores) {
        setErro(resultado.avisos[0] || 'Não consegui ler essa planilha.');
        return;
      }
      setValores(Object.fromEntries(CAMPOS_FOLHA_UI.map(c => [c.id, String(resultado.valores[c.id])])));
      setAvisos(resultado.avisos);
      setTocado(true);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
    }
  };

  const set = (id, v) => { setValores(s => ({ ...s, [id]: v })); setTocado(true); };

  const confirmar = async () => {
    if (!tocado) return;
    setSalvando(true); setErro(''); setMsg(null);
    try {
      const numericos = Object.fromEntries(CAMPOS_FOLHA_UI.map(c => [c.id, parseFloat((valores[c.id] || '0').replace(',', '.')) || 0]));
      await salvarFolha(competencia, numericos, usuario);
      setMsg(`Folha de ${competencia} salva.`);
      setArquivo(null); setAvisos([]); setTocado(false); setJaExiste(true);
      aoImportar();
    } catch (e) {
      setErro('Falha ao salvar no banco. Verifique a internet e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  useImperativeHandle(ref, () => ({ confirmar }));

  return (
    <div style={styles.card}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Landmark size={16} /> Folha de Pagamento (RH)
      </div>
      <p style={{ ...styles.helper, marginTop: 4 }}>
        O PDF "Resumo Geral" do RH não tem texto extraível — peça pro Claude ler o PDF no chat e gerar
        a planilha (Folha_RH_AAAA-MM.xlsx), ou preencha os 10 campos manualmente abaixo.
      </p>

      {jaExiste && (
        <div style={{ ...styles.erro, background: '#FFF3E0', color: C.laranjaEsc }}>
          <AlertTriangle size={15} /> Já existe uma folha lançada pra {competencia} — salvar aqui vai sobrescrever os valores atuais.
        </div>
      )}

      <FileInput label="Folha_RH_AAAA-MM.xlsx" arquivo={arquivo} onSelecionar={importarArquivo} />

      {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
      {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}
      {avisos.length > 0 && (
        <div style={{ ...styles.erro, background: '#FFF3E0', color: C.laranjaEsc, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          {avisos.map((a, i) => <div key={i} style={{ display: 'flex', gap: 8 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{a}</div>)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: 14 }}>
        {CAMPOS_FOLHA_UI.map(c => (
          <div key={c.id}>
            <label style={{ ...styles.fieldLabel, color: c.destaque ? C.laranjaEsc : C.navy2, fontSize: 10.5 }}>{c.label}</label>
            <input type="text" inputMode="decimal" placeholder="0,00" value={valores[c.id]}
              onChange={e => set(c.id, e.target.value)}
              style={{ ...styles.input, borderColor: c.destaque ? C.laranja : C.prataClaro, padding: '8px 10px', fontSize: 13 }} />
          </div>
        ))}
      </div>

      <button onClick={confirmar} disabled={salvando || !tocado}
        style={{ ...styles.btnPrimary, marginTop: 16, opacity: (salvando || !tocado) ? .5 : 1 }}>
        {salvando ? 'Salvando…' : `Salvar folha de ${competencia}`}
      </button>
    </div>
  );
});

/* ---------- excluir uma importação errada ----------
   Combinado com Pablo em 20/ago/2026: seleciona tipo de arquivo + mês,
   "Buscar" mostra o que seria apagado (nunca apaga direto), só depois
   de conferir é que aparece o botão vermelho de confirmação. */
const TIPOS_EXCLUSAO = [
  { id: 'locacao', label: 'Faturamento — Locação (ND)', colecao: 'lancamentos_faturamento', filtroExtra: { tipo: 'locacao' } },
  { id: 'servico', label: 'Faturamento — Nota de Serviço', colecao: 'lancamentos_faturamento', filtroExtra: { tipo: 'servico' } },
  { id: 'despesas', label: 'Despesas', colecao: 'lancamentos_despesa', filtroExtra: {} },
  { id: 'folha', label: 'Folha de Pagamento (RH)', especial: 'folha' }
];

function BlocoExcluir({ aoExcluir }) {
  const [tipoId, setTipoId] = useState(TIPOS_EXCLUSAO[0].id);
  const [competencia, setCompetencia] = useState(mesAtual());
  const [buscando, setBuscando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [resultado, setResultado] = useState(null); // null = não buscou ainda
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState(null);

  const tipo = TIPOS_EXCLUSAO.find(t => t.id === tipoId);

  const buscar = async () => {
    setBuscando(true); setErro(''); setMsg(null); setResultado(null);
    try {
      if (tipo.especial === 'folha') {
        const historico = await listarFolha();
        const achada = historico.find(h => h.competencia === competencia);
        setResultado(achada ? [achada] : []);
      } else {
        const docs = await buscarParaExcluir(tipo.colecao, { ...tipo.filtroExtra, competencia });
        setResultado(docs);
      }
    } catch (e) {
      setErro('Falha ao buscar. Verifique a internet e tente de novo.');
    } finally {
      setBuscando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!resultado || resultado.length === 0) return;
    setExcluindo(true); setErro('');
    try {
      if (tipo.especial === 'folha') {
        await excluirFolha(competencia);
      } else {
        await excluirDocs(tipo.colecao, resultado.map(d => d.id));
      }
      setMsg(`Excluído: ${tipo.label} de ${competencia}.`);
      setResultado(null);
      aoExcluir();
    } catch (e) {
      setErro('Falha ao excluir. Verifique a internet e tente de novo.');
    } finally {
      setExcluindo(false);
    }
  };

  const total = resultado ? resultado.reduce((s, d) => s + (d.valor || 0), 0) : 0;

  return (
    <div style={{ ...styles.card, borderColor: C.vermelho, marginTop: 28 }}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.vermelho, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trash2 size={16} /> Excluir uma importação
      </div>
      <p style={{ ...styles.helper, marginTop: 4 }}>
        Errou o arquivo ou o mês? Escolha o tipo e a competência, confira o que seria apagado e só
        então confirme. Não afeta o cadastro de Fornecedores nem o histórico de importações — só os
        lançamentos daquele mês/tipo.
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <label style={styles.fieldLabel}>Tipo de arquivo importado</label>
          <select value={tipoId} onChange={e => { setTipoId(e.target.value); setResultado(null); setMsg(null); }}
            style={{ ...styles.input, minWidth: 240 }}>
            {TIPOS_EXCLUSAO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.fieldLabel}>Mês</label>
          <input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setResultado(null); setMsg(null); }}
            style={{ ...styles.input, maxWidth: 200 }} />
        </div>
      </div>

      <button onClick={buscar} disabled={buscando} style={{ ...styles.btnGhost, borderColor: C.vermelho, color: C.vermelho }}>
        {buscando ? 'Buscando…' : 'Buscar o que seria excluído'}
      </button>

      {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
      {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

      {resultado && resultado.length === 0 && (
        <div style={{ ...styles.helper, marginTop: 12 }}>Nada encontrado pra {tipo.label} em {competencia}.</div>
      )}

      {resultado && resultado.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5, marginBottom: 12 }}>
            <span style={{ ...styles.infoChip, color: C.vermelho, borderColor: C.vermelho }}>
              {resultado.length} {tipo.especial === 'folha' ? 'lançamento de folha' : 'lançamentos'} serão apagados
            </span>
            {tipo.especial !== 'folha' && <span style={{ ...styles.infoChip, color: C.vermelho, borderColor: C.vermelho }}>{brl(total)}</span>}
          </div>
          <button onClick={confirmarExclusao} disabled={excluindo} style={{
            ...styles.btnPrimary, background: C.vermelho, boxShadow: 'none', opacity: excluindo ? .7 : 1
          }}>
            {excluindo ? 'Excluindo…' : `Confirmar exclusão — ${tipo.label} de ${competencia}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ImportacaoTab({ usuario }) {
  const [versao, forceRefresh] = useState(0);
  const refrescar = () => forceRefresh(n => n + 1);
  const [competencia, setCompetencia] = useState(mesAtual());
  const [importandoTudo, setImportandoTudo] = useState(false);

  const refLocacao = useRef(null);
  const refServico = useRef(null);
  const refDespesas = useRef(null);
  const refFolha = useRef(null);

  const importarTudo = async () => {
    setImportandoTudo(true);
    try {
      await Promise.all([
        refLocacao.current?.confirmar(), refServico.current?.confirmar(),
        refDespesas.current?.confirmar(), refFolha.current?.confirmar()
      ]);
    } finally {
      setImportandoTudo(false);
    }
  };

  return (
    <div>
      <div style={styles.secTitle}><Upload size={19} /> Importação</div>
      <p style={styles.helper}>
        Escolha o mês de competência uma vez — vale pra todos os arquivos abaixo — e anexe cada um.
        Confira as prévias e clique em <b>Importar tudo</b>, ou confirme card por card se preferir.
        Não é a data dentro do arquivo que decide o mês; nada é substituído, cada importação soma ao
        histórico.
      </p>

      <AlertaImportacoesFaltando versao={versao} />

      <div style={{ ...styles.card, marginBottom: 18, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={styles.fieldLabel}>Mês de competência (vale para todos os arquivos abaixo)</label>
          <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
            style={{ ...styles.input, maxWidth: 200 }} />
        </div>
        <button onClick={importarTudo} disabled={importandoTudo}
          style={{ ...styles.btnPrimary, opacity: importandoTudo ? .7 : 1 }}>
          {importandoTudo ? 'Importando tudo…' : 'Importar tudo o que estiver anexado'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <BlocoFaturamento
          ref={refLocacao}
          titulo="Faturamento — Locação (ND)"
          ajuda='Relatório "Relação Faturamento por Filial - Detalhado". Só as linhas NFD/Débito entram; as NFS são ignoradas aqui (já vêm no arquivo de Serviços).'
          tipo="faturamento_locacao" parser={parseFaturamentoLocacao} usuario={usuario} competencia={competencia} aoImportar={refrescar}
        />
        <BlocoFaturamento
          ref={refServico}
          titulo="Faturamento — Nota de Serviço"
          ajuda='Relatório por Tipo de Serviço. Categorias unificadas: Armazenagem (1/272/283), Movimentação (284/289), Seguro (285/290), Outros (286/291), Cross Docking (288).'
          tipo="faturamento_servico" parser={parseFaturamentoServico} usuario={usuario} competencia={competencia} aoImportar={refrescar}
        />
        <BlocoDespesas ref={refDespesas} usuario={usuario} competencia={competencia} aoImportar={refrescar} />
      </div>

      <div style={{ marginTop: 16 }}>
        <BlocoFolha ref={refFolha} usuario={usuario} competencia={competencia} aoImportar={refrescar} />
      </div>

      <BlocoExcluir aoExcluir={refrescar} />
    </div>
  );
}
