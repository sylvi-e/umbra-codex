"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MoonStar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeName = "umbra" | "gilded";
const storageKey = "umbra-codex-theme";
const themeChangeEvent = "umbra-theme-change";

function getStoredTheme(): ThemeName {
  return window.localStorage.getItem(storageKey) === "gilded"
    ? "gilded"
    : "umbra";
}

function subscribeToTheme(onStoreChange: () => void) {
  const notify = () => onStoreChange();
  window.addEventListener("storage", notify);
  window.addEventListener(themeChangeEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(themeChangeEvent, notify);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "umbra",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme: ThemeName = theme === "gilded" ? "umbra" : "gilded";
    window.localStorage.setItem(storageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeChangeEvent));
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
      <span className="hidden sm:inline">
        {gilded ? "Tema violeta" : "Tema dourado"}
      </span>
    </Button>
  );
}
