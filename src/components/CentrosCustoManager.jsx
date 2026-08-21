import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { C, styles } from '../styles';
import { criarCentroCusto, renomearCentroCusto, excluirCentroCusto } from '../lib/db';

/* Subitem de Despesas pra manter os Centros de Custo (criar, renomear,
   apagar) sem precisar mexer direto no Firestore. Recebe centrosCusto e
   fornecedores já carregados pelo DespesasTab — evita duplicar a leitura.
   Combinado com Pablo em 21/ago/2026, junto com a importação da planilha
   de Cadastro de CC. */
export default function CentrosCustoManager({ centrosCusto, fornecedores, onChange }) {
  const [novoCC, setNovoCC] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');

  /* só o vínculo confirmado (centroCustoId) conta como "em uso" — uma
     sugestão pendente (centroCustoSugeridoId) não trava exclusão */
  const usoPorCC = useMemo(() => {
    const mapa = new Map();
    fornecedores.forEach(f => {
      if (!f.centroCustoId) return;
      mapa.set(f.centroCustoId, (mapa.get(f.centroCustoId) || 0) + 1);
    });
    return mapa;
  }, [fornecedores]);

  const lista = useMemo(() => centrosCusto.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [centrosCusto]);

  const adicionar = async () => {
    if (!novoCC.trim()) return;
    setSalvando(true); setErro('');
    try {
      await criarCentroCusto(novoCC);
      setNovoCC('');
      await onChange();
    } catch (e) {
      setErro('Falha ao criar. Verifique a internet e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (cc) => { setEditandoId(cc.id); setNomeEdicao(cc.nome); setErro(''); };
  const cancelarEdicao = () => { setEditandoId(null); setNomeEdicao(''); };

  const salvarEdicao = async (id) => {
    if (!nomeEdicao.trim()) return;
    setProcessandoId(id); setErro('');
    try {
      await renomearCentroCusto(id, nomeEdicao);
      setEditandoId(null); setNomeEdicao('');
      await onChange();
    } catch (e) {
      setErro('Falha ao renomear. Verifique a internet e tente de novo.');
    } finally {
      setProcessandoId(null);
    }
  };

  const apagar = async (cc) => {
    if (usoPorCC.get(cc.id) > 0) return; // botão já vem desabilitado, isso é só reforço
    if (!window.confirm(`Apagar o Centro de Custo "${cc.nome}"? Essa ação não pode ser desfeita.`)) return;
    setProcessandoId(cc.id); setErro('');
    try {
      await excluirCentroCusto(cc.id);
      await onChange();
    } catch (e) {
      setErro('Falha ao apagar. Verifique a internet e tente de novo.');
    } finally {
      setProcessandoId(null);
    }
  };

  return (
    <div>
      <p style={styles.helper}>
        Centros de Custo usados pra classificar Despesas por fornecedor (aba Fornecedores). Renomear
        aqui atualiza em todos os lugares que usam esse Centro de Custo — não precisa reclassificar
        nada. Só é possível apagar um Centro de Custo sem fornecedor vinculado.
      </p>

      <div style={{ ...styles.card, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
          Novo Centro de Custo
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={novoCC} onChange={e => setNovoCC(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionar()}
            placeholder="Nome do Centro de Custo…" style={{ ...styles.input, maxWidth: 280 }} />
          <button onClick={adicionar} disabled={salvando || !novoCC.trim()}
            style={{ ...styles.btnGhost, opacity: novoCC.trim() ? 1 : .5 }}>
            <Plus size={14} /> {salvando ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
        {erro && <div style={styles.erro}><X size={15} /> {erro}</div>}
      </div>

      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy, marginBottom: 10 }}>
        Cadastrados ({lista.length})
      </div>
      {lista.length === 0 ? (
        <div style={styles.empty}>Nenhum Centro de Custo cadastrado ainda.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {lista.map(cc => {
            const emUso = usoPorCC.get(cc.id) || 0;
            const editando = editandoId === cc.id;
            return (
              <div key={cc.id} style={{
                ...styles.card, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }}>
                {editando ? (
                  <input autoFocus value={nomeEdicao} onChange={e => setNomeEdicao(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && salvarEdicao(cc.id)}
                    style={{ ...styles.input, flex: 1, minWidth: 180 }} />
                ) : (
                  <div style={{ flex: 1, minWidth: 180, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.navy }}>
                    {cc.nome}
                  </div>
                )}
                <span style={styles.infoChip}>{emUso} fornecedor(es)</span>
                {editando ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button disabled={processandoId === cc.id} onClick={() => salvarEdicao(cc.id)}
                      style={{ ...styles.btnPrimary, background: C.verde, boxShadow: 'none', padding: '8px 12px', fontSize: 12.5 }}>
                      <Check size={14} />
                    </button>
                    <button onClick={cancelarEdicao} style={{ ...styles.btnGhost, padding: '8px 12px', fontSize: 12.5 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => iniciarEdicao(cc)} title="Renomear"
                      style={{ ...styles.btnGhost, padding: '8px 12px', fontSize: 12.5 }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => apagar(cc)} disabled={emUso > 0 || processandoId === cc.id}
                      title={emUso > 0 ? 'Tem fornecedor vinculado — não dá pra apagar' : 'Apagar'}
                      style={{
                        ...styles.btnGhost, padding: '8px 12px', fontSize: 12.5,
                        borderColor: emUso > 0 ? C.prataClaro : C.vermelho, color: emUso > 0 ? C.prata : C.vermelho,
                        cursor: emUso > 0 ? 'not-allowed' : 'pointer'
                      }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
