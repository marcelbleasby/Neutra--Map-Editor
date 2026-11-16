import type { Feature, Position } from "geojson";
import type { Id } from "@/domain/types";
import type { CtoPort, ElementFeature } from "@/features/editor/model";

/**
 * Rede neutra: o que a Empresa tem de portas, quanto disso é compartilhado, e
 * onde há viabilidade. Vocabulário em GLOSSARY.md.
 */

/** Raio da Viabilidade, em linha reta do endereço até a CTO. */
export const FEASIBILITY_RADIUS_METERS = 250;

export interface PortCounts {
  total: number;
  /** Portas próprias livres: o que a Empresa pode usar para os seus assinantes. */
  ownFree: number;
  /** Portas próprias reservadas ou em uso. */
  ownBusy: number;
  /** Portas compartilhadas livres: o que a Empresa tem para ofertar. */
  sharedFree: number;
  /** Portas compartilhadas reservadas ou em uso por outra Empresa. */
  sharedBusy: number;
  defective: number;
}

export interface CtoInventory extends PortCounts {
  id: Id;
  name: string;
  position: Position;
}

const EMPTY_COUNTS: PortCounts = { total: 0, ownFree: 0, ownBusy: 0, sharedFree: 0, sharedBusy: 0, defective: 0 };

export function countPorts(ports: CtoPort[]): PortCounts {
  const counts = { ...EMPTY_COUNTS, total: ports.length };
  for (const port of ports) {
    if (port.status === "defective") counts.defective += 1;
    else if (port.status === "free") counts[port.shared ? "sharedFree" : "ownFree"] += 1;
    else counts[port.shared ? "sharedBusy" : "ownBusy"] += 1;
  }
  return counts;
}

export interface NetworkInventory {
  ctos: CtoInventory[];
  totals: PortCounts;
  /** CTOs que têm ao menos uma porta compartilhada livre. */
  ctosWithOffer: number;
}

/** Inventário de portas de todas as CTOs do projeto. */
export function networkInventory(features: ElementFeature[]): NetworkInventory {
  const ctos: CtoInventory[] = [];
  const totals = { ...EMPTY_COUNTS };
  for (const feature of features) {
    if (feature.properties.kind !== "cto" || feature.geometry.type !== "Point") continue;
    const counts = countPorts(feature.properties.ports ?? []);
    ctos.push({ id: feature.id, name: feature.properties.name, position: feature.geometry.coordinates, ...counts });
    for (const key of Object.keys(totals) as (keyof PortCounts)[]) totals[key] += counts[key];
  }
  return { ctos, totals, ctosWithOffer: ctos.filter((cto) => cto.sharedFree > 0).length };
}

/** Marca como compartilhadas todas as portas livres ainda não compartilhadas. */
export function shareFreePorts(ports: CtoPort[]): CtoPort[] {
  return ports.map((port) => (port.status === "free" && !port.shared ? { ...port, shared: true } : port));
}

/** Tira o compartilhamento das portas livres; as que estão em uso por outra Empresa ficam. */
export function unshareFreePorts(ports: CtoPort[]): CtoPort[] {
  return ports.map((port) => {
    if (port.status !== "free" || !port.shared) return port;
    const own = { ...port };
    delete own.shared;
    return own;
  });
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distância em linha reta (haversine) entre duas posições [lng, lat]. */
export function distanceMeters(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function insideRing(point: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface FeasibilityCandidate extends CtoInventory {
  distanceMeters: number;
}

export interface Feasibility {
  point: Position;
  /** Cobertura: o ponto está dentro de alguma área de cobertura. */
  covered: boolean;
  /** CTOs no raio, da mais próxima para a mais distante. */
  candidates: FeasibilityCandidate[];
  /** Viabilidade para a própria Empresa: há porta própria livre no raio. */
  viable: boolean;
  /** Há porta compartilhada livre no raio: o que outra Empresa poderia usar ali. */
  sharedViable: boolean;
}

/**
 * Viabilidade num ponto: CTOs com porta livre a até 250 m, em linha reta.
 * Cobertura é outra pergunta e vem junto para as duas não serem confundidas.
 */
export function checkFeasibility(
  point: Position,
  features: ElementFeature[],
  radiusMeters = FEASIBILITY_RADIUS_METERS,
): Feasibility {
  const candidates = networkInventory(features)
    .ctos.map((cto) => ({ ...cto, distanceMeters: distanceMeters(point, cto.position) }))
    .filter((cto) => cto.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  const covered = features.some(
    (feature) => feature.geometry.type === "Polygon" && insideRing(point, feature.geometry.coordinates[0]),
  );
  return {
    point,
    covered,
    candidates,
    viable: candidates.some((cto) => cto.ownFree > 0),
    sharedViable: candidates.some((cto) => cto.sharedFree > 0),
  };
}

/** Círculo em metros como polígono, para desenhar o raio no mapa. */
export function circleRing(center: Position, radiusMeters: number, steps = 64): Position[] {
  const latRadius = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const lngRadius = latRadius / Math.cos(toRadians(center[1]));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (2 * Math.PI * i) / steps;
    return [center[0] + lngRadius * Math.cos(angle), center[1] + latRadius * Math.sin(angle)];
  });
}

/** O que a consulta de viabilidade desenha no mapa: ponto, raio e linha até cada CTO. */
export function feasibilityOverlay(result: Feasibility, radiusMeters = FEASIBILITY_RADIUS_METERS): Feature[] {
  return [
    {
      type: "Feature",
      properties: { role: "radius" },
      geometry: { type: "Polygon", coordinates: [circleRing(result.point, radiusMeters)] },
    },
    ...result.candidates.map((cto): Feature => ({
      type: "Feature",
      properties: { role: "link", free: cto.ownFree + cto.sharedFree },
      geometry: { type: "LineString", coordinates: [result.point, cto.position] },
    })),
    { type: "Feature", properties: { role: "point" }, geometry: { type: "Point", coordinates: result.point } },
  ];
}

/** Anel em volta de cada CTO que tem porta compartilhada. */
export function sharedRings(features: ElementFeature[]): Feature[] {
  return networkInventory(features)
    .ctos.filter((cto) => cto.sharedFree + cto.sharedBusy > 0)
    .map((cto) => ({
      type: "Feature",
      properties: { role: "shared", sharedFree: cto.sharedFree },
      geometry: { type: "Point", coordinates: cto.position },
    }));
}
