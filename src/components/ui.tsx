import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Peças básicas da interface (docs/16-design.md). Alvo de 32 px com mouse e
 * 44 px em tela de toque.
 */

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors " +
  "min-h-8 px-3 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";

const VARIANTS = {
  /** Ação principal da tela. */
  primary: "bg-ink text-white hover:bg-ink-soft",
  /** Ação comum. */
  secondary: "border border-line bg-plate text-ink hover:bg-concrete",
  /** Ação discreta, dentro de texto ou lista. */
  quiet: "text-ink-soft hover:bg-concrete",
  /** Remove ou desfaz. */
  danger: "border border-danger/30 bg-plate text-danger hover:bg-danger-soft",
} as const;

export function Button({
  variant = "secondary",
  pressed,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; pressed?: boolean }) {
  // Ligado: o amarelo de etiqueta, o mesmo da ferramenta ativa.
  const look = pressed ? "border border-ink bg-tag text-ink hover:bg-tag" : VARIANTS[variant];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`${BASE} ${look} ${className}`}
      {...props}
    />
  );
}

/** Título de seção de painel: frase, peso, sem caixa alta. */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {aside && <span className="text-sm tabular-nums text-ink-muted">{aside}</span>}
    </div>
  );
}

/** Lista de pares "rótulo — valor" com números alinhados à direita. */
export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {items.map(([label, value], index) => (
        <div key={index} className="contents">
          <dt className="text-ink-soft">{label}</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Etiqueta de identificação: o código do elemento como o técnico vê preso na
 * caixa. É o único elemento chamativo da interface.
 */
export function IdTag({ kind, name, color }: { kind: string; name: string; color: string }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border-2 border-ink bg-tag text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
      <span aria-hidden className="w-2 shrink-0" style={{ background: color }} />
      <div className="min-w-0 px-2.5 py-1.5">
        <p className="text-xs font-semibold">{kind}</p>
        <p className="truncate font-tag text-2xl leading-tight font-bold">{name || "Sem nome"}</p>
      </div>
    </div>
  );
}

export const FIELD =
  "w-full rounded-md border border-line bg-plate px-2.5 py-1.5 text-sm text-ink min-h-9 pointer-coarse:min-h-11";
export const LABEL = "mb-1 block text-sm font-medium text-ink-soft";
