"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";

type LanguageToggleProps = {
  currentLocale: Locale;
};

export default function LanguageToggle({ currentLocale }: LanguageToggleProps) {
  const router = useRouter();

  const setLocale = async (nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale })
    });
    router.refresh();
  };

  const baseStyle: CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 0,
    font: "inherit",
    cursor: "pointer"
  };

  const activeStyle: CSSProperties = {
    fontWeight: 700,
    color: "#5d3b00"
  };

  const inactiveStyle: CSSProperties = {
    opacity: 0.6
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={currentLocale === "en"}
        style={{
          ...baseStyle,
          ...(currentLocale === "en" ? activeStyle : inactiveStyle)
        }}
      >
        EN
      </button>
      <span style={{ opacity: 0.5 }}>|</span>
      <button
        type="button"
        onClick={() => setLocale("zh")}
        aria-pressed={currentLocale === "zh"}
        style={{
          ...baseStyle,
          ...(currentLocale === "zh" ? activeStyle : inactiveStyle)
        }}
      >
        中文
      </button>
    </div>
  );
}
