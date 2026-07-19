import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type BrandProps = {
  name?: string;
  tagline?: string;
};

export function Brand({
  name = 'Open Fire WX',
  tagline = 'Where are the fires?',
}: BrandProps) {
  return (
    <div className="ofwx-brand">
      <p className="ofwx-brand__name">{name}</p>
      <p className="ofwx-brand__tag">{tagline}</p>
    </div>
  );
}

export type LayerToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active: boolean;
  tone?: 'fire' | 'weather';
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
