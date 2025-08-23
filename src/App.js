// src/App.js
import { useState, useEffect, useMemo } from "react";
import Map, { useMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import Navbar from "./components/Navbar";
import PurpleLine from "./components/PurpleLine";
import GreenLine from "./components/GreenLine";
import YellowLine from "./components/YellowLine";
import ActionPanel from "./components/ActionPanel";

function MetroLines({ theme, filters, language }) {
  const { current } = useMap();
  const map = current?.getMap();

  if (!map) return null; // wait until map is ready

  return (
    <>
      {filters.purple && <PurpleLine map={map} theme={theme} language={language} />}
      {filters.green && <GreenLine map={map} theme={theme} language={language} />}
      {filters.yellow && <YellowLine map={map} theme={theme} language={language} />}
    </>
  );
}

export default function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [filters, setFilters] = useState({ purple: false, yellow: true, green: false });

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const [menuOption, setMenuOpen] = useState(false);

  useEffect(() => localStorage.setItem("theme", theme), [theme]);
  useEffect(() => localStorage.setItem("language", language), [language]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleLine = (line) => setFilters((prev) => ({ ...prev, [line]: !prev[line] }));
  const areAllSelected = filters.purple && filters.yellow && filters.green;
  const toggleShowAll = () =>
    setFilters(
      areAllSelected
        ? { purple: false, yellow: false, green: false }
        : { purple: true, yellow: true, green: true }
    );

  const mapCenter = useMemo(() => [ 77.60691661228209, 12.864834359992448], []);
  const MAPTILER_KEY = "xlPHYNs3swcefiFlTNpo";
  const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div style={{ flex: "1 1 auto", position: "relative" }}>
        <Navbar
          theme={theme}
          onThemeToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          language={language}
          setLanguage={setLanguage}
          onAbout={() => alert("About Us - Namma Metro Live")}
        />

        <Map
          initialViewState={{
            longitude: mapCenter[0],
            latitude: mapCenter[1],
            zoom: isDesktop ? 11 : 11,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={styleUrl}
          onLoad={(e) => {
            const map = e.target;
            map.getStyle().layers.forEach((layer) => {
              if (
                layer.id.includes("motorway") ||
                layer.id.includes("trunk")
              ) {
                map.setLayoutProperty(layer.id, "visibility", "none");
              }
            });
          }}
        >
          <MetroLines theme={theme} filters={filters} language={language} />
        </Map>

        <ActionPanel
          theme={theme}
          language={language}
          filters={filters}
          onToggleLine={toggleLine}
          areAllSelected={areAllSelected}
          onToggleAll={toggleShowAll}
          onThemeToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        />
      </div>
    </div>
  );
}
