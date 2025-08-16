// src/App.js
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useMemo, useRef, useState, useEffect } from "react";
import Topbar from "./components/Topbar";
import Navbar from "./components/Navbar";
import PurpleLine from "./components/PurpleLine";
import GreenLine from "./components/GreenLine";
import YellowLine from "./components/YellowLine";

const apiKey = process.env.REACT_APP_MAPS_API_KEY;

// Subtle light theme (terrain OFF)
const subtleLightStyle = [
  { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dfe6e9" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
];

// Subtle dark theme (terrain OFF)
const subtleDarkStyle = [
  { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#141414" }] },
];

// Terrain ON (light)
const terrainLightStyle = [
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#555" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ visibility: "on" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#666" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cddfff" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#fafafa" }] },
];

// Terrain ON (dark)
// Google Maps official dark mode style
const terrainDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },

  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },

  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },

  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },

  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0b0b0" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },

  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
];


export default function App() {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);

      // ✅ Auto-close Navbar when leaving desktop
      if (!desktop) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [filters, setFilters] = useState({
    purple: false,
    yellow: false,
    green: false,
  });

  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [terrain, setTerrain] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLine = (line) =>
    setFilters((prev) => ({ ...prev, [line]: !prev[line] }));

  const areAllSelected = filters.purple && filters.yellow && filters.green;
  const toggleShowAll = () =>
    setFilters((prev) =>
      areAllSelected
        ? { purple: false, yellow: false, green: false }
        : { purple: true, yellow: true, green: true }
    );

  useEffect(() => {
    function handleClickOutside(e) {
      if (window.innerWidth < 1024) {
        const navbarEl = document.querySelector("aside");
        if (menuOpen && navbarEl && !navbarEl.contains(e.target)) {
          setMenuOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);
  
  const mapCenter = useMemo(() => ({ lat: 12.97, lng: 77.59 }), []);

  const mapOptions = useMemo(
    () => ({
      styles: !terrain
        ? theme === "dark"
          ? subtleDarkStyle
          : subtleLightStyle
        : theme === "dark"
          ? terrainDarkStyle
          : terrainLightStyle,
      disableDefaultUI: true,
      gestureHandling: "greedy",
    }),
    [theme, terrain]
  );

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div style={{ flex: "1 1 auto", position: "relative" }}>
      <Topbar theme={theme} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={12.5}
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

      <Navbar
        filters={filters}
        onToggleLine={toggleLine}
        areAllSelected={areAllSelected}
        onToggleAll={toggleShowAll}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        language={language}
        onLanguageChange={setLanguage}
        terrain={terrain}
        onToggleTerrain={() => setTerrain((t) => !t)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
    </div>
  );
}
