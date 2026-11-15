import type { OpticalModel } from "@/domain/opticalGraph";
import type { Id, OpticalEndpoint } from "@/domain/types";
import { cablesAt, endpointKey, fiberId, fiberInfo, isDerived, portLabel } from "./model";

/**
 * Posiciona os blocos do diagrama de um nó em três faixas:
 *
 *   POP:        OLTs            | DIOs e splitters | cabos
 *   CEO / CTO:  cabo de entrada | splitters        | demais cabos
 *
 * Função pura: recebe o modelo e devolve coordenadas. O desenho fica em
 * NodeDiagram.tsx.
 */

export const ROW_HEIGHT = 22;
export const HEADER_HEIGHT = 30;
export const LANE_WIDTH = 220;
const LANE_GAP = 130;
const BLOCK_GAP = 18;
const PADDING = 16;

export type Side = "left" | "right";

export interface DiagramRow {
  key: string;
  endpoint: OpticalEndpoint;
  label: string;
  /** Cor da fibra ou da situação da porta. */
  swatch?: string;
  /** Cor do tubo, para a faixa lateral do cabo. */
  band?: string;
  /** Centro vertical da linha. */
  y: number;
  /** Lados em que a linha aceita ligação. */
  sides: Side[];
}

export interface DiagramBlock {
  id: Id;
  kind: "cable" | "equipment";
  title: string;
  subtitle: string;
  lane: number;
  x: number;
  y: number;
  height: number;
  rows: DiagramRow[];
  /** Equipamento cadastrado no diagrama (os derivados do mapa não se removem aqui). */
  removable: boolean;
}

export interface Anchor {
  lane: number;
  left?: { x: number; y: number };
  right?: { x: number; y: number };
}

export interface DiagramLayout {
  blocks: DiagramBlock[];
  anchors: Map<string, Anchor>;
  width: number;
  height: number;
}

const PORT_STATUS_SWATCH = { free: "#e2e8f0", reserved: "#fbbf24", in_use: "#22c55e", defective: "#ef4444" };

export function layoutNode(
  nodeId: Id,
  nodeKind: string,
  model: OpticalModel,
  /** Cabo pelo qual o nó chega ao POP; vai para a faixa da esquerda. */
  upstreamCableId: Id | undefined,
): DiagramLayout {
  const laneX = (lane: number) => PADDING + lane * (LANE_WIDTH + LANE_GAP);
  const nextY = [PADDING, PADDING, PADDING];
  const blocks: DiagramBlock[] = [];
  const anchors = new Map<string, Anchor>();

  const place = (
    block: Pick<DiagramBlock, "id" | "kind" | "title" | "subtitle" | "lane" | "removable">,
    rows: Omit<DiagramRow, "y" | "key">[],
  ) => {
    const x = laneX(block.lane);
    const y = nextY[block.lane];
    const placed = rows.map((row, index): DiagramRow => {
      const rowY = y + HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
      const key = endpointKey(row.endpoint);
      const anchor: Anchor = { lane: block.lane };
      if (row.sides.includes("left")) anchor.left = { x, y: rowY };
      if (row.sides.includes("right")) anchor.right = { x: x + LANE_WIDTH, y: rowY };
      anchors.set(key, anchor);
      return { ...row, key, y: rowY };
    });
    const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 6;
    blocks.push({ ...block, x, y, height, rows: placed });
    nextY[block.lane] = y + height + BLOCK_GAP;
  };

  for (const equipment of model.equipment.filter((item) => item.nodeId === nodeId)) {
    const ports = model.ports.filter((port) => port.equipmentId === equipment.id);
    const lane = equipment.kind === "olt" ? 0 : 1;
    place(
      {
        id: equipment.id,
        kind: "equipment",
        title: equipment.name,
        subtitle:
          equipment.kind === "splitter"
            ? `1:${equipment.splitRatio}`
            : `${ports.length} ${equipment.kind === "olt" ? "PON" : "posições"}`,
        lane,
        removable: !isDerived(equipment.id),
      },
      ports.map((port) => ({
        endpoint: { type: "port", portId: port.id },
        label: portLabel(port),
        swatch: port.role === "drop" ? PORT_STATUS_SWATCH[port.status] : undefined,
        sides:
          port.role === "dio"
            ? ["left", "right"]
            : port.role === "splitter_in"
              ? ["left"]
              : ["right"],
      })),
    );
  }

  const cables = cablesAt(nodeId, model);
  // Entrada primeiro, para ficar no alto da faixa.
  cables.sort((a, b) => Number(b.id === upstreamCableId) - Number(a.id === upstreamCableId));
  for (const cable of cables) {
    const lane = nodeKind !== "pop" && cable.id === upstreamCableId ? 0 : 2;
    place(
      {
        id: cable.id,
        kind: "cable",
        title: cable.name,
        subtitle: `${cable.fiberCount} ${cable.fiberCount === 1 ? "fibra" : "fibras"}`,
        lane,
        removable: false,
      },
      Array.from({ length: cable.fiberCount }, (_, i) => {
        const info = fiberInfo(i + 1);
        return {
          endpoint: { type: "fiber" as const, fiberId: fiberId(cable.id, i + 1) },
          label: `T${info.tube} · F${String(i + 1).padStart(2, "0")} ${info.color.name}`,
          swatch: info.color.hex,
          band: info.tubeColor.hex,
          sides: [lane === 0 ? "right" : "left"] as Side[],
        };
      }),
    );
  }

  return {
    blocks,
    anchors,
    width: laneX(2) + LANE_WIDTH + PADDING,
    height: Math.max(...nextY, 200),
  };
}

/** Lado de cada ponta e curva entre elas. `null` se alguma ponta não está no diagrama. */
export function connectionPath(a: Anchor | undefined, b: Anchor | undefined): string | null {
  if (!a || !b) return null;
  const pick = (self: Anchor, other: Anchor): [Side, { x: number; y: number }] | null => {
    const facing: Side = other.lane < self.lane || (other.lane === self.lane && !self.right) ? "left" : "right";
    const side = self[facing] ? facing : facing === "left" ? "right" : "left";
    const point = self[side];
    return point ? [side, point] : null;
  };
  const from = pick(a, b);
  const to = pick(b, a);
  if (!from || !to) return null;
  const reach = 70;
  const control = ([side, point]: [Side, { x: number; y: number }]) => point.x + (side === "right" ? reach : -reach);
  return `M ${from[1].x} ${from[1].y} C ${control(from)} ${from[1].y}, ${control(to)} ${to[1].y}, ${to[1].x} ${to[1].y}`;
}
