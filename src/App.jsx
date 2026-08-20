import React, { useEffect, useState } from 'react';
import { C, styles } from './styles';
import Layout, { ABAS } from './components/Layout';
import ImportacaoTab from './components/ImportacaoTab';
import FaturamentoTab from './components/FaturamentoTab';
import DespesasTab from './components/DespesasTab';
import FornecedoresTab from './components/FornecedoresTab';
import ResultadoTab from './components/ResultadoTab';
import SUP_LOGO from './assets/Logo_Superior.png';

const K_USUARIO = 'gestao_adm_usuario';
/* Combinado com Pablo em 20/ago/2026: "Sair" leva de volta pro
   Gestão Superior CD (Operacional), não pra tela de identificação
   daqui — essa tela só existe pra quem abre o link direto, sem passar
   pelo Hub. */
const URL_APP_OPERACIONAL = 'https://Pdbona.github.io/cd-superior/';

/* Sem login próprio, de propósito — o acesso já é validado lá no Hub do
   Operacional (perfil com a permissão "Administrativo"), igual ao App de
   Gestão Comercial. Aqui só perguntamos o nome pra saber quem importou
   cada lançamento e quem validou cada fornecedor — fica salvo no
   navegador, então só pergunta de novo se trocar de aparelho/navegador. */
function TelaIdentificacao({ onEntrar }) {
  const [nome, setNome] = useState('');
  return (
    <div style={{ ...styles.page, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ ...styles.logoWrap, margin: '0 auto 20px', padding: '10px 14px' }}>
          <img src={SUP_LOGO} alt="Superior Transportes" style={{ height: 34 }} />
        </div>
        <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
          Gestão Administrativa
        </h2>
        <p style={{ color: C.prata, fontSize: 13, marginTop: 0, marginBottom: 20 }}>Como você quer ser identificado nas importações?</p>
        <input autoFocus value={nome} onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && nome.trim() && onEntrar(nome.trim())}
          placeholder="Seu nome" style={{ ...styles.input, textAlign: 'center', fontSize: 15 }} />
        <button onClick={() => nome.trim() && onEntrar(nome.trim())} disabled={!nome.trim()}
          style={{ ...styles.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 14, opacity: nome.trim() ? 1 : .5 }}>
          Entrar
        </button>
      </div>
    </div>
  );
}

/* Nome já resolvido antes do primeiro render: se veio da URL (o
   Operacional abre com ?usuario=Fulano, depois que a pessoa já logou por
   lá), usa direto e pula a TelaIdentificacao — não faz sentido perguntar
   de novo quem já se identificou. Sem o parâmetro (link aberto direto,
   sem passar pelo Hub), cai pro nome salvo no navegador ou pergunta. */
function usuarioInicial() {
  const daUrl = new URLSearchParams(window.location.search).get('usuario');
  if (daUrl && daUrl.trim()) return daUrl.trim();
  return localStorage.getItem(K_USUARIO) || '';
}

/* ?ocultar=faturamento,despesas — mesma convenção do App Gestão Comercial:
   o perfil no Operacional marca quais abas essa pessoa NÃO vê, e a URL
   já chega com a lista pronta (combinado com Pablo em 20/ago/2026). */
function ocultarInicial() {
  const v = new URLSearchParams(window.location.search).get('ocultar');
  return v ? v.split(',').filter(Boolean) : [];
}

export default function App() {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [ocultar] = useState(ocultarInicial);
  const abasVisiveis = ABAS.filter(a => !ocultar.includes(a.id));
  const [aba, setAba] = useState(() => abasVisiveis[0]?.id || 'importacao');

  useEffect(() => {
    if (usuario) localStorage.setItem(K_USUARIO, usuario);
  }, [usuario]);

  // limpa ?usuario=/?ocultar= da barra de endereço depois de ler — não
  // precisa ficar visível nem sobreviver a um refresh manual da página.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!usuario) return <TelaIdentificacao onEntrar={setUsuario} />;

  const sair = () => {
    localStorage.removeItem(K_USUARIO);
    window.location.href = URL_APP_OPERACIONAL;
  };

  return (
    <Layout aba={aba} setAba={setAba} usuario={usuario} sair={sair} ocultar={ocultar}>
      {aba === 'importacao' && <ImportacaoTab usuario={usuario} />}
      {aba === 'faturamento' && <FaturamentoTab />}
      {aba === 'despesas' && <DespesasTab />}
      {aba === 'fornecedores' && <FornecedoresTab usuario={usuario} />}
      {aba === 'resultado' && <ResultadoTab />}
    </Layout>
  );
}
