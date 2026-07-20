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
  tone?: 'fire' | 'weather' | 'hotspot' | 'smoke' | 'aqi' | 'roads';
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
  label?: string;
  ariaLabel?: string;
  /** Stretch to full width inside the More menu. */
  wide?: boolean;
};

export function StateSelect({
  value,
  options,
  onChange,
  id,
  label = 'State',
  ariaLabel = 'Map state',
  wide = false,
}: StateSelectProps) {
  return (
    <label className="ofwx-state" data-wide={wide || undefined}>
      <span className="ofwx-state__label">{label}</span>
      <select
        id={id}
        className="ofwx-state__select"
        value={value}
        aria-label={ariaLabel}
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
  /** Extra controls shown before the close button (e.g. favorite, refresh). */
  actions?: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  actions,
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
        aria-label="Close"
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
          <div className="ofwx-sheet__actions">
            {actions}
            <button
              type="button"
              className="ofwx-sheet__action ofwx-sheet__close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>
        <div className="ofwx-sheet__body">{children}</div>
        {footer ? <footer className="ofwx-sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export type MenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  badgeCount?: number;
  label?: string;
};

/** Single chrome entry for secondary controls (region, language, favorites). */
export function MenuButton({
  active = false,
  badgeCount = 0,
  label = 'Menu',
  ...rest
}: MenuButtonProps) {
  return (
    <button
      type="button"
      className="ofwx-menu-btn"
      data-active={active}
      aria-pressed={active}
      aria-label={label}
      title={label}
      {...rest}
    >
      <svg
        className="ofwx-menu-btn__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <circle cx="5" cy="12" r="1.75" fill="currentColor" />
        <circle cx="12" cy="12" r="1.75" fill="currentColor" />
        <circle cx="19" cy="12" r="1.75" fill="currentColor" />
      </svg>
      {badgeCount > 0 ? (
        <span className="ofwx-menu-btn__count">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </button>
  );
}

export type LocaleToggleProps = {
  value: string;
  options: Array<{ code: string; label: string }>;
  onChange: (code: string) => void;
  ariaLabel?: string;
};

export function LocaleToggle({
  value,
  options,
  onChange,
  ariaLabel = 'Language',
}: LocaleToggleProps) {
  return (
    <div className="ofwx-locale" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className="ofwx-locale__btn"
          data-active={value === option.code}
          aria-pressed={value === option.code}
          onClick={() => onChange(option.code)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
