// src/App.js
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useMemo, useRef, useState, useEffect } from "react";
import Topbar from "./components/Topbar";
import SidePanel from "./components/SidePanel";
import PurpleLine from "./components/PurpleLine";
import GreenLine from "./components/GreenLine";
import YellowLine from "./components/YellowLine";

const apiKey = process.env.REACT_APP_MAPS_API_KEY;

// Subtle light theme
const subtleLightStyle = [
  { featureType: "all", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station.rail", elementType: "all", stylers: [{ visibility: "on" }] },
  { featureType: "road.arterial", elementType: "all", stylers: [{ visibility: "on" }] },
  // { featureType: "landscape", elementType: "all", stylers: [{ visibility: "on" }] },
  { featureType: "landscape.natural", elementType: "all", stylers: [{ visibility: "on" }, { color: "rgb(17, 221, 102)" }] },
  { featureType: "administrative.locality", elementType: "all", stylers: [{ visibility: "on" }] },
  { featureType: "water", elementType: "all", stylers: [{ visibility: "on" }, { color: "#1997d1ff" }] },
];

// Subtle dark theme
const subtleDarkStyle = [
  { featureType: "all", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station.rail", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "transit.station.rail", elementType: "labels.text.fill", stylers: [{ visibility: "on" }, { color: "#ffffff" }, { weight: 8 }] },
  { featureType: "transit.station.rail", elementType: "labels.text.stroke", stylers: [{ color: "#000000" }, { weight: 4 }] },
  { featureType: "road.arterial", elementType: "all", stylers: [{ visibility: "on" }, { color: "#444444" }] },
  { featureType: "landscape", elementType: "all", stylers: [{ visibility: "on" }, { color: "#1b1b1b" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ visibility: "on" }, { color: "#bbbbbb" }] },
];


export default function App() {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [filters, setFilters] = useState({ purple: false, yellow: true, green: false });
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLine = (line) => setFilters((prev) => ({ ...prev, [line]: !prev[line] }));

  const areAllSelected = filters.purple && filters.yellow && filters.green;
  const toggleShowAll = () =>
    setFilters((prev) =>
      areAllSelected ? { purple: false, yellow: false, green: false } : { purple: true, yellow: true, green: true }
    );

  useEffect(() => {
    function handleClickOutside(e) {
      if (window.innerWidth < 1024) {
        const navbarEl = document.querySelector("aside");
        if (menuOpen && navbarEl && !navbarEl.contains(e.target)) setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const mapCenter = useMemo(() => ({ lat: 12.97, lng: 77.59 }), []);

  // 🔹 Map options (only light/dark styles now)
  const mapOptions = useMemo(() => {
    const baseStyle = theme === "dark" ? subtleDarkStyle : subtleLightStyle;
    return {
      styles: baseStyle,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    };
  }, [theme]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div style={{ flex: "1 1 auto", position: "relative" }}>
        <Topbar theme={theme} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={isDesktop ? 12 : 11}   // zoomed out more for phones
            options={mapOptions}
            onLoad={(m) => {
              mapRef.current = m;
              setMapReady(true);
            }}
          >
            {mapReady && filters.purple && (
              <PurpleLine map={mapRef.current} theme={theme} language={language} />
            )}
            {mapReady && filters.green && (
              <GreenLine map={mapRef.current} theme={theme} language={language} />
            )}
            {mapReady && filters.yellow && (
              <YellowLine map={mapRef.current} theme={theme} language={language} />
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      <SidePanel
        filters={filters}
        onToggleLine={toggleLine}
        areAllSelected={areAllSelected}
        onToggleAll={toggleShowAll}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        language={language}
        onLanguageChange={setLanguage}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
    </div>
  );
}
