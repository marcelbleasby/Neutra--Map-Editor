import turfUnion from "@turf/union";
import type { Feature, Polygon, Position } from "geojson";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import {
  circleRing,
  FEASIBILITY_RADIUS_METERS,
  insideRing,
  networkInventory,
  type CtoInventory,
  type NetworkInventory,
} from "./neutral";

/**
 * Da rede para a oferta: quantas portas compartilhadas livres há num conjunto de
 * CTOs e qual a área que elas atendem. São os dois dados que uma oferta de CTO
 * no marketplace pede (quantidade de portas e cobertura).
 */

export interface OfferDraft {
  /** CTOs do escopo com ao menos uma porta compartilhada livre. */
  ctos: CtoInventory[];
  /** Portas compartilhadas livres: a quantidade que pode ser ofertada. */
  portCount: number;
  /** Portas compartilhadas já em uso por outras Empresas, no mesmo escopo. */
  portsInUse: number;
}

/**
 * O que há para ofertar no projeto inteiro ou dentro de uma área de cobertura.
 * `areaId` restringe às CTOs dentro daquele polígono.
 */
export function draftOffer(features: ElementFeature[], areaId?: Id): OfferDraft {
  const area = areaId ? features.find((feature) => feature.id === areaId) : undefined;
  const ring = area?.geometry.type === "Polygon" ? area.geometry.coordinates[0] : undefined;
  const inScope = networkInventory(features).ctos.filter((cto) => !ring || insideRing(cto.position, ring));
  const ctos = inScope.filter((cto) => cto.sharedFree > 0);
  return {
    ctos,
    portCount: ctos.reduce((sum, cto) => sum + cto.sharedFree, 0),
    portsInUse: inScope.reduce((sum, cto) => sum + cto.sharedBusy, 0),
  };
}

/**
 * Área atendida por um conjunto de CTOs: a união dos círculos de 250 m em volta
 * de cada uma. CTOs afastadas dão áreas separadas — um polígono por grupo, porque
 * a plataforma só aceita polígono simples como área de cobertura.
 */
export function coverageFromCtos(
  positions: Position[],
  radiusMeters = FEASIBILITY_RADIUS_METERS,
): Polygon[] {
  const circles = positions.map(
    (position): Feature<Polygon> => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [circleRing(position, radiusMeters, 32)] },
    }),
  );
  if (circles.length === 0) return [];
  if (circles.length === 1) return [circles[0].geometry];
  const merged = turfUnion({ type: "FeatureCollection", features: circles });
  if (!merged) return [];
  return merged.geometry.type === "Polygon"
    ? [merged.geometry]
    : merged.geometry.coordinates.map((coordinates): Polygon => ({ type: "Polygon", coordinates }));
}

const CSV_HEADER = [
  "CTO",
  "Latitude",
  "Longitude",
  "Portas",
  "Próprias livres",
  "Próprias ocupadas",
  "Compartilhadas livres",
  "Compartilhadas em uso",
  "Com defeito",
];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Ocupação por CTO em CSV. Separador ponto e vírgula e marca de UTF-8 no início,
 * que é o que o Excel em português abre sem ajuste.
 */
export function inventoryCsv(inventory: NetworkInventory): string {
  const rows = inventory.ctos.map((cto) => [
    cto.name,
    cto.position[1].toFixed(6),
    cto.position[0].toFixed(6),
    cto.total,
    cto.ownFree,
    cto.ownBusy,
    cto.sharedFree,
    cto.sharedBusy,
    cto.defective,
  ]);
  return "﻿" + [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
