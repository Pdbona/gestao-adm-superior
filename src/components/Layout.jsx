import React, { useState } from 'react';
import { Menu, X, Upload, Receipt, Wallet, Building2, LineChart, LogOut } from 'lucide-react';
import { C, styles } from '../styles';
import SUP_LOGO from '../assets/Logo_Superior.png';
import SBS_LOGO from '../assets/Logo_SBS.png';

/* Mesmos ids usados em SUBITENS_POR_ABA.administrativo, no Operacional —
   é o que o perfil de lá controla via urlAdministrativo(?ocultar=). */
export const ABAS = [
  { id: 'importacao', label: 'Importação', icon: Upload },
  { id: 'faturamento', label: 'Faturamento', icon: Receipt },
  { id: 'despesas', label: 'Despesas', icon: Wallet },
  { id: 'fornecedores', label: 'Fornecedores', icon: Building2 },
  { id: 'resultado', label: 'Resultado', icon: LineChart }
];

export default function Layout({ aba, setAba, usuario, sair, ocultar, children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const abasVisiveis = ABAS.filter(a => !ocultar?.includes(a.id));

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
          {abasVisiveis.map(a => {
            const Icone = a.icon;
            const ativo = aba === a.id;
            return (
              <button key={a.id} onClick={() => { setAba(a.id); setMenuAberto(false); }}
                style={{ ...styles.sidebarItem, ...(ativo ? styles.sidebarItemAtivo : {}) }}>
                <Icone size={17} strokeWidth={2.2} /> {a.label}
              </button>
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
