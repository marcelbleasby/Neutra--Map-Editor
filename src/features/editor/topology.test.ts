import { describe, expect, it } from "vitest";
import { fiberPosition, pathLossDb, totalSplit } from "@/domain/optics";
import type { ElementKind } from "@/domain/types";
import { defaultProperties, migrateCollection, nextName, summarize, type ElementFeature } from "./model";
import { detachNodes, followNode, snapCable, type Projector } from "./topology";

// 1 grau = 1000 px: tolerância de 14 px equivale a 0,014 grau.
const project: Projector = ([x, y]) => ({ x: x * 1000, y: y * 1000 });

function node(id: string, kind: ElementKind, x: number, y: number): ElementFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [x, y] },
    properties: { kind, name: id, status: "planned" },
  };
}

function cable(id: string, coordinates: number[][], extra = {}): ElementFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "LineString", coordinates },
    properties: { kind: "cable_distribution", name: id, status: "planned", ...extra },
  };
}

describe("snapCable", () => {
  const nodes = [node("ceo", "ceo", 0, 0), node("cto", "cto", 1, 0), node("poste", "pole", 0.5, 0)];

  it("gruda as duas pontas nos nós dentro da tolerância", () => {
    const line = { type: "LineString" as const, coordinates: [[0.01, 0.005], [0.5, 0.2], [0.99, 0]] };
    expect(snapCable(line, nodes, project)).toEqual({
      coordinates: [[0, 0], [0.5, 0.2], [1, 0]],
      fromNodeId: "ceo",
      toNodeId: "cto",
      viaNodeIds: [],
    });
  });

  it("não gruda fora da tolerância nem em nós que não terminam cabo", () => {
    const line = { type: "LineString" as const, coordinates: [[0.1, 0.1], [0.5, 0.001]] };
    expect(snapCable(line, nodes, project)).toEqual({
      coordinates: line.coordinates,
      fromNodeId: undefined,
      toNodeId: undefined,
      viaNodeIds: [],
    });
  });

  it("não liga um nó a ele mesmo", () => {
    const line = { type: "LineString" as const, coordinates: [[0, 0.001], [0.3, 0.3], [0.001, 0]] };
    const snapped = snapCable(line, nodes, project);
    expect(snapped.fromNodeId).toBe("ceo");
    expect(snapped.toNodeId).toBeUndefined();
  });
});

describe("followNode / detachNodes", () => {
  const cables = [
    cable("a", [[0, 0], [1, 0]], { fromNodeId: "ceo", toNodeId: "cto" }),
    cable("b", [[5, 5], [6, 6]]),
  ];

  it("move só as pontas dos cabos ligados ao nó", () => {
    const moved = followNode(node("cto", "cto", 2, 2), [1, 0], cables);
    expect(moved.map((f) => f.id)).toEqual(["a"]);
    expect(moved[0].geometry.coordinates).toEqual([[0, 0], [2, 2]]);
  });

  it("remove a referência ao nó excluído", () => {
    const changed = detachNodes(["ceo"], cables);
    expect(changed).toHaveLength(1);
    expect(changed[0].properties).toMatchObject({ fromNodeId: undefined, toNodeId: "cto" });
  });
});

describe("nós de passagem", () => {
  const nodes = [node("ceo", "ceo", 0, 0), node("cto", "cto", 1, 0), node("poste", "pole", 0.5, 0.2)];

  it("gruda o vértice intermediário no poste e registra a passagem", () => {
    const line = { type: "LineString" as const, coordinates: [[0, 0], [0.505, 0.195], [1, 0]] };
    const snapped = snapCable(line, nodes, project);
    expect(snapped.coordinates[1]).toEqual([0.5, 0.2]);
    expect(snapped.viaNodeIds).toEqual(["poste"]);
  });

  it("a ponta do cabo não gruda em poste", () => {
    const line = { type: "LineString" as const, coordinates: [[0.5, 0.2], [1, 0]] };
    expect(snapCable(line, nodes, project).fromNodeId).toBeUndefined();
  });

  it("o vértice acompanha o poste movido e some da passagem quando o poste é excluído", () => {
    const passing = cable("a", [[0, 0], [0.5, 0.2], [1, 0]], {
      fromNodeId: "ceo",
      toNodeId: "cto",
      viaNodeIds: ["poste"],
    });
    const moved = followNode(node("poste", "pole", 0.6, 0.3), [0.5, 0.2], [passing]);
    expect(moved[0].geometry.coordinates).toEqual([[0, 0], [0.6, 0.3], [1, 0]]);
    expect(detachNodes(["poste"], [passing])[0].properties.viaNodeIds).toEqual([]);
  });
});

describe("modelo do editor", () => {
  it("gera nomes sequenciais por tipo, ignorando nomes editados à mão", () => {
    const existing = [node("1", "cto", 0, 0), node("2", "cto", 0, 0)];
    existing[0].properties.name = "CTO-007";
    existing[1].properties.name = "Esquina da padaria";
    expect(nextName("cto", existing)).toBe("CTO-008");
    expect(nextName("ceo", existing)).toBe("CEO-001");
  });

  it("cria CTO com 8 portas livres e resume a ocupação", () => {
    const cto = { ...node("1", "cto", 0, 0), properties: defaultProperties("cto", []) };
    cto.properties.ports![0].status = "in_use";
    const summary = summarize([cto, cable("c", [[0, 0], [1, 1]], { lengthMeters: 120 })]);
    expect(summary.ports).toEqual({ free: 7, reserved: 0, in_use: 1, defective: 0 });
    expect(summary.sharedPorts).toBe(0);
    expect(summary.cableMeters).toBe(120);
    expect(summary.countByKind).toEqual({ cto: 1, cable_distribution: 1 });
  });
});

describe("migração do vocabulário antigo", () => {
  it("cliente vira assinante; provedor na porta vira porta compartilhada", () => {
    const legacy = {
      type: "FeatureCollection" as const,
      features: [
        { ...node("c", "cto", 0, 0), properties: { kind: "cto", name: "c", status: "active", ports: [
          { index: 1, status: "in_use", providerId: "provider-1", customerName: "João" },
          { index: 2, status: "in_use", customerName: "Maria" },
          { index: 3, status: "free" },
        ] } },
        { ...node("x", "pop", 0, 0), properties: { kind: "customer", name: "x", status: "active" } },
      ],
    };
    const migrated = migrateCollection(legacy as never);
    expect(migrated.features[0].properties.ports).toEqual([
      { index: 1, status: "in_use", shared: true }, // o assinante era do outro provedor
      { index: 2, status: "in_use", subscriber: "Maria" },
      { index: 3, status: "free" },
    ]);
    expect(migrated.features[1].properties.kind).toBe("subscriber");
    expect(migrateCollection(migrated)).toEqual(migrated);
  });
});

describe("óptica", () => {
  it("soma fibra, splitters, fusões e conectores", () => {
    const loss = pathLossDb({ lengthMeters: 4000, splitRatios: [8, 8], fusions: 4, connectors: 2 });
    expect(loss).toBeCloseTo(1.4 + 21 + 0.4 + 1, 5);
    expect(totalSplit([8, 8])).toBe(64);
  });

  it("localiza a fibra no tubo", () => {
    expect(fiberPosition(1, 12)).toEqual({ tube: 1, indexInTube: 1 });
    expect(fiberPosition(12, 12)).toEqual({ tube: 1, indexInTube: 12 });
    expect(fiberPosition(13, 12)).toEqual({ tube: 2, indexInTube: 1 });
  });
});
