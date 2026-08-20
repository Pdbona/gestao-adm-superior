import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Receipt } from 'lucide-react';
import { C, styles, brl, fmtDataBR } from '../styles';
import { lerPlanilha } from '../lib/xls';
import { parseFaturamentoLocacao, parseFaturamentoServico, CATEGORIA_SERVICO_LABEL } from '../lib/parsers';
import { salvarFaturamento, listarFaturamento, registrarLote } from '../lib/db';
import FileInput from './FileInput';

function BlocoImportacao({ titulo, ajuda, tipo, parser, usuario, aoImportar }) {
  const [arquivo, setArquivo] = useState(null);
  const [parse, setParse] = useState(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erro, setErro] = useState('');

  const onSelecionar = async (file) => {
    setArquivo(file); setParse(null); setErro(''); setMsg(null);
    try {
      const rows = await lerPlanilha(file);
      const resultado = parser(rows);
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
      const competencias = [...new Set(parse.linhas.map(l => l.competencia).filter(Boolean))];
      const loteId = await registrarLote({
        tipo, arquivoNome: arquivo.name, importadoPor: usuario,
        linhasImportadas: parse.linhas.length, competencias
      });
      await salvarFaturamento(parse.linhas, loteId);
      setMsg(`Importado: ${parse.linhas.length} lançamentos (${brl(parse.linhas.reduce((s, l) => s + l.valor, 0))}).`);
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
      <FileInput label={titulo} arquivo={arquivo} onSelecionar={onSelecionar} />

      {erro && <div style={styles.erro}><AlertTriangle size={15} /> {erro}</div>}
      {msg && <div style={styles.ok}><CheckCircle2 size={15} /> {msg}</div>}

      {parse && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span style={styles.infoChip}>{parse.linhas.length} lançamentos lidos</span>
            <span style={{ ...styles.infoChip, color: C.verde, borderColor: C.verde }}>{brl(total)}</span>
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

export default function FaturamentoTab({ usuario }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    setLancamentos(await listarFaturamento());
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const totalGeral = useMemo(() => lancamentos.reduce((s, l) => s + (l.valor || 0), 0), [lancamentos]);
  const totalLocacao = useMemo(() => lancamentos.filter(l => l.tipo === 'locacao').reduce((s, l) => s + (l.valor || 0), 0), [lancamentos]);
  const totalServico = useMemo(() => lancamentos.filter(l => l.tipo === 'servico').reduce((s, l) => s + (l.valor || 0), 0), [lancamentos]);

  const porCategoria = useMemo(() => {
    const m = {};
    lancamentos.filter(l => l.tipo === 'servico').forEach(l => {
      m[l.categoria] = (m[l.categoria] || 0) + (l.valor || 0);
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [lancamentos]);

  return (
    <div>
      <div style={styles.secTitle}><Receipt size={19} /> Faturamento</div>
      <p style={styles.helper}>
        Duas fontes, importadas separadamente todo mês: Locação (relatório de faturamento por
        filial, só as linhas de débito/ND) e Serviços (relatório por tipo de serviço). Nada é
        substituído — cada importação soma ao histórico.
      </p>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Faturamento total</div>
          <div style={{ ...styles.kpiValor, color: C.verde }}>{brl(totalGeral)}</div>
          <div style={styles.kpiNota}>{lancamentos.length} lançamento(s) no histórico</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Locação</div>
          <div style={styles.kpiValor}>{brl(totalLocacao)}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Serviços</div>
          <div style={styles.kpiValor}>{brl(totalServico)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <BlocoImportacao
          titulo="Faturamento — Locação (ND)"
          ajuda='Relatório "Relação Faturamento por Filial - Detalhado". Só as linhas NFD/Débito entram; as NFS são ignoradas aqui (já vêm no arquivo de Serviços).'
          tipo="faturamento_locacao" parser={parseFaturamentoLocacao} usuario={usuario} aoImportar={carregar}
        />
        <BlocoImportacao
          titulo="Faturamento — Serviços"
          ajuda='Relatório por Tipo de Serviço. Categorias unificadas: Armazenagem (1/272/283), Movimentação (284/289), Seguro (285/290), Outros (286/291), Cross Docking (288).'
          tipo="faturamento_servico" parser={parseFaturamentoServico} usuario={usuario} aoImportar={carregar}
        />
      </div>

      {porCategoria.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
            Serviços por categoria (acumulado)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {porCategoria.map(([cat, valor]) => (
              <span key={cat} style={{ ...styles.infoChip, fontSize: 12.5 }}>
                {CATEGORIA_SERVICO_LABEL[cat] || cat}: <b style={{ marginLeft: 4 }}>{brl(valor)}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
          Lançamentos mais recentes
        </div>
        {carregando ? (
          <div style={styles.empty}>Carregando…</div>
        ) : lancamentos.length === 0 ? (
          <div style={styles.empty}>Nenhum faturamento importado ainda.</div>
        ) : (
          <div className="scroll-x" style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead><tr>{['Data', 'Tipo', 'Categoria', 'Cliente', 'Documento', 'Valor'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {lancamentos.slice().sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 40).map(l => (
                  <tr key={l.id}>
                    <td style={styles.tdMono}>{fmtDataBR(l.data)}</td>
                    <td style={styles.td}>{l.tipo === 'locacao' ? 'Locação' : 'Serviço'}</td>
                    <td style={styles.td}>{l.tipo === 'servico' ? (CATEGORIA_SERVICO_LABEL[l.categoria] || l.categoria) : '—'}</td>
                    <td style={styles.td}>{l.clienteNome}</td>
                    <td style={styles.tdMono}>{l.documento} {l.numero}</td>
                    <td style={styles.tdMono}>{brl(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
