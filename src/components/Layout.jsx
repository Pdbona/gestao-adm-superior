import React, { useState } from 'react';
import { Menu, X, Upload, Receipt, Wallet, Building2, LineChart, LogOut, FolderCog, Tags, ChevronDown, ChevronRight } from 'lucide-react';
import { C, styles } from '../styles';
import SUP_LOGO from '../assets/Logo_Superior.png';
import SBS_LOGO from '../assets/Logo_SBS.png';

/* Mesmos ids usados em SUBITENS_POR_ABA.administrativo, no Operacional —
   é o que o perfil de lá controla via urlAdministrativo(?ocultar=). Lista
   plana (pra RBAC e pro conteúdo em App.jsx); o agrupamento visual em
   "Cadastro" é só de exibição, ver NAV_ITENS abaixo. */
export const ABAS = [
  { id: 'resultado', label: 'Resultado', icon: LineChart },
  { id: 'faturamento', label: 'Faturamento', icon: Receipt },
  { id: 'despesas', label: 'Despesas', icon: Wallet },
  { id: 'importacao', label: 'Importar Arquivos', icon: Upload },
  { id: 'fornecedores', label: 'Fornecedores', icon: Building2 },
  { id: 'centros_custo', label: 'Centro de Custo', icon: Tags }
];

/* Agrupamento visual da sidebar — combinado com Pablo em 21/ago/2026:
   Resultado, Faturamento e Despesas soltos; Importar Arquivos,
   Fornecedores e Centro de Custo dentro de um grupo "Cadastro" (abre/
   fecha, some se todos os filhos estiverem ocultos pro perfil).
   GRUPO_CADASTRO_FILHOS é reaproveitado logo abaixo: desde 28/ago/2026 o
   cadastro de perfil no Operacional passou a controlar os 3 juntos com um
   único item "Cadastro" (id "cadastro", que não é uma aba de verdade) em
   vez de individualmente — ver SUBITENS_POR_ABA.administrativo lá. */
export const GRUPO_CADASTRO_FILHOS = ['importacao', 'fornecedores', 'centros_custo'];
const NAV_ITENS = [
  { id: 'resultado' },
  { id: 'faturamento' },
  { id: 'despesas' },
  { grupo: 'cadastro', label: 'Cadastro', icon: FolderCog, filhos: GRUPO_CADASTRO_FILHOS }
];

export default function Layout({ aba, setAba, usuario, sair, ocultar, children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  /* "cadastro" em ocultar não é uma aba de verdade — expande pros 3 filhos
     do grupo, que são os ids reais em ABAS (ver comentário no NAV_ITENS). */
  const ocultarEfetivo = ocultar?.includes('cadastro') ? [...ocultar, ...GRUPO_CADASTRO_FILHOS] : ocultar;
  const abasVisiveis = ABAS.filter(a => !ocultarEfetivo?.includes(a.id));
  const idsVisiveis = new Set(abasVisiveis.map(a => a.id));
  const porId = Object.fromEntries(ABAS.map(a => [a.id, a]));

  const grupoDoAtivo = NAV_ITENS.find(it => it.grupo && it.filhos.includes(aba))?.grupo;
  const [grupoAberto, setGrupoAberto] = useState(grupoDoAtivo || null);

  const irPara = (id) => { setAba(id); setMenuAberto(false); };

  return (
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column' }}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="sbs-hamburguer" onClick={() => setMenuAberto(true)}
            style={{ ...styles.headerBtn, display: 'none' }}>
            <Menu size={19} />
          </button>
          <div style={styles.logoWrap}>
            <img src={SUP_LOGO} alt="Superior Transportes" style={{ height: 26 }} />
          </div>
          <div style={{ color: C.branco }}>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: .3 }}>
              GESTÃO ADMINISTRATIVA
            </div>
            <div style={{ fontFamily: "'Roboto',sans-serif", fontSize: 10.5, color: C.prataClaro }}>
              Superior Transportes · CD Serra/ES
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: C.prataClaro, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12 }}>
            {usuario}
          </span>
          <button onClick={sair} style={{
            display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.12)',
            border: 'none', borderRadius: 20, padding: '7px 13px', cursor: 'pointer', color: C.branco,
            fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12
          }} title="Sair — volta pro Gestão Superior CD">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>
      <div style={styles.accentBar} />

      <div style={{ ...styles.sidebarShell, flex: 1, minHeight: 0 }}>
        {menuAberto && (
          <div className="sbs-sidebar-backdrop aberta" onClick={() => setMenuAberto(false)} />
        )}
        <nav className={`sbs-sidebar${menuAberto ? ' aberta' : ''}`} style={styles.sidebar}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button className="sbs-hamburguer" onClick={() => setMenuAberto(false)}
              style={{ ...styles.headerBtn, background: C.bgLeve, color: C.navy, display: 'none' }}>
              <X size={17} />
            </button>
          </div>
          {NAV_ITENS.map(item => {
            if (!item.grupo) {
              if (!idsVisiveis.has(item.id)) return null;
              const a = porId[item.id];
              const Icone = a.icon;
              const ativo = aba === a.id;
              return (
                <button key={a.id} onClick={() => irPara(a.id)}
                  style={{ ...styles.sidebarItem, ...(ativo ? styles.sidebarItemAtivo : {}) }}>
                  <Icone size={17} strokeWidth={2.2} /> {a.label}
                </button>
              );
            }
            const filhosVisiveis = item.filhos.filter(id => idsVisiveis.has(id));
            if (filhosVisiveis.length === 0) return null;
            const Icone = item.icon;
            const aberto = grupoAberto === item.grupo;
            const temAtivo = filhosVisiveis.includes(aba);
            return (
              <div key={item.grupo}>
                <button onClick={() => setGrupoAberto(aberto ? null : item.grupo)}
                  style={{ ...styles.sidebarItem, ...(temAtivo && !aberto ? styles.sidebarItemAtivo : {}), justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icone size={17} strokeWidth={2.2} /> {item.label}
                  </span>
                  {aberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {aberto && filhosVisiveis.map(id => {
                  const a = porId[id];
                  const IconeFilho = a.icon;
                  const ativo = aba === a.id;
                  return (
                    <button key={a.id} onClick={() => irPara(a.id)} style={{
                      ...styles.sidebarItem, ...(ativo ? styles.sidebarItemAtivo : {}),
                      paddingLeft: 30, fontSize: 12.5
                    }}>
                      <IconeFilho size={15} strokeWidth={2.2} /> {a.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <main style={{ ...styles.main, minWidth: 0, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      <footer style={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={SBS_LOGO} alt="SBS Solution" style={{ height: 20, borderRadius: 5 }} />
          Desenvolvido pela SBS Solution
        </div>
        <div>Gestão ADM · uso interno</div>
      </footer>
    </div>
  );
}
