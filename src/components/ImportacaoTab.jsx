import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { C, styles, brl } from '../styles';
import { lerPlanilha } from '../lib/xls';
import { parseFaturamentoLocacao, parseFaturamentoServico, parseDespesas, SUGESTAO_CC_POR_TIPO_DOC } from '../lib/parsers';
import { salvarFaturamento, salvarDespesas, registrarLote, listarFornecedores, garantirFornecedores, listarCentrosCusto } from '../lib/db';
import FileInput from './FileInput';
import FolhaTab from './FolhaTab';

const mesAtual = () => new Date().toISOString().slice(0, 7);

/* ---------- bloco genérico: Faturamento (Locação ou Serviços) ----------
   Mês escolhido manualmente aqui — nunca a data que vem dentro do
   arquivo (combinado com Pablo em 20/ago/2026). O arquivo pode trazer
   documentos de qualquer data; quem importa decide a qual competência
   eles pertencem. */
function BlocoFaturamento({ titulo, ajuda, tipo, parser, usuario, aoImportar }) {
  const [competencia, setCompetencia] = useState(mesAtual());
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');

  const onSelecionar = async (file) => {
    setArquivo(file); setParse(null); setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parser(rows, competencia);
      if (resultado.linhas.length === 0) {
        setErro('Não encontrei nenhuma linha reconhecível neste arquivo. Confira se é o relatório certo.');
        return;
      }
      setParse(resultado);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
    }
  };

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

  const total = parse ? parse.linhas.reduce((s, l) => s + l.valor, 0) : 0;

  return (
    <div style={styles.card}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>{titulo}</div>
      <p style={{ ...styles.helper, marginTop: 4 }}>{ajuda}</p>

      <label style={styles.fieldLabel}>Mês a que este arquivo pertence</label>
      <input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setParse(null); setArquivo(null); }}
        style={{ ...styles.input, maxWidth: 200, marginBottom: 14 }} />

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
}

/* ---------- bloco Despesas — igual acima, mas cruza fornecedor x Centro de Custo ---------- */
function BlocoDespesas({ usuario, aoImportar }) {
  const [competencia, setCompetencia] = useState(mesAtual());
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');
  const [fornecedoresMapa, setFornecedoresMapa] = useState(new Map());
  const [centrosCusto, setCentrosCusto] = useState([]);

  useEffect(() => {
    (async () => {
      const [f, cc] = await Promise.all([listarFornecedores(), listarCentrosCusto()]);
      setFornecedoresMapa(new Map(f.map(x => [x.codigo, x])));
      setCentrosCusto(cc);
    })();
  }, []);

  const onSelecionar = async (file) => {
    setArquivo(file); setParse(null); setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parseDespesas(rows, competencia);
      if (resultado.linhas.length === 0) {
        setErro('Não encontrei nenhuma linha reconhecível neste arquivo. Confira se é o relatório "Documentos C. Pagar por Vencimento".');
        return;
      }
      setParse(resultado);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
    }
  };

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

  const total = parse ? parse.linhas.reduce((s, l) => s + l.valor, 0) : 0;
  const fornecedoresNovos = parse ? new Set(parse.linhas.map(l => l.fornecedorCodigo).filter(c => !fornecedoresMapa.has(c))).size : 0;

  return (
    <div style={styles.card}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>Despesas</div>
      <p style={{ ...styles.helper, marginTop: 4 }}>
        Relatório "Documentos C. Pagar por Vencimento" (Filial do CD). Fornecedor novo entra na fila
        de validação (aba Fornecedores) já com sugestão de Centro de Custo.
      </p>

      <label style={styles.fieldLabel}>Mês a que este arquivo pertence</label>
      <input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setParse(null); setArquivo(null); }}
        style={{ ...styles.input, maxWidth: 200, marginBottom: 14 }} />

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
}

export default function ImportacaoTab({ usuario }) {
  const [, forceRefresh] = useState(0);
  const refrescar = () => forceRefresh(n => n + 1);

  return (
    <div>
      <div style={styles.secTitle}><Upload size={19} /> Importação</div>
      <p style={styles.helper}>
        Todo mês, aqui: escolha o mês de competência de cada arquivo e importe — não é a data dentro
        do arquivo que decide o mês, é a sua escolha aqui. Nada é substituído, cada importação soma
        ao histórico.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <BlocoFaturamento
          titulo="Faturamento — Locação (ND)"
          ajuda='Relatório "Relação Faturamento por Filial - Detalhado". Só as linhas NFD/Débito entram; as NFS são ignoradas aqui (já vêm no arquivo de Serviços).'
          tipo="faturamento_locacao" parser={parseFaturamentoLocacao} usuario={usuario} aoImportar={refrescar}
        />
        <BlocoFaturamento
          titulo="Faturamento — Nota de Serviço"
          ajuda='Relatório por Tipo de Serviço. Categorias unificadas: Armazenagem (1/272/283), Movimentação (284/289), Seguro (285/290), Outros (286/291), Cross Docking (288).'
          tipo="faturamento_servico" parser={parseFaturamentoServico} usuario={usuario} aoImportar={refrescar}
        />
        <BlocoDespesas usuario={usuario} aoImportar={refrescar} />
      </div>

      <div style={{ marginTop: 28 }}>
        <FolhaTab usuario={usuario} />
      </div>
    </div>
  );
}
