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
    <section
      className={`border-outline/70 bg-panel/72 rounded-[1.25rem] border px-4 py-4 ${className}`}
    >
      <header className="space-y-1">
        <p className="text-app-text text-sm font-semibold">{title}</p>
        {description ? <p className="text-muted text-xs leading-5">{description}</p> : null}
      </header>
      <div className={`mt-4 space-y-4 ${contentClassName}`}>{children}</div>
    </section>
  );
}
