import type { ReactNode } from "react";

type IconActionProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  tone?: "accent" | "default";
  className?: string;
};

export function IconAction({
  label,
  icon,
  onClick,
  active = false,
  disabled = false,
  compact = false,
  tone = "default",
  className = "",
}: IconActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150 ${className} ${
        active
          ? "border-accent/55 bg-accent/16 text-app-text shadow-[0_8px_20px_-16px_rgba(15,23,42,0.9)]"
          : tone === "accent"
            ? "border-accent/40 bg-accent/10 text-app-text hover:border-accent hover:bg-accent/18"
            : disabled
              ? "border-outline/70 bg-panel/65 text-muted"
              : "border-outline/80 bg-app-bg/85 text-app-text hover:border-accent/45 hover:bg-surface"
      }`}
      onClick={onClick}
    >
      <span className="text-muted">{icon}</span>
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}
