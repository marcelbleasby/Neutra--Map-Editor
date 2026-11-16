import turfUnion from "@turf/union";
import type { Feature, Polygon, Position } from "geojson";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import {
  circleRing,
  insideRing,
  SERVICE_RADIUS_METERS,
  networkInventory,
  type CtoInventory,
  type NetworkInventory,
} from "./neutral";

/**
 * Da rede para a oferta: quantas portas compartilhadas livres há num conjunto de
 * CTOs e em volta de quais pontos fica a cobertura da oferta. São os dois dados
 * que uma oferta de CTO no marketplace pede (quantidade de portas e cobertura).
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

/** Ponto da rede no formato que a cobertura da oferta aceita (`coverageNetworkPoints`). */
export interface CoverageNetworkPoint {
  longitude: number;
  latitude: number;
  radiusMeters: number;
}

/** Limite de pontos por oferta na geo. */
export const MAX_COVERAGE_POINTS = 500;

/**
 * Pontos para a cobertura da oferta: um círculo do raio de atendimento em volta
 * de cada CTO. A geo une os círculos, recorta nos polígonos da versão de KMZ e
 * passa a responder viabilidade por essa área. Coordenadas repetidas são
 * descartadas, porque a geo as recusa.
 */
export function offerCoveragePoints(
  positions: Position[],
  radiusMeters = SERVICE_RADIUS_METERS,
): { points: CoverageNetworkPoint[]; tooMany: boolean } {
  const seen = new Set<string>();
  const points: CoverageNetworkPoint[] = [];
  for (const [longitude, latitude] of positions) {
    const key = `${longitude},${latitude}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ longitude, latitude, radiusMeters });
  }
  return { points, tooMany: points.length > MAX_COVERAGE_POINTS };
}

/**
 * Prévia da área que esses pontos formam: a união dos círculos. É só para ver no
 * mapa; a área que vale é a que a geo calcula, recortada no KMZ.
 */
export function coverageFromCtos(
  positions: Position[],
  radiusMeters = SERVICE_RADIUS_METERS,
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
