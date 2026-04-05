type IconProps = {
  className?: string;
};

const baseClassName = "h-4 w-4";

export function AppMarkIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M7.5 16.5 10.5 11.5 13 14 16.5 9.5" />
      <circle cx="9" cy="8.5" r="1.2" />
    </svg>
  );
}

export function ImageFileIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3.5H7.8a2.3 2.3 0 0 0-2.3 2.3v12.4a2.3 2.3 0 0 0 2.3 2.3h8.4a2.3 2.3 0 0 0 2.3-2.3V8.8z" />
      <path d="M14 3.5v5.3h5.3" />
      <path d="m8.5 16.5 2.4-2.7 2.2 2 2.4-3" />
      <circle cx="9.4" cy="10.1" r="1.1" />
    </svg>
  );
}

export function LogoMarkIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
      <path d="M8 15.5 11.8 8.5 16 15.5" />
      <path d="M10.2 13h3.3" />
    </svg>
  );
}

export function ExportIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4.5v10" />
      <path d="m8.8 11.2 3.2 3.3 3.2-3.3" />
      <path d="M5 16.8v1.4a2.3 2.3 0 0 0 2.3 2.3h9.4a2.3 2.3 0 0 0 2.3-2.3v-1.4" />
    </svg>
  );
}

export function UndoIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8.2 10.2-3.3 3.3 3.3 3.3" />
      <path d="M5.2 13.5h8.3a5 5 0 1 1 0 10h-1.5" />
    </svg>
  );
}

export function RedoIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15.8 10.2 3.3 3.3-3.3 3.3" />
      <path d="M18.8 13.5h-8.3a5 5 0 1 0 0 10H12" />
    </svg>
  );
}

export function PresetIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.8h12" />
      <path d="M6 12h12" />
      <path d="M6 19.2h12" />
      <circle cx="9" cy="4.8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="19.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KeyboardIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.2" />
      <path d="M6.5 10.2h1M9.5 10.2h1M12.5 10.2h1M15.5 10.2h1M6.5 13.2h6.6M14.2 13.2h3.3" />
    </svg>
  );
}

export function SettingsIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2.6" />
      <path d="M19.2 12.8a7.6 7.6 0 0 0 .1-1.6l2-1.6-1.7-2.9-2.4.8a7.8 7.8 0 0 0-1.4-.8l-.3-2.5h-3.4l-.4 2.5a7.8 7.8 0 0 0-1.4.8l-2.4-.8-1.7 2.9 2 1.6a7.6 7.6 0 0 0 .1 1.6l-2 1.6 1.7 2.9 2.4-.8c.4.3.9.6 1.4.8l.4 2.5h3.4l.3-2.5c.5-.2 1-.5 1.4-.8l2.4.8 1.7-2.9z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 10 4.5 4.5 4.5-4.5" />
    </svg>
  );
}

export function TextToolIcon({ className = baseClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 6.5h13" />
      <path d="M12 6.5v11" />
      <path d="M8 17.5h8" />
    </svg>
  );
}
