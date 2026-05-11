"use client";

import { useTranslation } from "@/lib/i18n/context";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useTranslation();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "zh" : "en")}
      className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white ${className}`}
      aria-label={language === "en" ? "切换到中文" : "Switch to English"}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span className="text-xs uppercase tracking-wider">{language}</span>
    </button>
  );
}
