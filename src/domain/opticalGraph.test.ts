import { describe, expect, it } from "vitest";
import { fiberId, generateFibers, traceToOlt, validateConnections, type OpticalModel } from "./opticalGraph";
import type { Cable, Connection, Equipment, Port } from "./types";

const cable = (id: string, from: string, to: string, lengthMeters: number, fiberCount = 12): Cable => ({
  id,
  projectId: "p",
  name: id,
  status: "active",
  kind: "cable_distribution",
  path: [],
  fromNodeId: from,
  toNodeId: to,
  fiberCount,
  fibersPerTube: 6,
  lengthMeters,
});

const equipment = (id: string, nodeId: string, kind: Equipment["kind"], splitRatio?: 8): Equipment => ({
  id,
  projectId: "p",
  nodeId,
  kind,
  name: id,
  splitRatio,
});

const port = (id: string, equipmentId: string, role: Port["role"], index = 1): Port => ({
  id,
  equipmentId,
  role,
  index,
  status: "free",
});

let nextConnection = 0;
const connect = (nodeId: string, kind: Connection["kind"], a: string, b: string): Connection => {
  const endpoint = (ref: string) =>
    ref.includes("#") ? ({ type: "fiber", fiberId: ref } as const) : ({ type: "port", portId: ref } as const);
  return { id: `c${++nextConnection}`, projectId: "p", nodeId, kind, a: endpoint(a), b: endpoint(b) };
};

/**
 * POP: OLT(pon) ─cordão─ DIO ─ fibra 1 do backbone
 * CEO: fibra 1 ─fusão─ splitter 1:8 (entrada); saída 2 ─fusão─ fibra 3 da distribuição
 * CTO: fibra 3 ─fusão─ splitter 1:8 (entrada); porta de atendimento 5
 */
function model(): OpticalModel {
  return {
    cables: [cable("bkb", "POP", "CEO", 3000), cable("dst", "CEO", "CTO", 700)],
    equipment: [
      equipment("olt", "POP", "olt"),
      equipment("dio", "POP", "dio"),
      equipment("spl1", "CEO", "splitter", 8),
      equipment("spl2", "CTO", "splitter", 8),
    ],
    ports: [
      port("olt-pon1", "olt", "pon"),
      port("dio-1", "dio", "dio"),
      port("spl1-in", "spl1", "splitter_in"),
      port("spl1-out2", "spl1", "splitter_out", 2),
      port("spl2-in", "spl2", "splitter_in"),
      port("cto-p5", "spl2", "drop", 5),
    ],
    connections: [
      connect("POP", "patch_cord", "olt-pon1", "dio-1"),
      connect("POP", "connector", "dio-1", fiberId("bkb", 1)),
      connect("CEO", "fusion", fiberId("bkb", 1), "spl1-in"),
      connect("CEO", "fusion", "spl1-out2", fiberId("dst", 3)),
      connect("CTO", "fusion", fiberId("dst", 3), "spl2-in"),
    ],
  };
}

describe("fibras", () => {
  it("gera as fibras do cabo com tubo e posição", () => {
    const fibers = generateFibers(cable("x", "A", "B", 100, 12));
    expect(fibers).toHaveLength(12);
    expect(fibers[6]).toEqual({ id: "x#7", cableId: "x", tubeIndex: 2, indexInTube: 1 });
  });
});

describe("traceToOlt", () => {
  it("segue da porta da CTO até a porta PON", () => {
    const trace = traceToOlt("cto-p5", model());
    expect(trace.complete).toBe(true);
    expect(trace.ponPortId).toBe("olt-pon1");
    expect(trace.splitRatios).toEqual([8, 8]);
    expect(trace.lengthMeters).toBe(3700);
    // 3,7 km × 0,35 + dois 1:8 + 3 fusões + conector + cordão
    expect(trace.lossDb).toBeCloseTo(1.295 + 21 + 0.3 + 0.5 + 1, 5);
  });

  it("para onde falta uma fusão (entrada do splitter da CEO) e diz onde", () => {
    const broken = model();
    broken.connections = broken.connections.filter((c) => !(c.nodeId === "CEO" && c.b.type === "port"));
    const trace = traceToOlt("cto-p5", broken);
    expect(trace.complete).toBe(false);
    expect(trace.openAt).toEqual({ nodeId: "CEO", endpoint: { type: "port", portId: "spl1-in" } });
  });
});

describe("validateConnections", () => {
  it("aceita o modelo correto, inclusive a posição de DIO com duas ligações", () => {
    expect(validateConnections(model())).toEqual([]);
  });

  it("recusa ponta usada duas vezes, fibra de cabo que não chega ao nó e porta de outro nó", () => {
    const bad = model();
    bad.connections.push(
      connect("CEO", "fusion", fiberId("bkb", 1), fiberId("dst", 4)),
      connect("CTO", "fusion", fiberId("bkb", 2), fiberId("dst", 5)),
      connect("CTO", "fusion", "spl1-out2", fiberId("dst", 6)),
    );
    const messages = validateConnections(bad).map((issue) => issue.message);
    expect(messages).toEqual([
      "A fibra bkb#1 já está ligada neste nó",
      "O cabo bkb não termina neste nó",
      "O equipamento spl1 não está neste nó",
    ]);
  });
});
