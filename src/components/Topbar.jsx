// src/components/Topbar.jsx
import "../style/Topbar.css";

export default function Topbar({ theme, setMenuOpen }) {
  return (
    <header className={`topbar ${theme === "dark" ? "dark" : ""}`}>
      {/* Left side: Project title */}
      <h1 className="topbar-title">Namma Metro Live</h1>

      {/* Right side: Hamburger (only on small screens) */}
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        ☰
      </button>
    </header>
  );
}
