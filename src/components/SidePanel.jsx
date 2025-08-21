// src/components/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { GREEN_STATIONS } from "../stations/greenStations";
import { PURPLE_STATIONS } from "../stations/purpleStations";
import { YELLOW_STATIONS } from "../stations/yellowStations";

export default function SidePanel({
  filters,
  onToggleLine,
  areAllSelected,
  onToggleAll,
  theme,
  onThemeToggle,
  language,
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
      favourites: "Favourites",
      noFav: "No favourites set",
      addFav: "Add Favourite",
      addFavStop: "Add Favourite Stop",
      line: "Line",
      stop: "Stop",
      cancel: "Cancel",
      save: "Save",
      arriving: "ARRIVING",
    },
    kn: {
      controls: "ನಿಯಂತ್ರಣಗಳು",
      lines: "ಮಾರ್ಗಗಳು",
      purpleLine: "ನೇರಳೆ ಮಾರ್ಗ",
      yellowLine: "ಹಳದಿ ಮಾರ್ಗ",
      greenLine: "ಹಸಿರು ಮಾರ್ಗ",
      showAll: "ಎಲ್ಲವನ್ನೂ ತೋರಿಸಿ",
      hideAll: "ಎಲ್ಲವನ್ನೂ ಮರೆಮಾಡಿ",
      favourites: "ಆಸಕ್ತಿಗಳು",
      noFav: "ಯಾವುದೇ ಆಸಕ್ತಿ ಇಲ್ಲ",
      addFav: "ಆಸಕ್ತಿ ಸೇರಿಸಿ",
      addFavStop: "ಆಸಕ್ತಿ ನಿಲ್ದಾಣ ಸೇರಿಸಿ",
      line: "ಮಾರ್ಗ",
      stop: "ನಿಲ್ದಾಣ",
      cancel: "ರದ್ದುಮಾಡಿ",
      save: "ಉಳಿಸಿ",
      arriving: "ಬರುತ್ತಿದೆ",
    },
    hi: {
      controls: "नियंत्रण",
      lines: "लाइनें",
      purpleLine: "बैंगनी लाइन",
      yellowLine: "पीली लाइन",
      greenLine: "हरी लाइन",
      showAll: "सभी दिखाएँ",
      hideAll: "सभी छुपाएँ",
      favourites: "पसंदीदा",
      noFav: "कोई पसंदीदा नहीं",
      addFav: "पसंदीदा जोड़ें",
      addFavStop: "पसंदीदा स्टॉप जोड़ें",
      line: "लाइन",
      stop: "स्टॉप",
      cancel: "रद्द करें",
      save: "सेव",
      arriving: "ARRIVING",
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
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        window.innerWidth < 1024
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setMenuOpen]);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState("purple");
  const [selectedStop, setSelectedStop] = useState("");

  const lineColors = {
    purple: "#800080",
    yellow: "#EAB308",
    green: "#16A34A",
  };

  const stopsByLine = {
    purple: PURPLE_STATIONS,
    yellow: YELLOW_STATIONS,
    green: GREEN_STATIONS,
  };

  const getStationLabel = (station) => {
    if (language === "kn") return station.name_kn || station.name;
    return station.name;
  };

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = () => {
    if (!selectedStop || favorites.length >= 5) {
      setModalOpen(false);
      return;
    }
    const exists = favorites.some(
      (f) => f.line === selectedLine && f.stop === selectedStop
    );
    if (exists) {
      setModalOpen(false);
      setSelectedStop("");
      return;
    }
    setFavorites([...favorites, { line: selectedLine, stop: selectedStop }]);
    setModalOpen(false);
    setSelectedStop("");
  };

  const removeFavorite = (favToRemove) => {
    setFavorites(
      favorites.filter((f) => !(f.line === favToRemove.line && f.stop === favToRemove.stop))
    );
  };

  // ===== ETA calculation (IST) =====
  const [etas, setEtas] = useState({}); // key -> { toFirst: minutes|null, toLast: minutes|null, idx, firstName, lastName }

  const IST_OFFSET_MIN = 330;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const hhmmssToMs = (t) => {
    const [hh, mm, ss] = t.split(":").map((x) => parseInt(x, 10));
    return ((hh * 60 + mm) * 60 + (ss || 0)) * 1000;
  };

  // ms since IST midnight
  const nowWithinDayIST = () => {
    const n = Date.now() + IST_OFFSET_MIN * 60 * 1000; // shift to IST timeline
    const d = new Date(n);
    return (
      ((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000 +
      d.getUTCMilliseconds()
    );
  };

  const nextEtaMinutes = (times) => {
    if (!times || !times.length) return null;
    const nowMs = nowWithinDayIST();
    const list = times
      .map((t) => (typeof t === "string" ? t : t.time))
      .filter(Boolean)
      .map(hhmmssToMs)
      .sort((a, b) => a - b);

    const idx = list.findIndex((ms) => ms >= nowMs);
    const target = idx >= 0 ? list[idx] : list[0] + DAY_MS;
    const etaMs = target - nowMs;
    const mins = Math.max(0, Math.ceil(etaMs / 60000));
    return mins;
  };

  // Build per-favorite ETAs toward each terminal:
  // convention: upSchedule -> towards last station, downSchedule -> towards first station
  useEffect(() => {
    const compute = () => {
      const result = {};
      for (const fav of favorites) {
        const stations = stopsByLine[fav.line] || [];
        const station = stations.find((s) => s.name === fav.stop);
        const key = `${fav.line}|${fav.stop}`;
        if (!station || stations.length === 0) {
          result[key] = null;
          continue;
        }

        const firstName = stations[0].name;
        const lastName = stations[stations.length - 1].name;
        const idx = stations.findIndex((s) => s.name === fav.stop);

        // towards last: use upSchedule
        const toLast = nextEtaMinutes(station.upSchedule);
        // towards first: use downSchedule
        const toFirst = nextEtaMinutes(station.downSchedule);

        result[key] = { toFirst, toLast, idx, firstName, lastName, line: fav.line, stop: fav.stop };
      }
      setEtas(result);
    };
    compute();
    const id = setInterval(compute, 15000);
    return () => clearInterval(id);
  }, [favorites]);

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

  const etaRow = (labelText, minutes) => {
    const txt =
      minutes == null ? "--" : minutes < 2 ? T.arriving : `${minutes} min`;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          → {labelText}
        </span>
        <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{txt}</span>
      </div>
    );
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
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
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
            <input type="checkbox" checked={areAllSelected} onChange={onToggleAll} />
            <span>{areAllSelected ? T.hideAll : T.showAll}</span>
          </label>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: theme === "dark" ? "#2a2a2a" : "#e2e2e2",
            margin: "6px 0 10px",
          }}
        />

        {/* Favourites */}
        <div style={section}>
          <strong>{T.favourites}</strong>
          {favorites.length === 0 && <p style={{ margin: "8px 0" }}>{T.noFav}</p>}

          {favorites.map((fav) => {
            const key = `${fav.line}|${fav.stop}`;
            const info = etas[key];
            const col = lineColors[fav.line] || "#999";
            const stations = stopsByLine[fav.line] || [];
            const idx = info?.idx ?? stations.findIndex((s) => s.name === fav.stop);
            const firstName = info?.firstName ?? (stations[0]?.name || "Terminal A");
            const lastName = info?.lastName ?? (stations[stations.length - 1]?.name || "Terminal B");

            // Determine which rows to show:
            // - At first station: ONLY show towards last
            // - At last station: ONLY show towards first
            // - Middle: show both
            const showToLast = idx > -1 && idx !== stations.length - 1;
            const showToFirst = idx > 0;

            return (
              <div
                key={key}
                style={{
                  background: theme === "dark" ? "#1e1e1e" : "#fff",
                  padding: "10px",
                  marginTop: "10px",
                  marginBottom: "10px",
                  color: theme === "dark" ? "#fff" : "#111",
                  border: `1px solid ${col}`,
                  boxShadow: `0 0 6px ${col}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{fav.stop}</span>
                  <button
                    onClick={() => removeFavorite(fav)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: theme === "dark" ? "#fff" : "#111",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    aria-label="Remove favourite"
                  >
                    ×
                  </button>
                </div>

                {/* Direction ETAs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                  {showToLast && etaRow(lastName, info?.toLast ?? null)}
                  {showToFirst && etaRow(firstName, info?.toFirst ?? null)}
                </div>
              </div>
            );
          })}

          {favorites.length < 5 && (
            <button
              onClick={() => setModalOpen(true)}
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 6,
                border: theme === "dark" ? "1px dashed #555" : "1px dashed #aaa",
                background: theme === "dark" ? "#1e1e1e" : "#fafafa",
                color: theme === "dark" ? "#fff" : "#111",
                cursor: "pointer",
                width: "100%",
                transition: "background 0.2s",
              }}
            >
              + {T.addFav}
            </button>
          )}
        </div>
      </aside>

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme === "dark" ? "#1e1e1e" : "#fff",
              color: theme === "dark" ? "#fff" : "#111",
              padding: 20,
              borderRadius: 12,
              minWidth: 280,
              position: "relative",
              boxShadow:
                theme === "dark"
                  ? "0 0 12px rgba(255,255,255,0.1)"
                  : "0 0 12px rgba(0,0,0,0.2)",
            }}
          >
            {/* Cross mark */}
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "transparent",
                border: "none",
                color: theme === "dark" ? "#fff" : "#111",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h4 style={{ marginTop: 0 }}>{T.addFavStop}</h4>

            <label style={{ display: "block", marginBottom: 12 }}>
              {T.line}:{" "}
              <select
                value={selectedLine}
                onChange={(e) => {
                  setSelectedLine(e.target.value);
                  setSelectedStop("");
                }}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "8px",
                  borderRadius: 6,
                  border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
                  background: theme === "dark" ? "#2a2a2a" : "#fff",
                  color: theme === "dark" ? "#fff" : "#111",
                }}
              >
                <option value="purple">Purple Line</option>
                <option value="yellow">Yellow Line</option>
                <option value="green">Green Line</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 12 }}>
              {T.stop}:{" "}
              <select
                value={selectedStop}
                onChange={(e) => setSelectedStop(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "8px",
                  borderRadius: 6,
                  border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
                  background: theme === "dark" ? "#2a2a2a" : "#fff",
                  color: theme === "dark" ? "#fff" : "#111",
                }}
              >
                <option value="">-- Select --</option>
                {(stopsByLine[selectedLine] || []).map((stop) => (
                  <option key={stop.name} value={stop.name}>
                    {getStationLabel(stop)}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: theme === "dark" ? "#333" : "#e0e0e0",
                  color: theme === "dark" ? "#fff" : "#111",
                  cursor: "pointer",
                }}
              >
                {T.cancel}
              </button>
              <button
                onClick={addFavorite}
                disabled={!selectedStop}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: !selectedStop
                    ? (theme === "dark" ? "#555" : "#ccc")
                    : (theme === "dark" ? "#4d91ff" : "#1976d2"),
                  color: "#fff",
                  cursor: !selectedStop ? "not-allowed" : "pointer",
                }}
              >
                {T.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
