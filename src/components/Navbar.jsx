// src/components/Topbar.jsx
import { useState, useEffect, useRef } from "react";
import "../style/Navbar.css";
import { Sun, Moon, Languages, BookOpenText } from "lucide-react";

export default function Topbar({ theme, onThemeToggle, language, setLanguage, onAbout }) {
  const isDark = theme === "dark";
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Updated languages with native names
  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "hi", label: "हिन्दी" },
  ];

  const handleLangChange = (code) => {
    setLanguage(code);
    localStorage.setItem("language", code);
    setShowLangMenu(false);
  };

  return (
    <header className={`topbar ${isDark ? "dark" : ""}`}>
      <h1 className="topbar-title">Namma Metro Live</h1>

      <div className="topbar-actions" ref={menuRef}>
        {/* Theme Toggle */}
        <button className="icon-btn" onClick={onThemeToggle}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Language Toggle */}
        <div style={{ position: "relative" }}>
          <button className="icon-btn" onClick={() => setShowLangMenu((s) => !s)}>
            <Languages size={20} />
          </button>
          {showLangMenu && (
            <div className={`lang-menu ${isDark ? "dark" : ""}`}>
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className={`lang-option ${language === lang.code ? "active" : ""}`}
                  onClick={() => handleLangChange(lang.code)}
                >
                  {lang.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* About */}
        <button className="icon-btn" onClick={onAbout}>
          <BookOpenText size={20} />
        </button>
      </div>
    </header>
  );
}
