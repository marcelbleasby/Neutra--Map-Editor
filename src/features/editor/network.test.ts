import { describe, expect, it } from "vitest";
import type { ElementKind } from "@/domain/types";
import { makeCtoPorts, type ElementFeature, type ElementProperties } from "./model";
import { analyzeNetwork, computeRoutes, downstreamOf, estimateLoss, impactOf } from "./network";

function node(id: string, kind: ElementKind, extra: Partial<ElementProperties> = {}): ElementFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: { kind, name: id, status: "active", ...extra },
  };
}

function cable(
  id: string,
  kind: ElementKind,
  fromNodeId: string | undefined,
  toNodeId: string | undefined,
  lengthMeters: number,
  extra: Partial<ElementProperties> = {},
): ElementFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    properties: { kind, name: id, status: "active", fromNodeId, toNodeId, lengthMeters, ...extra },
  };
}

/**
 * POP ─bkb(2000)─ CEO1 (1:8) ─d1(500)─ CTO1 ─drop─ CLI1
 *                   └────────d2(800, via PST)─ CTO2
 * CTO3 isolada.
 */
function network(): ElementFeature[] {
  const cto1Ports = makeCtoPorts(8);
  cto1Ports[0] = { index: 1, status: "in_use", subscriber: "Maria" };
  cto1Ports[1] = { index: 2, status: "reserved", shared: true };
  const cto2Ports = makeCtoPorts(8);
  cto2Ports[0] = { index: 1, status: "in_use", shared: true };
  cto2Ports[1] = { index: 2, status: "free", shared: true };
  return [
    node("POP", "pop"),
    node("CEO1", "ceo", { splitRatio: 8 }),
    node("CTO1", "cto", { ports: cto1Ports }),
    node("CTO2", "cto", { ports: cto2Ports }),
    node("CTO3", "cto", { ports: makeCtoPorts(8) }),
    node("CLI1", "subscriber"),
    node("PST", "pole"),
    cable("bkb", "cable_backbone", "POP", "CEO1", 2000),
    cable("d1", "cable_distribution", "CEO1", "CTO1", 500),
    cable("d2", "cable_distribution", "CEO1", "CTO2", 800, { viaNodeIds: ["PST"] }),
    cable("drop", "cable_drop", "CTO1", "CLI1", 60),
  ];
}

describe("rota até o POP", () => {
  const features = network();
  const routes = computeRoutes(features);

  it("percorre os cabos do POP até o assinante", () => {
    expect(routes.get("CLI1")).toEqual({
      popId: "POP",
      nodeIds: ["POP", "CEO1", "CTO1", "CLI1"],
      cableIds: ["bkb", "d1", "drop"],
      lengthMeters: 2560,
    });
  });

  it("não inventa rota para nó isolado", () => {
    expect(routes.has("CTO3")).toBe(false);
  });

  it("escolhe o caminho mais curto quando há anel", () => {
    const ring = [...features, cable("atalho", "cable_distribution", "POP", "CTO2", 100)];
    expect(computeRoutes(ring).get("CTO2")?.cableIds).toEqual(["atalho"]);
  });
});

describe("impacto de falha", () => {
  const features = network();
  const { routes, byId } = analyzeNetwork(features);
  const ids = (id: string) => downstreamOf(byId.get(id)!, features, routes).map((f) => f.id).sort();

  it("lista o que depende de um nó, de um cabo e de um poste", () => {
    expect(ids("CEO1")).toEqual(["CLI1", "CTO1", "CTO2"]);
    expect(ids("d1")).toEqual(["CLI1", "CTO1"]);
    expect(ids("PST")).toEqual(["CTO2"]);
    expect(ids("CTO3")).toEqual([]);
  });

  it("resume CTOs, portas, assinantes e portas compartilhadas afetados", () => {
    expect(impactOf(byId.get("bkb")!, features, routes)).toMatchObject({
      ctos: 2,
      subscribers: 1,
      portsInUse: 2,
      sharedPorts: 2, // a compartilhada livre não conta
    });
  });

  it("conta as portas da própria CTO", () => {
    expect(impactOf(byId.get("CTO2")!, features, routes)).toMatchObject({ ctos: 1, portsInUse: 1 });
  });
});

describe("orçamento óptico estimado", () => {
  it("soma cabo, splitters da CEO e da CTO, emendas e conectores", () => {
    const { routes, byId } = analyzeNetwork(network());
    const loss = estimateLoss(routes.get("CTO1")!, byId);
    // 2,5 km × 0,35 + 1:8 + 1:8 + 2 emendas + 2 conectores
    expect(loss.lossDb).toBeCloseTo(0.875 + 10.5 + 10.5 + 0.2 + 1, 5);
    expect(loss.split).toBe(64);
    expect(loss.marginDb).toBeGreaterThan(0);
  });
});

describe("pendências", () => {
  const messages = (features: ElementFeature[], id: string) =>
    analyzeNetwork(features)
      .issues.filter((issue) => issue.elementId === id)
      .map((issue) => issue.message);

  it("rede correta só acusa a CTO isolada", () => {
    expect(analyzeNetwork(network()).issues).toEqual([
      { elementId: "CTO3", severity: "warning", message: "Sem caminho até um POP" },
    ]);
  });

  it("acusa ponta solta e tipo de cabo errado", () => {
    const features = [
      ...network(),
      cable("solto", "cable_distribution", "CEO1", undefined, 100),
      cable("errado", "cable_backbone", "CEO1", "CLI1", 100),
      cable("drop2", "cable_drop", "CTO1", "CTO2", 100),
    ];
    expect(messages(features, "solto")).toEqual(["Uma ponta do cabo está solta"]);
    expect(messages(features, "errado")[0]).toMatch(/não termina em Assinante/);
    expect(messages(features, "drop2")).toEqual(["Drop liga uma CTO a um assinante"]);
  });

  it("acusa orçamento estourado e mais drops do que portas", () => {
    const features = network();
    features.find((f) => f.id === "CEO1")!.properties.splitRatio = 16;
    features.find((f) => f.id === "CTO1")!.properties.ports = makeCtoPorts(16);
    expect(messages(features, "CTO1")[0]).toMatch(/passa do orçamento/);

    const crowded = network();
    crowded.find((f) => f.id === "CTO2")!.properties.ports = [];
    crowded.push(node("CLI2", "subscriber"), cable("drop2", "cable_drop", "CTO2", "CLI2", 50));
    expect(messages(crowded, "CTO2")).toContain("1 drops para 0 portas");
  });
});
