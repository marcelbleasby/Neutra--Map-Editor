"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import { networkInventory, SERVICE_RADIUS_METERS } from "./neutral";
import { coverageFromCtos, draftOffer, inventoryCsv, MAX_COVERAGE_POINTS, offerCoveragePoints } from "./offer";

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
 * O que a Empresa tem para ofertar: portas compartilhadas livres num escopo, os
 * pontos que formam a cobertura da oferta e a ocupação em planilha.
 */
export function OfferPanel({
  features,
  projectName,
  onSelect,
  onPreview,
  onClose,
}: {
  features: ElementFeature[];
  projectName: string;
  onSelect: (id: Id) => void;
  /** Mostra (ou apaga, com `null`) a prévia da cobertura no mapa. */
  onPreview: (areas: Polygon[] | null) => void;
  onClose: () => void;
}) {
  const [areaId, setAreaId] = useState<Id>(WHOLE_PROJECT);
  const areas = features.filter((feature) => feature.properties.kind === "coverage_area");
  // A área escolhida pode ter sido excluída enquanto o painel estava aberto.
  const scope = areas.some((area) => area.id === areaId) ? areaId : WHOLE_PROJECT;
  const draft = draftOffer(features, scope || undefined);
  const positions = draft.ctos.map((cto) => cto.position);
  const { points, tooMany } = offerCoveragePoints(positions);
  const slug = projectName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Portas para ofertar</h2>
        <p className="text-xs leading-relaxed text-ink-muted">
          Portas compartilhadas livres: é o que pode entrar numa oferta de CTO no marketplace.
        </p>
      </div>

      <label>
        <span className="mb-1 block text-sm font-medium text-ink-soft">Onde</span>
        <select
          className="min-h-9 w-full rounded-md border border-line bg-plate px-2.5 text-sm text-ink pointer-coarse:min-h-11"
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
        <dt className="text-ink-soft">Portas livres para ofertar</dt>
        <dd className="text-right font-tag text-3xl leading-none font-bold tabular-nums text-ink">{draft.portCount}</dd>
        <dt className="text-ink-soft">CTOs</dt>
        <dd className="text-right font-medium tabular-nums text-ink">{draft.ctos.length}</dd>
        <dt className="text-ink-soft">Já em uso por outras Empresas</dt>
        <dd className="text-right font-medium tabular-nums text-ink">{draft.portsInUse}</dd>
      </dl>

      {draft.ctos.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhuma porta compartilhada livre aqui. Marque portas como compartilhadas nas CTOs.
        </p>
      ) : (
        <>
          <ul className="max-h-48 overflow-y-auto border-t border-line-soft text-sm">
            {draft.ctos.map((cto) => (
              <li key={cto.id} className="flex items-center justify-between border-b border-line-soft py-1">
                <button type="button" onClick={() => onSelect(cto.id)} className="min-h-8 cursor-pointer text-left font-tag text-base font-semibold text-signal hover:underline pointer-coarse:min-h-11">
                  {cto.name}
                </button>
                <span className="tabular-nums text-ink">
                  {cto.sharedFree} de {cto.total}
                </span>
              </li>
            ))}
          </ul>
          <section className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <h3 className="text-sm font-semibold text-ink">Cobertura da oferta</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              Um círculo de {SERVICE_RADIUS_METERS} m em volta de cada uma dessas CTOs. Na oferta, a geo une os círculos,
              recorta nos polígonos do KMZ e passa a responder a viabilidade por essa área.
            </p>
            {tooMany ? (
              <p role="alert" className="text-xs text-danger">
                São {points.length} CTOs; a geo aceita até {MAX_COVERAGE_POINTS} pontos por oferta. Escolha uma área menor.
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    download(
                      `${slug}-cobertura-da-oferta.json`,
                      JSON.stringify({ coverageNetworkPoints: points }, null, 2),
                      "application/json",
                    )
                  }
                  className="flex-1 inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-ink-soft pointer-coarse:min-h-11"
                >
                  Baixar pontos ({points.length})
                </button>
                <button
                  type="button"
                  onClick={() => onPreview(coverageFromCtos(positions))}
                  className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-plate px-3 text-sm font-medium text-ink hover:bg-concrete pointer-coarse:min-h-11"
                >
                  Ver no mapa
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <div className="flex gap-2 border-t border-line-soft pt-3">
        <button
          type="button"
          onClick={() =>
            download(
              `${slug}-ocupacao.csv`,
              inventoryCsv(networkInventory(features)),
              "text/csv;charset=utf-8",
            )
          }
          className="flex-1 inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-plate px-3 text-sm font-medium text-ink hover:bg-concrete pointer-coarse:min-h-11"
        >
          Baixar ocupação (CSV)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-plate px-3 text-sm font-medium text-ink hover:bg-concrete pointer-coarse:min-h-11"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
