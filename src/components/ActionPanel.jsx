import { useState, useRef, useEffect } from "react";
import Favorites from "./Favorites";
import SidePanel from "./SidePanel";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ActionPanel({
  theme,
  language,
  filters,
  onToggleLine,
  areAllSelected,
  onToggleAll,
  onThemeToggle,
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("favorites"); // "favorites" | "controls"
  const [underlineStyle, setUnderlineStyle] = useState({});
  const tabRefs = useRef({});

  const isDark = theme === "dark";

  useEffect(() => {
    if (tabRefs.current[tab]) {
      const el = tabRefs.current[tab];
      setUnderlineStyle({
        width: el.offsetWidth,
        left: el.offsetLeft,
      });
    }
  }, [tab]);

  const panelStyle = {
    position: "fixed",
    bottom: open ? 0 : "-150px",
    left: 0,
    width: "100%",
    height: "200px",
    background: isDark ? "#1a1a1a" : "#fff",
    color: isDark ? "#fff" : "#111",
    borderTop: isDark ? "1px solid #333" : "1px solid #e5e5e5",
    transition: "bottom 0.35s ease-in-out",
    zIndex: 2500,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 14px", // removed extra vertical padding
    background: isDark ? "#1f1f1f" : "#fafafa",
    borderBottom: isDark ? "1px solid #333" : "1px solid #eee",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    position: "relative",
    height: "42px", // consistent height for underline alignment
  };

  const tabContainer = {
    display: "flex",
    position: "relative",
    height: "100%",
  };

  const tabBtn = (name, label, isLast = false) => (
    <button
      ref={(el) => (tabRefs.current[name] = el)}
      onClick={() => setTab(name)}
      style={{
        flex: 1,
        minWidth: "150px",
        maxWidth: "300px",
        background: tab === name
          ? (isDark ? "#2a2a2a" : "#f2f2f2") // grey bg on active tab
          : "none",
        border: "none",
        padding: "0 16px",
        fontSize: "15px",
        fontWeight: 600,
        color: tab === name ? (isDark ? "#fff" : "#111") : isDark ? "#aaa" : "#666",
        cursor: "pointer",
        borderRight: isLast ? "none" : (isDark ? "1px solid #333" : "1px solid #ddd"),
        height: "100%", // ensures underline sits flush
      }}
    >
      {label}
    </button>
  );

  const toggleBtn = {
    cursor: "pointer",
    border: isDark ? "1px solid #444" : "1px solid #ddd",
    borderRadius: "50%",
    padding: "5px",
    background: isDark ? "#2a2a2a" : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  };

  return (
    <div style={panelStyle}>
      {/* Header with Tabs + Toggle */}
      <div style={headerStyle}>
        <div style={tabContainer}>
          {tabBtn("favorites", "Favorites", false)}
          {tabBtn("controls", "Controls", true)}

          {/* underline bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              height: "2px",
              background: "#1976d2",
              borderRadius: "2px",
              transition: "all 0.3s ease",
              ...underlineStyle,
            }}
          />
        </div>

        <div style={toggleBtn} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "12px" }}>
        {tab === "favorites" ? (
          <Favorites theme={theme} language={language} />
        ) : (
          <SidePanel
            filters={filters}
            onToggleLine={onToggleLine}
            areAllSelected={areAllSelected}
            onToggleAll={onToggleAll}
            theme={theme}
            onThemeToggle={onThemeToggle}
            language={language}
            menuOpen={true}
            setMenuOpen={() => {}}
            embedded={true}
          />
        )}
      </div>
    </div>
  );
}
