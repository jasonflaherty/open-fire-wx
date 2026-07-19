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
