/* Paleta e vocabulário visual herdados do APP_Gestao_Operacional — mesma
   identidade da Superior Transportes em todos os apps do ecossistema SBS. */
export const C = {
  navy: "#1E3A5F", navy2: "#2B4C7E", prata: "#8A9BB0", prataClaro: "#C5CDD8",
  branco: "#FFFFFF", texto: "#1A2B3C", laranja: "#FF6B00", laranjaEsc: "#B5560A",
  verde: "#2E7D32", amarelo: "#F9A825", vermelho: "#C62828", bgLeve: "#F4F6F9"
};

export const styles = {
  page: { fontFamily: "'Roboto', sans-serif", background: C.bgLeve, color: C.texto, minHeight: "100vh" },
  header: { background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)`, padding: "18px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 },
  headerBtn: { background: "rgba(255,255,255,.14)", color: C.branco, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  logoWrap: { borderRadius: 12, overflow: "hidden", padding: "6px 8px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: C.branco },
  accentBar: { height: 6, background: `linear-gradient(90deg, ${C.laranja} 0%, ${C.navy} 100%)` },
  sidebarShell: { display: "flex", alignItems: "stretch" },
  sidebar: { width: 230, flexShrink: 0, background: C.branco, borderRight: `1px solid ${C.prataClaro}`, padding: "14px 12px", overflowY: "auto" },
  sidebarItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", border: "none", background: "transparent", color: C.texto, cursor: "pointer", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, textAlign: "left", marginBottom: 3 },
  sidebarItemAtivo: { background: "#EEF2F8", color: C.navy },
  main: { padding: "22px 26px", maxWidth: 1220, margin: "0 auto", flex: 1, minWidth: 0 },
  secTitle: { fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 800, color: C.navy, borderLeft: `5px solid ${C.navy}`, paddingLeft: 12, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 9, lineHeight: 1.3 },
  card: { background: C.branco, border: `1px solid ${C.prataClaro}`, borderRadius: 10, padding: 20, boxShadow: "0 2px 10px rgba(30,58,95,.06)" },
  fieldLabel: { display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: C.navy2, marginBottom: 6, letterSpacing: .2 },
  input: { width: "100%", padding: "10px 12px", border: `1.5px solid ${C.prataClaro}`, borderRadius: 8, fontFamily: "'Roboto',sans-serif", fontSize: 14, color: C.texto, background: C.branco },
  erro: { marginTop: 14, background: "#FFEBEE", color: C.vermelho, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  ok: { marginTop: 14, background: "#EAF5EC", color: C.verde, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 8, background: C.laranja, color: C.branco, border: "none", borderRadius: 8, padding: "12px 20px", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(255,107,0,.25)" },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 8, background: C.branco, color: C.navy, border: `1.5px dashed ${C.prata}`, borderRadius: 8, padding: "11px 18px", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  helper: { fontSize: 13, color: C.texto, margin: "0 0 14px", lineHeight: 1.5 },
  table: { width: "100%", borderCollapse: "collapse", border: `1px solid ${C.prataClaro}`, borderRadius: 8, overflow: "hidden", fontSize: 12.5, minWidth: 720 },
  th: { background: C.navy, color: C.branco, fontFamily: "'Montserrat',sans-serif", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", padding: "11px 10px", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "10px", borderBottom: `1px solid ${C.prataClaro}`, fontFamily: "'Roboto',sans-serif", color: C.texto, whiteSpace: "nowrap" },
  tdMono: { padding: "10px", borderBottom: `1px solid ${C.prataClaro}`, fontFamily: "'Roboto Mono',monospace", color: C.texto, whiteSpace: "nowrap", fontSize: 12 },
  pill: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, textTransform: "uppercase", lineHeight: 1, whiteSpace: "nowrap" },
  infoChip: { display: "inline-flex", alignItems: "center", gap: 4, background: C.bgLeve, border: `1px solid ${C.prataClaro}`, borderRadius: 6, padding: "4px 8px", fontSize: 11.5, color: C.texto },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, margin: "6px 0 22px" },
  kpiCard: { background: C.branco, border: `1px solid ${C.prataClaro}`, borderTop: `4px solid ${C.navy}`, borderRadius: 10, padding: "15px 16px", boxShadow: "0 2px 10px rgba(30,58,95,.08)" },
  kpiLabel: { fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.navy2, lineHeight: 1.25 },
  kpiValor: { fontFamily: "'Roboto Mono',monospace", fontSize: 23, fontWeight: 700, margin: "10px 0 4px" },
  kpiNota: { fontSize: 11, color: C.prata, lineHeight: 1.35 },
  empty: { textAlign: "center", padding: "40px 20px", color: C.prata, fontSize: 13.5, background: C.branco, border: `1px dashed ${C.prataClaro}`, borderRadius: 10 },
  footer: { background: C.navy, color: C.branco, padding: "18px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, fontFamily: "'Roboto',sans-serif", fontSize: 11.5, marginTop: 0, borderTop: `3px solid ${C.laranja}` }
};

export const brl = (v) => "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDataBR = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const mesLabel = (competencia) => {
  if (!competencia) return "—";
  const [y, m] = competencia.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[parseInt(m, 10) - 1]}/${y.slice(2)}`;
};

/* variação percentual mês a mês — usada pra sinalizar alta/queda >10%
   (combinado com Pablo em 20/ago/2026) nas tabelas de evolução mensal */
export const variacaoPct = (atual, anterior) => {
  if (anterior == null || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
};
