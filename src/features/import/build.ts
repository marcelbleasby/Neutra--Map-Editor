import turfLength from "@turf/length";
import type { Position } from "geojson";
import { ELEMENTS, isCableKind } from "@/domain/catalog";
import type { ElementKind, LngLat } from "@/domain/types";
import { defaultProperties, makeCtoPorts, nextName, type ElementFeature } from "@/features/editor/model";
import { snapCable, type Projector } from "@/features/editor/topology";
import type { Classification } from "./classify";
import type { Placemark } from "./kml";

/** Distância máxima para ligar a ponta de um cabo importado a um nó. */
export const IMPORT_SNAP_METERS = 5;

/**
 * Acima disso o editor fica lento: todos os elementos vivem no Mapbox GL Draw
 * (ver "Limite conhecido" em docs/04-arquitetura.md).
 */
export const MAX_IMPORT_ELEMENTS = 5000;

const METERS_PER_DEGREE = 111_320;

/** Projeção plana em metros, boa para distâncias curtas ao redor de `origin`. */
function metricProjector(origin: Position): Projector {
  const scale = Math.cos((origin[1] * Math.PI) / 180);
  return ([lng, lat]) => ({ x: lng * METERS_PER_DEGREE * scale, y: lat * METERS_PER_DEGREE });
}

/** Índice em grade: evita comparar cada cabo com todos os nós. */
function gridIndex(nodes: ElementFeature[], project: Projector, cellSize: number) {
  const cells = new Map<string, ElementFeature[]>();
  const cellOf = (position: Position) => {
    const { x, y } = project(position);
    return [Math.floor(x / cellSize), Math.floor(y / cellSize)];
  };
  for (const node of nodes) {
    const key = cellOf(node.geometry.coordinates as Position).join(",");
    cells.set(key, [...(cells.get(key) ?? []), node]);
  }
  return (position: Position): ElementFeature[] => {
    const [cx, cy] = cellOf(position);
    const near: ElementFeature[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) near.push(...(cells.get(`${cx + dx},${cy + dy}`) ?? []));
    }
    return near;
  };
}

export interface BuildResult {
  features: ElementFeature[];
  /** Cabos com as duas pontas ligadas a nós. */
  connectedCables: number;
  cables: number;
}

/**
 * Converte os Placemarks escolhidos em elementos do editor e monta a topologia:
 * as pontas dos cabos são ligadas aos nós que estiverem a até 5 m, importados
 * ou já existentes no projeto.
 *
 * `kindOf(i)` é a decisão do usuário para o Placemark `i`; `null` = ignorar.
 */
export function buildFeatures(
  placemarks: Placemark[],
  classifications: Classification[],
  kindOf: (index: number) => ElementKind | null,
  existing: ElementFeature[] = [],
  newId: () => string = () => crypto.randomUUID(),
): BuildResult {
  const all = [...existing];
  const created: ElementFeature[] = [];

  placemarks.forEach((placemark, index) => {
    const kind = kindOf(index);
    if (!kind || ELEMENTS[kind].geometry !== placemark.geometry.type) return;
    const { fiberCount, portCount } = classifications[index];
    const properties = defaultProperties(kind, []);
    // Só gera nome sequencial (que percorre todos os elementos) para quem veio sem nome.
    properties.name = placemark.name.trim() || nextName(kind, all);
    // Rede importada já existe em campo.
    properties.status = "active";
    if (placemark.description.trim()) properties.notes = placemark.description.trim().slice(0, 500);
    if (isCableKind(kind) && fiberCount) properties.fiberCount = fiberCount;
    if (kind === "cto" && portCount) properties.ports = makeCtoPorts(portCount <= 8 ? 8 : 16);

    const feature: ElementFeature = { type: "Feature", id: newId(), geometry: placemark.geometry, properties };
    all.push(feature);
    created.push(feature);
  });

  const cables = created.filter((feature) => feature.geometry.type === "LineString");
  const nodes = all.filter((feature) => feature.geometry.type === "Point");
  if (cables.length === 0 || nodes.length === 0) {
    for (const cable of cables) cable.properties.lengthMeters = lengthOf(cable);
    return { features: created, connectedCables: 0, cables: cables.length };
  }

  const project = metricProjector(nodes[0].geometry.coordinates as Position);
  const nodesNear = gridIndex(nodes, project, IMPORT_SNAP_METERS);
  let connectedCables = 0;
  for (const cable of cables) {
    if (cable.geometry.type !== "LineString") continue;
    const candidates = [...new Set(cable.geometry.coordinates.flatMap(nodesNear))];
    const snapped = snapCable(cable.geometry, candidates, project, IMPORT_SNAP_METERS);
    cable.geometry = { type: "LineString", coordinates: snapped.coordinates };
    Object.assign(cable.properties, {
      fromNodeId: snapped.fromNodeId,
      toNodeId: snapped.toNodeId,
      viaNodeIds: snapped.viaNodeIds,
      lengthMeters: lengthOf(cable),
    });
    if (snapped.fromNodeId && snapped.toNodeId) connectedCables += 1;
  }
  return { features: created, connectedCables, cables: cables.length };
}

function lengthOf(cable: ElementFeature): number {
  return Math.round(turfLength(cable, { units: "kilometers" }) * 1000);
}

/** Centro da caixa envolvente, para posicionar o mapa de um projeto novo. */
export function centerOf(placemarks: Placemark[]): LngLat | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const visit = ([lng, lat]: Position) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  };
  for (const { geometry } of placemarks) {
    if (geometry.type === "Point") visit(geometry.coordinates);
    else if (geometry.type === "LineString") geometry.coordinates.forEach(visit);
    else geometry.coordinates[0].forEach(visit);
  }
  return Number.isFinite(minLng) ? [(minLng + maxLng) / 2, (minLat + maxLat) / 2] : null;
}
