import { describe, expect, it } from "vitest";
import { traceToOlt } from "@/domain/opticalGraph";
import type { ElementKind, OpticalEndpoint } from "@/domain/types";
import { makeCtoPorts, type ElementFeature, type ElementProperties } from "@/features/editor/model";
import { connectionPath, layoutNode } from "./layout";
import {
  addEquipment,
  buildOpticalModel,
  connect,
  describeTrace,
  EMPTY_OPTICAL,
  fiberId,
  removeEquipment,
  traceCto,
  type OpticalData,
} from "./model";

const node = (id: string, kind: ElementKind, extra: Partial<ElementProperties> = {}): ElementFeature => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates: [0, 0] },
  properties: { kind, name: id, status: "active", ...extra },
});
const cable = (id: string, kind: ElementKind, from: string, to: string, fiberCount: number, lengthMeters: number): ElementFeature => ({
  type: "Feature",
  id,
  geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  properties: { kind, name: id, status: "active", fromNodeId: from, toNodeId: to, fiberCount, lengthMeters },
});

const features = (): ElementFeature[] => [
  node("POP", "pop"),
  node("CEO", "ceo", { splitRatio: 8 }),
  node("CTO", "cto", { ports: makeCtoPorts(8) }),
  cable("bkb", "cable_backbone", "POP", "CEO", 24, 3000),
  cable("dst", "cable_distribution", "CEO", "CTO", 12, 700),
];

const fiber = (cableId: string, n: number): OpticalEndpoint => ({ type: "fiber", fiberId: fiberId(cableId, n) });
const port = (portId: string): OpticalEndpoint => ({ type: "port", portId });

/** Monta a rede inteira pelas mesmas funções que o diagrama usa. */
function wired(): { data: OpticalData; all: ElementFeature[] } {
  const all = features();
  let n = 0;
  const id = () => `x${++n}`;
  let data = addEquipment(EMPTY_OPTICAL, "POP", { kind: "olt", size: 8 }, "p", () => "olt");
  data = addEquipment(data, "POP", { kind: "dio", size: 12 }, "p", () => "dio");
  const link = (nodeId: string, a: OpticalEndpoint, b: OpticalEndpoint) => {
    const result = connect(buildOpticalModel(all, data, "p"), data, nodeId, a, b, "p", id);
    if ("error" in result) throw new Error(result.error);
    data = result.data;
  };
  link("POP", port("olt:pon:2"), port("dio:dio:1"));
  link("POP", port("dio:dio:1"), fiber("bkb", 1));
  link("CEO", fiber("bkb", 1), port("CEO:spl:in"));
  link("CEO", port("CEO:spl:out:3"), fiber("dst", 5));
  link("CTO", fiber("dst", 5), port("CTO:spl:in"));
  return { data, all };
}

describe("modelo do diagrama", () => {
  it("deriva os splitters da CTO e da CEO a partir do mapa", () => {
    const model = buildOpticalModel(features(), EMPTY_OPTICAL, "p");
    expect(model.equipment.map((e) => [e.id, e.splitRatio])).toEqual([
      ["CEO:spl", 8],
      ["CTO:spl", 8],
    ]);
    expect(model.ports.filter((p) => p.equipmentId === "CTO:spl" && p.role === "drop")).toHaveLength(8);
  });

  it("escolhe o tipo de ligação pelas pontas", () => {
    const { data } = wired();
    expect(data.connections.map((c) => c.kind)).toEqual(["patch_cord", "connector", "fusion", "fusion", "fusion"]);
  });

  it("rastreia da CTO até a porta PON e descreve o caminho", () => {
    const { data, all } = wired();
    const model = buildOpticalModel(all, data, "p");
    const trace = traceCto("CTO", model)!;
    // Passa pelos dois splitters: o da CEO e o da própria CTO.
    expect(trace).toMatchObject({ complete: true, ponPortId: "olt:pon:2", lengthMeters: 3700, splitRatios: [8, 8] });
    // Entrada da CTO: 0,1 + 0,245 + 0,1 + 10,5 + 0,1 + 1,05 + 0,5 + 1,0 = 13,595 dB; mais o 1:8 da CTO.
    expect(traceToOlt("CTO:spl:in", model).lossDb).toBeCloseTo(13.595, 5);
    expect(describeTrace(trace, model, (id) => id)).toBe("Chega a OLT-1 PON 2 em POP: 3,70 km, divisão 1:64, 24,1 dB.");
  });

  it("recusa ligar uma ponta já ligada e diz onde o caminho para", () => {
    const { data, all } = wired();
    const model = buildOpticalModel(all, data, "p");
    expect(connect(model, data, "CEO", fiber("bkb", 1), fiber("dst", 6), "p")).toEqual({
      error: "bkb fibra 1 já está ligada neste nó",
    });
    const cut = { ...data, connections: data.connections.filter((c) => c.nodeId !== "CEO") };
    const broken = buildOpticalModel(all, cut, "p");
    expect(describeTrace(traceCto("CTO", broken)!, broken, (id) => id)).toBe(
      "Interrompido em CEO: dst fibra 5 sem ligação.",
    );
  });

  it("descarta ligações órfãs quando o mapa muda", () => {
    const { data, all } = wired();
    const fewerFibers = all.map((f) => (f.id === "dst" ? { ...f, properties: { ...f.properties, fiberCount: 4 } } : f));
    expect(buildOpticalModel(fewerFibers, data, "p").connections).toHaveLength(3);
    const withoutCeo = all.filter((f) => f.id !== "CEO");
    expect(buildOpticalModel(withoutCeo, data, "p").connections.map((c) => c.nodeId)).toEqual(["POP", "POP", "CTO"]);
    expect(removeEquipment(data, "dio").connections).toHaveLength(3);
  });
});

describe("layout", () => {
  const { data, all } = wired();
  const model = buildOpticalModel(all, data, "p");

  it("CEO: entrada à esquerda, splitter no meio, saída à direita", () => {
    const layout = layoutNode("CEO", "ceo", model, "bkb");
    expect(layout.blocks.map((b) => [b.title, b.lane, b.rows.length])).toEqual([
      ["Splitter de 1º nível", 1, 9],
      ["bkb", 0, 24],
      ["dst", 2, 12],
    ]);
    const path = connectionPath(layout.anchors.get("f:bkb#1"), layout.anchors.get("p:CEO:spl:in"));
    expect(path).toMatch(/^M 236 /); // sai da borda direita do cabo de entrada
  });

  it("POP: OLT, DIO e cabos em faixas; a posição do DIO liga dos dois lados", () => {
    const layout = layoutNode("POP", "pop", model, undefined);
    expect(layout.blocks.map((b) => [b.title, b.lane])).toEqual([
      ["OLT-1", 0],
      ["DIO-1", 1],
      ["bkb", 2],
    ]);
    const dio = layout.anchors.get("p:dio:dio:1")!;
    expect(dio.left && dio.right).toBeTruthy();
    expect(layout.blocks[1].removable).toBe(true);
  });

  it("não desenha ligação de ponta que saiu do diagrama", () => {
    expect(connectionPath(undefined, { lane: 0, right: { x: 0, y: 0 } })).toBeNull();
  });
});
