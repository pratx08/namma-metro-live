// src/components/Navbar.jsx
import { useState, useRef, useEffect } from "react";

export default function Navbar({
  filters,
  onToggleLine,
  areAllSelected,
  onToggleAll,
  theme,
  onThemeToggle,
  language,
  onLanguageChange,
  terrain,
  onToggleTerrain,
  menuOpen,
  setMenuOpen,
}) {
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef(null);

  // --- i18n dictionary (expand as needed) ---
  const I18N = {
    en: {
      controls: "Controls",
      lines: "Lines",
      purpleLine: "Purple Line",
      yellowLine: "Yellow Line",
      greenLine: "Green Line",
      showAll: "Show All",
      hideAll: "Hide All",
    },
    kn: {
      controls: "ನಿಯಂತ್ರಣಗಳು",
      lines: "ಮಾರ್ಗಗಳು",
      purpleLine: "ನೇರಳೆ ಮಾರ್ಗ",
      yellowLine: "ಹಳದಿ ಮಾರ್ಗ",
      greenLine: "ಹಸಿರು ಮಾರ್ಗ",
      showAll: "ಎಲ್ಲವನ್ನೂ ತೋರಿಸಿ",
      hideAll: "ಎಲ್ಲವನ್ನೂ ಮರೆಮಾಡಿ",
    },
    hi: {
      controls: "नियंत्रण",
      lines: "लाइनें",
      purpleLine: "बैंगनी लाइन",
      yellowLine: "पीली लाइन",
      greenLine: "हरी लाइन",
      showAll: "सभी दिखाएँ",
      hideAll: "सभी छुपाएँ",
    },
  };
  const T = I18N[language] ?? I18N.en;

  // Close language menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Auto-close sidebar when screen resized to desktop
  useEffect(() => {
  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target) && window.innerWidth < 1024) {
      setMenuOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [setMenuOpen]);

  const panelStyle = {
    width: 260,
    height: "100vh",
    background: theme === "dark" ? "#121212" : "#f4f4f4",
    color: theme === "dark" ? "#fff" : "#111",
    padding: 16,
    borderLeft: theme === "dark" ? "1px solid #2a2a2a" : "1px solid #e6e6e6",
    position: "fixed",
    top: 0,
    right: 0,
    overflow: "auto",
    transform:
      menuOpen || window.innerWidth >= 1024
        ? "translateX(0)"
        : "translateX(100%)",
    transition: "transform 0.3s ease-in-out",
    zIndex: 2000,
  };

  const section = { marginBottom: 16 };
  const label = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "8px 0",
  };

  const chip = (bg) => ({
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: 999,
    background: bg,
    border: "1px solid rgba(0,0,0,0.2)",
  });

  const iconBtn = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: theme === "dark" ? "1px solid #2a2a2a" : "1px solid #ddd",
    background: theme === "dark" ? "#1a1a1a" : "#fff",
    color: theme === "dark" ? "#fff" : "#111",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };

  return (
    <>
      <aside style={panelStyle}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0 }}>{T.controls}</h3>

          <div style={{ display: "flex", gap: 8 }} ref={menuRef}>
            {/* Theme toggle */}
            <button
              aria-label="Toggle theme"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              onClick={onThemeToggle}
              style={iconBtn}
            >
              {theme === "dark" ? (
                // Sun
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                // Moon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              )}
            </button>

            {/* Language menu */}
            <div style={{ position: "relative" }}>
              <button
                aria-haspopup="menu"
                aria-expanded={langOpen}
                title="Language"
                onClick={() => setLangOpen((o) => !o)}
                style={iconBtn}
              >
                {/* Globe icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {langOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: 38,
                    right: 0,
                    minWidth: 150,
                    background: theme === "dark" ? "#1e1e1e" : "#fff",
                    color: theme === "dark" ? "#fff" : "#111",
                    border:
                      theme === "dark"
                        ? "1px solid #2a2a2a"
                        : "1px solid #e6e6e6",
                    borderRadius: 10,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                  }}
                >
                  {[
                    { code: "en", label: "English" },
                    { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
                    { code: "hi", label: "हिन्दी (Hindi)" },
                  ].map((opt, idx) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        onLanguageChange(opt.code);
                        setLangOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background:
                          language === opt.code
                            ? theme === "dark"
                              ? "#262626"
                              : "#f5f5f5"
                            : "transparent",
                        color: "inherit",
                        border: "none",
                        cursor: "pointer",
                        borderTop:
                          idx === 0
                            ? "none"
                            : "1px solid " +
                              (theme === "dark" ? "#222" : "#eee"),
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: theme === "dark" ? "#2a2a2a" : "#e2e2e2",
            margin: "6px 0 10px",
          }}
        />

        {/* Lines */}
        <div style={section}>
          <strong>{T.lines}</strong>

          <label style={label}>
            <input
              type="checkbox"
              checked={filters.purple}
              onChange={() => onToggleLine("purple")}
            />
            <span style={chip("#800080")} />
            <span>{T.purpleLine}</span>
          </label>

          <label style={label}>
            <input
              type="checkbox"
              checked={filters.yellow}
              onChange={() => onToggleLine("yellow")}
            />
            <span style={chip("#EAB308")} />
            <span>{T.yellowLine}</span>
          </label>

          <label style={label}>
            <input
              type="checkbox"
              checked={filters.green}
              onChange={() => onToggleLine("green")}
            />
            <span style={chip("#16A34A")} />
            <span>{T.greenLine}</span>
          </label>

          <label style={{ ...label, marginTop: 10 }}>
            <input
              type="checkbox"
              checked={areAllSelected}
              onChange={onToggleAll}
            />
            <span>{areAllSelected ? T.hideAll : T.showAll}</span>
          </label>
        </div>

        {/* Map Options */}
        <div style={section}>
          <strong>Map Options</strong>
          <label style={label}>
            <input
              type="checkbox"
              checked={terrain}
              onChange={onToggleTerrain}
            />
            <span>Terrain</span>
          </label>
        </div>
      </aside>
    </>
  );
}
