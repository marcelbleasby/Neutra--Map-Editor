"use client";

import { ELEMENTS, PALETTE_GROUPS, type GeometryType } from "@/domain/catalog";
import type { ElementKind } from "@/domain/types";

const HINT: Record<GeometryType, string> = {
  Point: "Toque no mapa para posicionar.",
  LineString: "Toque em cada vértice e duas vezes no último. As pontas grudam em POP, CEO, CTO e assinante.",
  Polygon: "Toque em cada vértice e duas vezes no último para fechar a área.",
};

/** Amostra do elemento como ele aparece no mapa: ponto, traço ou área. */
function Swatch({ kind }: { kind: ElementKind }) {
  const { geometry, color } = ELEMENTS[kind];
  if (geometry === "LineString") {
    const width = kind === "cable_backbone" ? 5 : kind === "cable_distribution" ? 4 : 3;
    return <span aria-hidden className="w-5 shrink-0 rounded-full" style={{ background: color, height: width }} />;
  }
  if (geometry === "Polygon") {
    return (
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-sm border-2 border-dashed"
        style={{ borderColor: color, background: `${color}22` }}
      />
    );
  }
  return (
    <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)]" style={{ background: color }} />
  );
}

export function paletteHint(tool: ElementKind | null): string | null {
  return tool ? HINT[ELEMENTS[tool].geometry] : null;
}

/**
 * Ferramentas de desenho. No computador, coluna à esquerda com grupos; no celular,
 * faixa rolável acima do mapa.
 */
export function Palette({
  tool,
  onSelect,
}: {
  tool: ElementKind | null;
  onSelect: (kind: ElementKind | null) => void;
}) {
  return (
    <nav aria-label="Desenhar" className="flex gap-1 max-md:overflow-x-auto max-md:px-2 max-md:py-1.5 md:flex-col md:gap-4 md:p-3">
      <h2 className="text-sm font-semibold text-ink max-md:sr-only">Desenhar</h2>
      {PALETTE_GROUPS.map((group) => (
        <section key={group.title} className="contents md:block">
          <h3 className="mb-1 text-xs font-medium text-ink-muted max-md:sr-only">{group.title}</h3>
          <ul className="contents md:flex md:flex-col md:gap-0.5">
            {group.kinds.map((kind) => {
              const active = tool === kind;
              return (
                <li key={kind} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    title={ELEMENTS[kind].description}
                    onClick={() => onSelect(active ? null : kind)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md border px-2.5 text-left text-sm whitespace-nowrap transition-colors min-h-9 pointer-coarse:min-h-11 ${
                      active
                        ? "border-ink bg-tag font-semibold text-ink"
                        : "border-transparent text-ink-soft hover:bg-concrete hover:text-ink max-md:border-line max-md:bg-plate"
                    }`}
                  >
                    <Swatch kind={kind} />
                    {ELEMENTS[kind].label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-sm leading-snug text-ink-muted max-md:hidden" aria-live="polite">
        {paletteHint(tool) ?? "Escolha o que desenhar, ou toque num elemento do mapa para ver os dados dele."}
      </p>
    </nav>
  );
}
