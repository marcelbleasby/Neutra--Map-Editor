// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { analyzeNetwork } from "@/features/editor/network";
import { buildFeatures, centerOf } from "./build";
import { classifyPlacemark, groupPlacemarks, normalize } from "./classify";
import { parseKml, type Placemark } from "./kml";

const point = (name: string, description = "", folders: string[] = []): Placemark => ({
  name,
  description,
  folders,
  geometry: { type: "Point", coordinates: [0, 0] },
});
const line = (name: string, folders: string[] = []): Placemark => ({
  name,
  description: "",
  folders,
  geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
});
const kindOf = (placemark: Placemark) => classifyPlacemark(placemark).kind;

// Um grau de longitude no equador ≈ 111 km; 0,00001° ≈ 1,1 m.
const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Rede</name>
  <Folder><name>Caixas</name>
    <Placemark><name>POP Centro</name><Point><coordinates>0,0,0</coordinates></Point></Placemark>
    <Placemark><name>CEO-001</name><Point><coordinates>0.01,0,0</coordinates></Point></Placemark>
    <Placemark><name>CTO-IUB-00551</name><description>Portas: 16</description>
      <Point><coordinates>0.02,0,0</coordinates></Point></Placemark>
    <Placemark><name>KM 12</name><Point><coordinates>0.5,0.5,0</coordinates></Point></Placemark>
  </Folder>
  <Placemark><name>Cabo 72 interligação POP</name>
    <LineString><coordinates>0.00001,0.00001,0 0.00999,0,0</coordinates></LineString></Placemark>
  <Placemark><name>CEO-001-[]-CTO-IUB-00551_12FO-</name>
    <LineString><coordinates>
      0.01,0,0 0.015,0.001,0 0.02002,0,0
    </coordinates></LineString></Placemark>
  <Placemark><name>Caminho sem título</name>
    <LineString><coordinates>0.3,0.3 0.4,0.4</coordinates></LineString></Placemark>
  <Placemark><name>Mancha</name><Polygon><outerBoundaryIs><LinearRing>
    <coordinates>0,0 0.03,0 0.03,0.01 0,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
  <Placemark><name>vazio</name><Point><coordinates></coordinates></Point></Placemark>
</Document></kml>`;

describe("parseKml", () => {
  const placemarks = parseKml(KML);

  it("lê pontos, linhas e polígonos, com pastas, e descarta geometria vazia", () => {
    expect(placemarks.map((p) => p.geometry.type)).toEqual([
      "Point", "Point", "Point", "Point", "LineString", "LineString", "LineString", "Polygon",
    ]);
    expect(placemarks[2]).toMatchObject({
      name: "CTO-IUB-00551",
      description: "Portas: 16",
      folders: ["Rede", "Caixas"],
      geometry: { coordinates: [0.02, 0] },
    });
    expect(placemarks[5].geometry.coordinates).toHaveLength(3);
  });

  it("aceita Placemark com prefixo de namespace e recusa XML inválido", () => {
    const prefixed = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <ns0:Placemark xmlns:ns0="http://www.opengis.net/kml/2.2"><ns0:name>CTO-RSS</ns0:name>
      <ns0:Point><ns0:coordinates>-37.9,-4.9,0</ns0:coordinates></ns0:Point></ns0:Placemark></Document></kml>`;
    expect(parseKml(prefixed)).toMatchObject([{ name: "CTO-RSS", geometry: { coordinates: [-37.9, -4.9] } }]);
    expect(() => parseKml("<kml><Document>")).toThrow(/KML válido/);
  });

  it("calcula o centro da rede", () => {
    expect(centerOf(placemarks)).toEqual([0.25, 0.25]);
  });
});

describe("classificação pelo nome", () => {
  it("reconhece os padrões vistos nos arquivos reais", () => {
    expect(normalize("Reserva Técnica")).toBe("RESERVA TECNICA");
    expect(kindOf(point("CTO-IUB-00551"))).toBe("cto");
    expect(kindOf(point("NAP - 1"))).toBe("cto");
    expect(kindOf(point("CEO 72"))).toBe("ceo");
    expect(kindOf(point("POP QUEX_JFLO"))).toBe("pop");
    expect(kindOf(point("RT 30m inserir CEO"))).toBe("reserve");
    expect(kindOf(point("P_5"))).toBe("pole");
    expect(kindOf(point("KM 12"))).toBeNull();
    expect(kindOf(point("0012", "", ["Rede", "CTOs"]))).toBeNull();
    expect(kindOf(point("0012", "", ["Rede", "CTO"]))).toBe("cto");
  });

  it("separa tronco de distribuição e lê a quantidade de fibras", () => {
    expect(classifyPlacemark(line("CEO-MCO-00027-X-[]-CTO-MCO-01015-X_12FO-"))).toEqual({
      kind: "cable_distribution",
      fiberCount: 12,
    });
    expect(classifyPlacemark(line("Cabo 72 interligação POP"))).toEqual({ kind: "cable_backbone", fiberCount: 72 });
    expect(kindOf(line("C-Ceo - 1-Ceo - 12"))).toBe("cable_backbone");
    expect(kindOf(line("Drop cliente 14"))).toBe("cable_drop");
    expect(kindOf(line("Caminho sem título"))).toBeNull();
  });

  it("lê as portas da CTO na descrição", () => {
    expect(classifyPlacemark(point("CTO-RSS", "Portas: 10\nPortas Compartilhadas: 2")).portCount).toBe(10);
  });
});

describe("importação", () => {
  const placemarks = parseKml(KML);
  const classifications = placemarks.map(classifyPlacemark);
  const groups = groupPlacemarks(placemarks, classifications);

  it("agrupa reconhecidos por tipo e sugere ignorar ponto desconhecido", () => {
    const summary = Object.fromEntries(groups.map((g) => [g.label, [g.indexes.length, g.suggested]]));
    expect(summary).toEqual({
      POP: [1, "pop"],
      CEO: [1, "ceo"],
      CTO: [1, "cto"],
      "Cabo backbone": [1, "cable_backbone"],
      "Cabo distribuição": [1, "cable_distribution"],
      "Área de cobertura": [1, "coverage_area"],
      'Pontos "KM"': [1, null],
      'Linhas "CAMINHO"': [1, "cable_distribution"],
    });
  });

  it("monta a topologia: liga as pontas dos cabos aos nós a até 5 m", () => {
    let id = 0;
    const suggested = new Map(groups.flatMap((g) => g.indexes.map((i) => [i, g.suggested] as const)));
    const result = buildFeatures(placemarks, classifications, (i) => suggested.get(i) ?? null, [], () => `e${++id}`);

    expect(result.features).toHaveLength(7); // "KM 12" ignorado
    expect(result).toMatchObject({ cables: 3, connectedCables: 2 });

    const byName = Object.fromEntries(result.features.map((f) => [f.properties.name, f]));
    const backbone = byName["Cabo 72 interligação POP"];
    expect(backbone.properties).toMatchObject({
      kind: "cable_backbone",
      status: "active",
      fiberCount: 72,
      fromNodeId: byName["POP Centro"].id,
      toNodeId: byName["CEO-001"].id,
    });
    expect(backbone.geometry.coordinates).toEqual([[0, 0], [0.01, 0]]);
    expect(byName["CTO-IUB-00551"].properties.ports).toHaveLength(16);

    const { routes, issues } = analyzeNetwork(result.features);
    expect(routes.get(byName["CTO-IUB-00551"].id)?.nodeIds).toHaveLength(3);
    expect(issues.map((issue) => issue.message)).toEqual(["Cabo sem ligação nas duas pontas"]);
  });
});
