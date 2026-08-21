import React, { useEffect, useState } from 'react';
import { Tags } from 'lucide-react';
import { styles } from '../styles';
import { listarFornecedores, listarCentrosCusto } from '../lib/db';
import ErroCarregamento from './ErroCarregamento';
import CentrosCustoManager from './CentrosCustoManager';

/* Subitem "Centro de Custo" dentro de Cadastro — antes vivia dentro de
   Despesas, movido pra cá em 21/ago/2026 (combinado com Pablo, junto
   com o resto de Cadastro: Importar Arquivos, Fornecedores, Centro de
   Custo). */
export default function CentrosCustoTab() {
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro(false);
    try {
      const [cc, f] = await Promise.all([listarCentrosCusto(), listarFornecedores()]);
      setCentrosCusto(cc); setFornecedores(f);
    } catch (e) {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => { carregar(); }, []);

  if (erro) return <ErroCarregamento onTentarDeNovo={carregar} />;
  if (carregando) return <div style={styles.empty}>Carregando…</div>;

  return (
    <div>
      <div style={styles.secTitle}><Tags size={19} /> Centro de Custo</div>
      <CentrosCustoManager centrosCusto={centrosCusto} fornecedores={fornecedores} onChange={carregar} />
    </div>
  );
}
