import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  className = "",
  contentClassName = "",
  children,
}: SectionCardProps) {
  return (
    <section className={`tool-subtle rounded-xl border px-3 py-3 ${className}`}>
      <header className="space-y-1">
        <p className="text-app-text text-[0.82rem] font-semibold">{title}</p>
        {description ? <p className="text-muted text-[0.72rem] leading-5">{description}</p> : null}
      </header>
      <div className={`mt-3 space-y-3 ${contentClassName}`}>{children}</div>
    </section>
  );
}
