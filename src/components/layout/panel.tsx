import type { ReactNode } from "react";

type PanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ eyebrow, title, description, children, className = "" }: PanelProps) {
  return (
    <section className={`panel-surface flex flex-col gap-6 p-6 ${className}`}>
      <header className="space-y-2">
        <p className="panel-label">{eyebrow}</p>
        <div className="space-y-1">
          <h2 className="text-app-text text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted max-w-xl text-sm leading-6">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
