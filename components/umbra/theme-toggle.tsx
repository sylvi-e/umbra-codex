"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeName = "umbra" | "gilded";
const storageKey = "umbra-codex-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>("umbra");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initialTheme: ThemeName = saved === "gilded" ? "gilded" : "umbra";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeName = theme === "gilded" ? "umbra" : "gilded";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
    setTheme(nextTheme);
  }

  const gilded = theme === "gilded";
  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggleTheme}
      className="theme-toggle fixed bottom-20 right-4 z-[70] gap-2 rounded-full px-3 shadow-2xl backdrop-blur-xl lg:bottom-5 lg:right-5"
      aria-label={gilded ? "Usar tema violeta" : "Usar tema dourado"}
      title={gilded ? "Usar tema violeta" : "Usar tema dourado"}
    >
      {gilded ? <MoonStar size={17} /> : <Sparkles size={17} />}
      <span className="hidden sm:inline">{gilded ? "Tema violeta" : "Tema dourado"}</span>
    </Button>
  );
}
