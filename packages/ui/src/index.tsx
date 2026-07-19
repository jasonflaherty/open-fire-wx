import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
  tone?: 'fire' | 'weather' | 'hotspot';
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
};

export function ControlStrip({ children }: ControlStripProps) {
  return <div className="ofwx-control-strip">{children}</div>;
}

export function StatusText({ children }: { children: ReactNode }) {
  return <p className="ofwx-status">{children}</p>;
}

export type LocateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  locating?: boolean;
};

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
