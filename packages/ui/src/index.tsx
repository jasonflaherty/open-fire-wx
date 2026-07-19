import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export type BrandProps = {
  name?: string;
  tagline?: string;
};

export function Brand({ name = 'Fire WX', tagline }: BrandProps) {
  return (
    <div className="ofwx-brand">
      <p className="ofwx-brand__name">{name}</p>
      {tagline ? <p className="ofwx-brand__tag">{tagline}</p> : null}
    </div>
  );
}

export type LayerToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active: boolean;
  tone?: 'fire' | 'weather' | 'hotspot' | 'smoke' | 'aqi';
};

export function LayerToggle({
  label,
  active,
  tone = 'fire',
  ...rest
}: LayerToggleProps) {
  return (
    <button
      type="button"
      className="ofwx-layer-toggle"
      data-active={active}
      data-tone={tone}
      aria-pressed={active}
      {...rest}
    >
      <span className="ofwx-layer-toggle__dot" aria-hidden="true" />
      {label}
    </button>
  );
}

export type ControlStripProps = {
  children: ReactNode;
  className?: string;
};

export function ControlStrip({ children, className }: ControlStripProps) {
  return (
    <div className={['ofwx-control-strip', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function StatusText({ children }: { children: ReactNode }) {
  return <p className="ofwx-status">{children}</p>;
}

export type LocateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  locating?: boolean;
};

export type StateSelectProps = {
  value: string;
  options: Array<{ code: string; name: string }>;
  onChange: (code: string) => void;
  id?: string;
};

export function StateSelect({ value, options, onChange, id }: StateSelectProps) {
  return (
    <label className="ofwx-state">
      <span className="ofwx-state__label">State</span>
      <select
        id={id}
        className="ofwx-state__select"
        value={value}
        aria-label="Map state"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LocateButton({ locating = false, ...rest }: LocateButtonProps) {
  return (
    <button
      type="button"
      className="ofwx-locate"
      data-locating={locating}
      aria-label={locating ? 'Finding your location' : 'Zoom to my location'}
      title="My location"
      {...rest}
    >
      <svg
        className="ofwx-locate__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path
          d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="ofwx-sheet" data-open={open} aria-hidden={!open}>
      <button
        type="button"
        className="ofwx-sheet__backdrop"
        aria-label="Close fire details"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        className="ofwx-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ofwx-sheet__handle" aria-hidden="true" />
        <header className="ofwx-sheet__header">
          <h2 id={titleId} className="ofwx-sheet__title">
            {title}
          </h2>
          <button
            type="button"
            className="ofwx-sheet__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="ofwx-sheet__body">{children}</div>
        {footer ? <footer className="ofwx-sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
