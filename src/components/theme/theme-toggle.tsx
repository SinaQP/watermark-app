import { useTheme } from "@/app/providers/theme-provider";

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      onClick={toggleTheme}
      className={`border-outline/80 bg-panel text-app-text hover:border-accent/50 hover:bg-surface inline-flex items-center gap-2 rounded-xl border text-sm font-medium shadow-[0_10px_30px_-20px_rgba(15,23,42,0.6)] transition ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      }`}
    >
      <span
        className={`bg-app-bg relative flex items-center rounded-full p-1 ${
          compact ? "h-7 w-12" : "h-8 w-14"
        }`}
      >
        <span
          className={`bg-accent absolute rounded-full shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] transition-transform duration-200 ${
            compact ? "h-5 w-5" : "h-6 w-6"
          } ${theme === "dark" ? "translate-x-0" : compact ? "translate-x-5" : "translate-x-6"}`}
        />
        <SunIcon className={`text-app-bg z-10 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
        <MoonIcon className={`text-app-bg z-10 ml-auto ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
      </span>
      {compact ? null : (
        <span className="hidden sm:block">{theme === "dark" ? "Dark" : "Light"} mode</span>
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
