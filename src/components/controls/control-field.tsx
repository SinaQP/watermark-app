import { useState, type ReactNode } from "react";

type CollapsibleControlSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function CollapsibleControlSection({
  title,
  description,
  defaultOpen = true,
  className = "",
  children,
}: CollapsibleControlSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`border-outline/70 bg-panel/72 rounded-[1.2rem] border ${className}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <span className="text-app-text text-sm font-semibold">{title}</span>
        <span
          aria-hidden="true"
          className={`text-muted mt-1 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {description ? (
        <div className="border-outline/60 border-t px-4 py-2">
          <p className="text-muted text-xs leading-5">{description}</p>
        </div>
      ) : null}
      {isOpen ? <div className="border-outline/60 border-t px-4 py-4">{children}</div> : null}
    </section>
  );
}

export function FormField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-app-text text-sm font-semibold">{label}</p>
        {helper ? <p className="text-muted text-xs leading-5">{helper}</p> : null}
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
        <label htmlFor={id} className="text-app-text text-sm font-semibold">
          {label}
        </label>
        {helper ? <p className="text-muted text-xs leading-5">{helper}</p> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedValue}
          className="accent-accent w-full"
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
          className="border-outline/80 bg-app-bg text-app-text focus:border-accent rounded-xl border px-2 py-2 text-sm font-semibold transition outline-none"
          onChange={(event) => {
            const nextValue = Number(event.currentTarget.value);
            if (Number.isFinite(nextValue)) {
              onValueChange(nextValue);
            }
          }}
        />
      </div>
      <p className="text-muted text-xs font-semibold">{displayValue ?? String(boundedValue)}</p>
    </div>
  );
}
