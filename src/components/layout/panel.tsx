import type { ReactNode } from "react";

type PanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ eyebrow, title, description, children, className = "" }: PanelProps) {
  return (
    <section className={`panel-surface flex min-h-0 flex-col overflow-hidden ${className}`}>
      <header className="border-outline/60 space-y-1.5 border-b px-4 py-3">
        <p className="panel-label">{eyebrow}</p>
        <div className="space-y-1">
          <h2 className="text-app-text text-base font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-muted text-xs leading-5">{description}</p> : null}
        </div>
      </header>
      <div className="min-h-0 overflow-y-auto p-3">{children}</div>
    </section>
  );
}
