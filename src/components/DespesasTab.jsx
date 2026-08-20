import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { C, styles, brl, fmtDataBR } from '../styles';
import { lerPlanilha } from '../lib/xls';
import { parseDespesas } from '../lib/parsers';
import { listarFornecedores, garantirFornecedores, salvarDespesas, listarDespesas, registrarLote } from '../lib/db';
import FileInput from './FileInput';

function statusFornecedor(fornecedoresMapa, codigo) {
  const f = fornecedoresMapa.get(codigo);
  if (!f) return 'novo';
  if (f.ehDoCD === true) return 'validado';
  if (f.ehDoCD === false) return 'rejeitado';
  return 'pendente';
}

const BADGE = {
  validado: { bg: '#EAF5EC', cor: C.verde, texto: 'Validado' },
  pendente: { bg: '#FFF3E0', cor: C.laranjaEsc, texto: 'Pendente' },
  rejeitado: { bg: '#FFEBEE', cor: C.vermelho, texto: 'Não é do CD' },
  novo: { bg: '#FFF3E0', cor: C.laranjaEsc, texto: 'Novo — pendente' }
};

export default function DespesasTab({ usuario }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');

  const fornecedoresMapa = useMemo(() => new Map(fornecedores.map(f => [f.codigo, f])), [fornecedores]);

  const carregar = async () => {
    setCarregando(true);
    const [f, d] = await Promise.all([listarFornecedores(), listarDespesas()]);
    setFornecedores(f); setDespesas(d);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const onSelecionarArquivo = async (file) => {
    setArquivo(file); setParse(null); setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parseDespesas(rows);
      if (resultado.linhas.length === 0) {
        setErro('Não encontrei nenhuma linha de lançamento reconhecível neste arquivo. Confira se é o relatório "Documentos C. Pagar por Vencimento".');
        return;
      }
      setParse(resultado);
    } catch (e) {
      setErro('Não consegui ler este arquivo. Confira se é um .xls/.xlsx válido.');
    }
  };

  const confirmarImportacao = async () => {
    if (!parse) return;
    setImportando(true); setErro('');
    try {
      const fornecedoresEncontrados = new Map();
      parse.linhas.forEach(l => fornecedoresEncontrados.set(l.fornecedorCodigo, l.fornecedorNome));
      const novosFornecedores = await garantirFornecedores(fornecedoresEncontrados, fornecedoresMapa);

      const competencias = [...new Set(parse.linhas.map(l => l.competencia).filter(Boolean))];
      const loteId = await registrarLote({
        tipo: 'despesa', arquivoNome: arquivo.name, importadoPor: usuario,
        linhasImportadas: parse.linhas.length, competencias
      });
      await salvarDespesas(parse.linhas, loteId);

      setMsg(`Importado: ${parse.linhas.length} lançamentos${novosFornecedores > 0 ? ` · ${novosFornecedores} fornecedor(es) novo(s) foram para a fila de validação` : ''}.`);
      setArquivo(null); setParse(null);
      await carregar();
    } catch (e) {
      setErro('Falha ao salvar no banco. Verifique a internet e tente de novo.');
    } finally {
      setImportando(false);
    }
  };

  const resumoParse = useMemo(() => {
    if (!parse) return null;
    const porStatus = { validado: 0, pendente: 0, rejeitado: 0, novo: 0 };
    let valorContavel = 0;
    for (const l of parse.linhas) {
      const st = statusFornecedor(fornecedoresMapa, l.fornecedorCodigo);
      porStatus[st]++;
      if (st === 'validado') valorContavel += l.valor;
    }
    const totalValor = parse.linhas.reduce((s, l) => s + l.valor, 0);
    return { porStatus, valorContavel, totalValor, n: parse.linhas.length };
  }, [parse, fornecedoresMapa]);

  const totalValidadoHistorico = useMemo(() => despesas.reduce((s, d) => {
    const f = fornecedoresMapa.get(d.fornecedorCodigo);
    return f?.ehDoCD === true ? s + (d.valor || 0) : s;
  }, 0), [despesas, fornecedoresMapa]);

  const pendentesNoCadastro = fornecedores.filter(f => f.ehDoCD == null).length;

  return (
    <div>
      <div style={styles.secTitle}><Wallet size={19} /> Despesas</div>
      <p style={styles.helper}>
        Importe o relatório "Documentos C. Pagar por Vencimento" (Filial do CD) todo mês. Cada
        lançamento soma ao histórico — nada é substituído. Fornecedores novos vão para a fila de
        validação em <b>Fornecedores</b> antes de entrar nos totais.
      </p>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Despesas validadas (total)</div>
          <div style={{ ...styles.kpiValor, color: C.vermelho }}>{brl(totalValidadoHistorico)}</div>
          <div style={styles.kpiNota}>{despesas.length} lançamento(s) no histórico</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Fornecedores pendentes</div>
          <div style={{ ...styles.kpiValor, color: pendentesNoCadastro > 0 ? C.laranjaEsc : C.verde }}>{pendentesNoCadastro}</div>
          <div style={styles.kpiNota}>aguardando validação (aba Fornecedores)</div>
        </div>
      </div>

      <div style={styles.card}>
        <FileInput label="Relatório de Contas a Pagar por Vencimento" arquivo={arquivo} onSelecionar={onSelecionarArquivo} />

        {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
        {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

        {resumoParse && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
              <span style={styles.infoChip}>{resumoParse.n} lançamentos lidos</span>
              <span style={{ ...styles.infoChip, color: C.verde, borderColor: C.verde }}>
                {resumoParse.porStatus.validado} de fornecedor já validado ({brl(resumoParse.valorContavel)})
              </span>
              {(resumoParse.porStatus.pendente + resumoParse.porStatus.novo) > 0 && (
                <span style={{ ...styles.infoChip, color: C.laranjaEsc, borderColor: C.laranja }}>
                  {resumoParse.porStatus.pendente + resumoParse.porStatus.novo} aguardando validação de fornecedor
                </span>
              )}
              {resumoParse.porStatus.rejeitado > 0 && (
                <span style={{ ...styles.infoChip, color: C.vermelho, borderColor: C.vermelho }}>
                  {resumoParse.porStatus.rejeitado} de fornecedor marcado "não é do CD" (não entra no total)
                </span>
              )}
            </div>
            <button onClick={confirmarImportacao} disabled={importando}
              style={{ ...styles.btnPrimary, marginTop: 14, opacity: importando ? .7 : 1 }}>
              {importando ? 'Importando…' : `Confirmar e importar ${resumoParse.n} lançamentos`}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
          Lançamentos mais recentes
        </div>
        {carregando ? (
          <div style={styles.empty}>Carregando…</div>
        ) : despesas.length === 0 ? (
          <div style={styles.empty}>Nenhuma despesa importada ainda.</div>
        ) : (
          <div className="scroll-x" style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead><tr>
                {['Vencimento', 'Tipo', 'Fornecedor', 'Documento', 'Valor', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {despesas.slice().sort((a, b) => (b.vencimento || '').localeCompare(a.vencimento || '')).slice(0, 40).map(d => {
                  const st = statusFornecedor(fornecedoresMapa, d.fornecedorCodigo);
                  const b = BADGE[st];
                  return (
                    <tr key={d.id}>
                      <td style={styles.tdMono}>{fmtDataBR(d.vencimento)}</td>
                      <td style={styles.td}>{d.tipoDocumentoLabel || d.tipoDocumentoCodigo}</td>
                      <td style={styles.td}>{d.fornecedorNome}</td>
                      <td style={styles.tdMono}>{d.documento}</td>
                      <td style={styles.tdMono}>{brl(d.valor)}</td>
                      <td style={styles.td}><span style={{ ...styles.pill, background: b.bg, color: b.cor }}>{b.texto}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
