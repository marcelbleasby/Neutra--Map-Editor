import { describe, expect, it } from "vitest";
import { makeCtoPorts, type CtoPort, type ElementFeature } from "@/features/editor/model";
import {
  checkFeasibility,
  countPorts,
  distanceMeters,
  feasibilityOverlay,
  networkInventory,
  sharedRings,
  shareFreePorts,
  unshareFreePorts,
} from "./neutral";
import { coverageFromCtos, draftOffer, inventoryCsv } from "./offer";

// No equador, 0,001° de longitude ≈ 111,2 m.
const cto = (id: string, lng: number, ports: CtoPort[]): ElementFeature => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates: [lng, 0] },
  properties: { kind: "cto", name: id, status: "active", ports },
});

const ports = (spec: string): CtoPort[] =>
  // L livre, U em uso, R reservada, D defeito; minúscula = compartilhada.
  [...spec].map((c, i) => ({
    index: i + 1,
    status: ({ l: "free", u: "in_use", r: "reserved", d: "defective" } as const)[c.toLowerCase() as "l"],
    ...(c === c.toLowerCase() ? { shared: true } : {}),
  }));

const area: ElementFeature = {
  type: "Feature",
  id: "area",
  geometry: { type: "Polygon", coordinates: [[[-0.001, -0.001], [0.0015, -0.001], [0.0015, 0.001], [-0.001, 0.001], [-0.001, -0.001]]] },
  properties: { kind: "coverage_area", name: "Área", status: "active" },
};

describe("inventário de portas", () => {
  it("separa portas próprias e compartilhadas, livres e ocupadas", () => {
    expect(countPorts(ports("LLUUllurDd"))).toEqual({
      total: 10,
      ownFree: 2,
      ownBusy: 2,
      sharedFree: 2,
      sharedBusy: 2,
      defective: 2,
    });
  });

  it("soma o projeto e conta as CTOs com porta para ofertar", () => {
    const inventory = networkInventory([cto("a", 0, ports("LLll")), cto("b", 0.001, ports("UUuu")), area]);
    expect(inventory.totals).toMatchObject({ total: 8, ownFree: 2, sharedFree: 2, sharedBusy: 2 });
    expect(inventory.ctosWithOffer).toBe(1);
  });

  it("compartilha e descompartilha só as portas livres", () => {
    const shared = shareFreePorts(ports("LULu"));
    expect(countPorts(shared)).toMatchObject({ ownFree: 0, ownBusy: 1, sharedFree: 2, sharedBusy: 1 });
    const back = unshareFreePorts(shared);
    expect(countPorts(back)).toMatchObject({ ownFree: 2, sharedFree: 0, sharedBusy: 1 });
    expect(back[0]).toEqual({ index: 1, status: "free" });
  });
});

describe("viabilidade", () => {
  const network = [
    cto("perto-cheia", 0.0005, ports("UUUU")), // ~56 m, sem porta livre
    cto("perto-compartilhada", 0.001, ports("UUll")), // ~111 m, só compartilhadas livres
    cto("media-propria", 0.002, ports("LLUU")), // ~222 m
    cto("longe", 0.003, makeCtoPorts(8)), // ~334 m, fora do raio
    area,
  ];

  it("mede a distância em linha reta", () => {
    expect(distanceMeters([0, 0], [0.001, 0])).toBeCloseTo(111.2, 0);
  });

  it("lista as CTOs a até 250 m, da mais próxima para a mais distante", () => {
    const result = checkFeasibility([0, 0], network);
    expect(result.candidates.map((c) => c.id)).toEqual(["perto-cheia", "perto-compartilhada", "media-propria"]);
    expect(Math.round(result.candidates[2].distanceMeters)).toBe(222);
    expect(result).toMatchObject({ covered: true, viable: true, sharedViable: true });
  });

  it("porta compartilhada livre não dá viabilidade para a própria Empresa", () => {
    const result = checkFeasibility([0, 0], network.filter((f) => f.id !== "media-propria"));
    expect(result).toMatchObject({ viable: false, sharedViable: true });
  });

  it("cobertura e viabilidade são independentes", () => {
    // Dentro da área, mas a única CTO no raio está cheia.
    expect(checkFeasibility([-0.0009, 0], network)).toMatchObject({ covered: true, viable: false });
    // Fora da área, com CTO de porta livre a menos de 250 m.
    expect(checkFeasibility([0.0035, 0], network)).toMatchObject({ covered: false, viable: true });
  });

  it("gera o desenho do mapa: raio, linha por CTO e ponto", () => {
    const overlay = feasibilityOverlay(checkFeasibility([0, 0], network));
    expect(overlay.map((f) => f.properties?.role)).toEqual(["radius", "link", "link", "link", "point"]);
    expect(sharedRings(network).map((f) => f.properties?.sharedFree)).toEqual([2]);
  });
});

describe("da rede para a oferta", () => {
  const network = [
    cto("a", 0, ports("LLll")), // 2 compartilhadas livres
    cto("b", 0.001, ports("UUlu")), // 1 livre, 1 em uso
    cto("c", 0.02, ports("llll")), // 4 livres, a ~2,2 km
    cto("d", 0.0005, ports("LLUU")), // nenhuma compartilhada
    area, // cobre a, b e d
  ];

  it("soma as portas compartilhadas livres do projeto ou de uma área", () => {
    expect(draftOffer(network)).toMatchObject({ portCount: 7, portsInUse: 1 });
    expect(draftOffer(network).ctos.map((c) => c.id)).toEqual(["a", "b", "c"]);
    const inside = draftOffer(network, "area");
    expect(inside.ctos.map((c) => c.id)).toEqual(["a", "b"]);
    expect(inside.portCount).toBe(3);
  });

  it("une os círculos de CTOs vizinhas e separa as afastadas", () => {
    const areas = coverageFromCtos([[0, 0], [0.001, 0], [0.02, 0]]);
    expect(areas).toHaveLength(2);
    // A área unida alcança ~250 m a oeste da primeira CTO e a leste da segunda.
    const xs = areas[0].coordinates[0].map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(-0.00225, 4);
    expect(Math.max(...xs)).toBeCloseTo(0.00325, 4);
    expect(coverageFromCtos([])).toEqual([]);
    expect(coverageFromCtos([[0, 0]])).toHaveLength(1);
  });

  it("exporta a ocupação em CSV que o Excel abre", () => {
    const csv = inventoryCsv(networkInventory([cto('CTO "Centro"; 01', 0.5, ports("LUlu"))]));
    expect(csv.startsWith("﻿CTO;Latitude;Longitude;Portas;")).toBe(true);
    expect(csv.split("\r\n")[1]).toBe('"CTO ""Centro""; 01";0.000000;0.500000;4;1;1;1;1;0');
  });
});
