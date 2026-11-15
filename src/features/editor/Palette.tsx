"use client";

import { ELEMENTS, PALETTE_GROUPS, type GeometryType } from "@/domain/catalog";
import type { ElementKind } from "@/domain/types";

const HINT: Record<GeometryType, string> = {
  Point: "Clique no mapa para posicionar.",
  LineString: "Clique para cada vértice; duplo clique termina. Pontas grudam em POP, CEO, CTO e assinante.",
  Polygon: "Clique para cada vértice; duplo clique fecha a área.",
};

function Swatch({ kind }: { kind: ElementKind }) {
  const { geometry, color } = ELEMENTS[kind];
  if (geometry === "LineString") {
    return <span className="h-1 w-4 shrink-0 rounded-full" style={{ background: color }} />;
  }
  if (geometry === "Polygon") {
    return (
      <span
        className="size-3.5 shrink-0 rounded-sm border-2 border-dashed"
        style={{ borderColor: color, background: `${color}22` }}
      />
    );
  }
  return <span className="size-3.5 shrink-0 rounded-full" style={{ background: color }} />;
}

export function Palette({
  tool,
  onSelect,
}: {
  tool: ElementKind | null;
  onSelect: (kind: ElementKind | null) => void;
}) {
  return (
    <nav aria-label="Ferramentas de desenho" className="flex flex-col gap-4">
      {PALETTE_GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h2>
          <ul className="flex flex-col gap-1">
            {group.kinds.map((kind) => {
              const active = tool === kind;
              return (
                <li key={kind}>
                  <button
                    type="button"
                    aria-pressed={active}
                    title={ELEMENTS[kind].description}
                    onClick={() => onSelect(active ? null : kind)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
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
      <p className="text-xs leading-relaxed text-slate-500" aria-live="polite">
        {tool ? HINT[ELEMENTS[tool].geometry] : "Escolha um elemento para desenhar ou clique em um item do mapa para editar."}
      </p>
    </nav>
  );
}
