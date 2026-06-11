"use client";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  // Server always renders the light label; after mount we sync to whatever
  // the inline <head> script set on <html>. This keeps the first client
  // render identical to the server (no hydration mismatch). The page theme
  // itself is already correct from the head script — only this button's
  // icon updates on mount.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="ml-auto flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm transition"
    >
      <span>{dark ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
