import { useState, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/ui/app-icons";

type CollapsibleControlSectionProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function CollapsibleControlSection({
  title,
  description,
  icon,
  defaultOpen = true,
  className = "",
  children,
}: CollapsibleControlSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`tool-subtle rounded-xl border ${className}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <span className="flex items-center gap-2">
          {icon ? <span className="text-muted">{icon}</span> : null}
          <span className="text-app-text text-sm font-semibold">{title}</span>
        </span>
        <ChevronDownIcon
          className={`text-muted h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {description ? (
        <div className="px-3 pb-2">
          <p className="text-muted text-[0.74rem] leading-5">{description}</p>
        </div>
      ) : null}
      <div
        className={`grid transition-all duration-200 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-55"
        }`}
      >
        <div className="overflow-hidden border-t border-white/8">
          <div className="space-y-3 px-3 py-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function FormField({
  label,
  helper,
  compact = false,
  children,
}: {
  label: string;
  helper?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="space-y-1">
        <p className="text-app-text text-[0.8rem] font-semibold">{label}</p>
        {helper ? <p className="text-muted text-[0.72rem] leading-5">{helper}</p> : null}
      </div>
      {children}
    </div>
  );
}

type SliderWithNumberFieldProps = {
  id: string;
  label: string;
  helper?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  displayValue?: string;
  onValueChange: (value: number) => void;
};

export function SliderWithNumberField({
  id,
  label,
  helper,
  min,
  max,
  step = 1,
  value,
  displayValue,
  onValueChange,
}: SliderWithNumberFieldProps) {
  const boundedValue = Number.isFinite(value) ? value : min;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label htmlFor={id} className="text-app-text text-[0.8rem] font-semibold">
          {label}
        </label>
        {helper ? <p className="text-muted text-[0.72rem] leading-5">{helper}</p> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4.8rem] items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedValue}
          className="accent-accent h-1.5 w-full"
          onChange={(event) => {
            onValueChange(Number(event.currentTarget.value));
          }}
        />
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={boundedValue}
          aria-label="Numeric value"
          className="tool-input text-right font-semibold"
          onChange={(event) => {
            const nextValue = Number(event.currentTarget.value);
            if (Number.isFinite(nextValue)) {
              onValueChange(nextValue);
            }
          }}
        />
      </div>
      <p className="text-muted text-[0.72rem] font-semibold">
        {displayValue ?? String(boundedValue)}
      </p>
    </div>
  );
}
