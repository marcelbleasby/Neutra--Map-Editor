"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import { FEASIBILITY_RADIUS_METERS, networkInventory } from "./neutral";
import { coverageFromCtos, draftOffer, inventoryCsv } from "./offer";

const WHOLE_PROJECT = "";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * O que a Empresa tem para ofertar: portas compartilhadas livres num escopo, a
 * área que elas atendem e a ocupação em planilha.
 */
export function OfferPanel({
  features,
  projectName,
  onSelect,
  onCreateAreas,
  onClose,
}: {
  features: ElementFeature[];
  projectName: string;
  onSelect: (id: Id) => void;
  onCreateAreas: (areas: Polygon[]) => void;
  onClose: () => void;
}) {
  const [areaId, setAreaId] = useState<Id>(WHOLE_PROJECT);
  const areas = features.filter((feature) => feature.properties.kind === "coverage_area");
  // A área escolhida pode ter sido excluída enquanto o painel estava aberto.
  const scope = areas.some((area) => area.id === areaId) ? areaId : WHOLE_PROJECT;
  const draft = draftOffer(features, scope || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Portas para ofertar</h2>
        <p className="text-xs leading-relaxed text-slate-500">
          Portas compartilhadas livres: é o que pode entrar numa oferta de CTO no marketplace.
        </p>
      </div>

      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">Onde</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          value={scope}
          onChange={(event) => setAreaId(event.target.value)}
        >
          <option value={WHOLE_PROJECT}>Projeto inteiro</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              Dentro de {area.properties.name}
            </option>
          ))}
        </select>
      </label>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-600">Portas livres para ofertar</dt>
        <dd className="text-right text-base font-semibold tabular-nums text-slate-900">{draft.portCount}</dd>
        <dt className="text-slate-600">CTOs</dt>
        <dd className="text-right font-medium tabular-nums text-slate-900">{draft.ctos.length}</dd>
        <dt className="text-slate-600">Já em uso por outras Empresas</dt>
        <dd className="text-right font-medium tabular-nums text-slate-900">{draft.portsInUse}</dd>
      </dl>

      {draft.ctos.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma porta compartilhada livre aqui. Marque portas como compartilhadas nas CTOs.
        </p>
      ) : (
        <>
          <ul className="max-h-48 overflow-y-auto border-t border-slate-200 text-sm">
            {draft.ctos.map((cto) => (
              <li key={cto.id} className="flex items-center justify-between border-b border-slate-100 py-1">
                <button type="button" onClick={() => onSelect(cto.id)} className="text-left text-blue-700 hover:underline">
                  {cto.name}
                </button>
                <span className="tabular-nums text-slate-900">
                  {cto.sharedFree} de {cto.total}
                </span>
              </li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              onClick={() => onCreateAreas(coverageFromCtos(draft.ctos.map((cto) => cto.position)))}
              className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Gerar área de cobertura
            </button>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Desenha a área a até {FEASIBILITY_RADIUS_METERS} m dessas CTOs. CTOs afastadas dão áreas separadas.
            </p>
          </div>
        </>
      )}

      <div className="flex gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() =>
            download(
              `${projectName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-ocupacao.csv`,
              inventoryCsv(networkInventory(features)),
              "text/csv;charset=utf-8",
            )
          }
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Baixar ocupação (CSV)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
