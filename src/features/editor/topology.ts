import type { LineString, Position } from "geojson";
import { ELEMENTS } from "@/domain/catalog";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "./model";

/** Converte lng/lat em pixels de tela. Injetado para manter este módulo puro. */
export type Projector = (position: Position) => { x: number; y: number };

export const SNAP_TOLERANCE_PX = 14;

type NodeRole = "cableEndpoint" | "passThrough";

function samePosition(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Nó mais próximo de `position` com o papel pedido, dentro da tolerância. */
function nearestNode(
  position: Position,
  features: ElementFeature[],
  project: Projector,
  role: NodeRole,
  tolerancePx: number,
): ElementFeature | undefined {
  const target = project(position);
  let best: ElementFeature | undefined;
  let bestDistance = tolerancePx;
  for (const feature of features) {
    if (feature.geometry.type !== "Point" || !ELEMENTS[feature.properties.kind][role]) continue;
    const point = project(feature.geometry.coordinates as Position);
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    if (distance <= bestDistance) {
      best = feature;
      bestDistance = distance;
    }
  }
  return best;
}

export interface SnappedCable {
  coordinates: Position[];
  fromNodeId?: Id;
  toNodeId?: Id;
  /** Nós de passagem tocados pelos vértices intermediários, na ordem do traçado. */
  viaNodeIds: Id[];
}

/**
 * Gruda um cabo nos nós próximos e devolve a quais nós ele ficou ligado. É isso
 * que transforma um desenho em topologia: sem `fromNodeId` / `toNodeId` o cabo é
 * só uma linha.
 *
 * - As pontas grudam em nós onde cabo termina (POP, CEO, CTO, cliente).
 * - Os vértices intermediários grudam em nós de passagem (poste, caixa, reserva).
 */
export function snapCable(
  line: LineString,
  features: ElementFeature[],
  project: Projector,
  tolerancePx = SNAP_TOLERANCE_PX,
): SnappedCable {
  const coordinates = line.coordinates.map((c) => [...c]);
  const last = coordinates.length - 1;
  const positionOf = (node: ElementFeature) => [...(node.geometry.coordinates as Position)];

  const from = nearestNode(coordinates[0], features, project, "cableEndpoint", tolerancePx);
  const to = nearestNode(coordinates[last], features, project, "cableEndpoint", tolerancePx);
  if (from) coordinates[0] = positionOf(from);
  // Um cabo não liga um nó a ele mesmo.
  const toNode = to && to.id !== from?.id ? to : undefined;
  if (toNode) coordinates[last] = positionOf(toNode);

  const viaNodeIds: Id[] = [];
  for (let i = 1; i < last; i++) {
    const via = nearestNode(coordinates[i], features, project, "passThrough", tolerancePx);
    if (!via) continue;
    coordinates[i] = positionOf(via);
    if (!viaNodeIds.includes(via.id)) viaNodeIds.push(via.id);
  }

  return { coordinates, fromNodeId: from?.id, toNodeId: toNode?.id, viaNodeIds };
}

/**
 * Cabos ligados a um nó que foi movido, com os vértices reposicionados.
 * `previousPosition` é onde o nó estava: é assim que se encontra o vértice de
 * passagem que deve acompanhá-lo.
 */
export function followNode(
  node: ElementFeature,
  previousPosition: Position | undefined,
  features: ElementFeature[],
): ElementFeature[] {
  const position = node.geometry.coordinates as Position;
  const moved: ElementFeature[] = [];
  for (const feature of features) {
    if (feature.geometry.type !== "LineString") continue;
    const { fromNodeId, toNodeId, viaNodeIds } = feature.properties;
    const isVia = viaNodeIds?.includes(node.id) ?? false;
    if (fromNodeId !== node.id && toNodeId !== node.id && !isVia) continue;
    const coordinates = feature.geometry.coordinates.map((c) => [...c]);
    const last = coordinates.length - 1;
    if (fromNodeId === node.id) coordinates[0] = [...position];
    if (toNodeId === node.id) coordinates[last] = [...position];
    if (isVia && previousPosition) {
      for (let i = 1; i < last; i++) {
        if (samePosition(coordinates[i], previousPosition)) coordinates[i] = [...position];
      }
    }
    moved.push({ ...feature, geometry: { type: "LineString", coordinates } });
  }
  return moved;
}

/** Cabos que apontavam para nós removidos, já sem a referência. */
export function detachNodes(removedIds: Id[], features: ElementFeature[]): ElementFeature[] {
  const removed = new Set(removedIds);
  const changed: ElementFeature[] = [];
  for (const feature of features) {
    const { fromNodeId, toNodeId, viaNodeIds } = feature.properties;
    const dropFrom = fromNodeId !== undefined && removed.has(fromNodeId);
    const dropTo = toNodeId !== undefined && removed.has(toNodeId);
    const keptVia = viaNodeIds?.filter((id) => !removed.has(id));
    const dropVia = keptVia !== undefined && keptVia.length !== viaNodeIds?.length;
    if (!dropFrom && !dropTo && !dropVia) continue;
    changed.push({
      ...feature,
      properties: {
        ...feature.properties,
        fromNodeId: dropFrom ? undefined : fromNodeId,
        toNodeId: dropTo ? undefined : toNodeId,
        viaNodeIds: keptVia,
      },
    });
  }
  return changed;
}
