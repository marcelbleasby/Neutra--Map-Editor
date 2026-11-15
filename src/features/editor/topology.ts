import type { LineString, Position } from "geojson";
import { ELEMENTS } from "@/domain/catalog";
import type { Id } from "@/domain/types";
import type { ElementFeature } from "./model";

/** Converte lng/lat em pixels de tela. Injetado para manter este módulo puro. */
export type Projector = (position: Position) => { x: number; y: number };

export const SNAP_TOLERANCE_PX = 14;

function isEndpointNode(feature: ElementFeature): boolean {
  return feature.geometry.type === "Point" && ELEMENTS[feature.properties.kind].cableEndpoint === true;
}

/** Nó mais próximo de `position` em que um cabo pode terminar, dentro da tolerância. */
export function nearestEndpointNode(
  position: Position,
  features: ElementFeature[],
  project: Projector,
  tolerancePx = SNAP_TOLERANCE_PX,
): ElementFeature | undefined {
  const target = project(position);
  let best: ElementFeature | undefined;
  let bestDistance = tolerancePx;
  for (const feature of features) {
    if (!isEndpointNode(feature)) continue;
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
}

/**
 * Gruda as pontas de um cabo nos nós próximos e devolve a quais nós ele ficou
 * ligado. É isso que transforma um desenho em topologia: sem `fromNodeId` /
 * `toNodeId` o cabo é só uma linha.
 */
export function snapCable(
  line: LineString,
  features: ElementFeature[],
  project: Projector,
  tolerancePx = SNAP_TOLERANCE_PX,
): SnappedCable {
  const coordinates = line.coordinates.map((c) => [...c]);
  const last = coordinates.length - 1;
  const from = nearestEndpointNode(coordinates[0], features, project, tolerancePx);
  const to = nearestEndpointNode(coordinates[last], features, project, tolerancePx);
  if (from) coordinates[0] = [...(from.geometry.coordinates as Position)];
  // Um cabo não liga um nó a ele mesmo.
  const toNode = to && to.id !== from?.id ? to : undefined;
  if (toNode) coordinates[last] = [...(toNode.geometry.coordinates as Position)];
  return { coordinates, fromNodeId: from?.id, toNodeId: toNode?.id };
}

/** Cabos ligados a um nó, com as pontas reposicionadas para a nova posição dele. */
export function followNode(node: ElementFeature, features: ElementFeature[]): ElementFeature[] {
  const position = node.geometry.coordinates as Position;
  const moved: ElementFeature[] = [];
  for (const feature of features) {
    if (feature.geometry.type !== "LineString") continue;
    const { fromNodeId, toNodeId } = feature.properties;
    if (fromNodeId !== node.id && toNodeId !== node.id) continue;
    const coordinates = feature.geometry.coordinates.map((c) => [...c]);
    if (fromNodeId === node.id) coordinates[0] = [...position];
    if (toNodeId === node.id) coordinates[coordinates.length - 1] = [...position];
    moved.push({ ...feature, geometry: { type: "LineString", coordinates } });
  }
  return moved;
}

/** Cabos que apontavam para nós removidos, já sem a referência. */
export function detachNodes(removedIds: Id[], features: ElementFeature[]): ElementFeature[] {
  const removed = new Set(removedIds);
  const changed: ElementFeature[] = [];
  for (const feature of features) {
    const { fromNodeId, toNodeId } = feature.properties;
    const dropFrom = fromNodeId !== undefined && removed.has(fromNodeId);
    const dropTo = toNodeId !== undefined && removed.has(toNodeId);
    if (!dropFrom && !dropTo) continue;
    changed.push({
      ...feature,
      properties: {
        ...feature.properties,
        fromNodeId: dropFrom ? undefined : fromNodeId,
        toNodeId: dropTo ? undefined : toNodeId,
      },
    });
  }
  return changed;
}
