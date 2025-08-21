// src/components/SidePanel.jsx

export default function SidePanel({
  filters,
  onToggleLine,
  areAllSelected,
  onToggleAll,
  theme,
  language,
  menuOpen,
  setMenuOpen,
  embedded = false,
}) {

  // --- i18n dictionary ---
  const I18N = {
    en: {
      lines: "Metro Lines",
      purpleLine: "Purple Line",
      yellowLine: "Yellow Line",
      greenLine: "Green Line",
      showAll: "Show All",
      hideAll: "Hide All",
    },
    kn: {
      lines: "ಮಾರ್ಗಗಳು",
      purpleLine: "ನೇರಳೆ ಮಾರ್ಗ",
      yellowLine: "ಹಳದಿ ಮಾರ್ಗ",
      greenLine: "ಹಸಿರು ಮಾರ್ಗ",
      showAll: "ಎಲ್ಲವನ್ನೂ ತೋರಿಸಿ",
      hideAll: "ಎಲ್ಲವನ್ನೂ ಮರೆಮಾಡಿ",
    },
    hi: {
      lines: "लाइनें",
      purpleLine: "बैंगनी लाइन",
      yellowLine: "पीली लाइन",
      greenLine: "हरी लाइन",
      showAll: "सभी दिखाएँ",
      hideAll: "सभी छुपाएँ",
    },
  };
  const T = I18N[language] ?? I18N.en;

  const isDark = theme === "dark";

  const panelStyle = embedded
    ? {
      width: "100%",
      height: "100%",
      background: isDark ? "#1a1a1a" : "#fff",
      color: isDark ? "#fff" : "#111",
      padding: "0 12px",
    }
    : {
      width: 260,
      height: "100vh",
      background: isDark ? "#121212" : "#f4f4f4",
      color: isDark ? "#fff" : "#111",
      padding: "16px",
      position: "fixed",
      top: 0,
      right: 0,
      borderLeft: isDark ? "1px solid #2a2a2a" : "1px solid #ddd",
      zIndex: 2000,
    };

  // Responsive grid: 1 col on mobile, 2 cols on bigger
  const grid = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  };
  if (window.innerWidth >= 600) {
    grid.gridTemplateColumns = "1fr 1fr";
    grid.justifyContent = "flex-start";
  }

  const sectionTitle = {
    fontSize: "14px",
    fontWeight: 600,
    margin: "0 0 8px 0",
    paddingTop: 0,
  };

  const card = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: isDark ? "1px solid #333" : "1px solid #ddd",
    background: isDark ? "#222" : "#fafafa",
    cursor: "pointer",
    transition: "background 0.2s, border 0.2s",
  };

  const chip = (bg) => ({
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: bg,
    flexShrink: 0,
  });

  const labelText = {
    flex: 1,
    fontSize: "14px",
  };

  return (
    <aside style={panelStyle}>
      <div style={sectionTitle}>{T.lines}</div>

      <div style={grid}>
        <label style={card}>
          <input
            type="checkbox"
            checked={filters.purple}
            onChange={() => onToggleLine("purple")}
          />
          <span style={chip("#800080")} />
          <span style={labelText}>{T.purpleLine}</span>
        </label>

        <label style={card}>
          <input
            type="checkbox"
            checked={filters.yellow}
            onChange={() => onToggleLine("yellow")}
          />
          <span style={chip("#EAB308")} />
          <span style={labelText}>{T.yellowLine}</span>
        </label>

        <label style={card}>
          <input
            type="checkbox"
            checked={filters.green}
            onChange={() => onToggleLine("green")}
          />
          <span style={chip("#16A34A")} />
          <span style={labelText}>{T.greenLine}</span>
        </label>

        <label style={card}>
          <input
            type="checkbox"
            checked={areAllSelected}
            onChange={onToggleAll}
          />
          <span style={labelText}>
            {areAllSelected ? T.hideAll : T.showAll}
          </span>
        </label>
      </div>
    </aside>
  );
}
