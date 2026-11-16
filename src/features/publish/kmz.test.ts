// @vitest-environment happy-dom
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import type { ElementKind } from "@/domain/types";
import { makeCtoPorts, type ElementFeature, type ElementProperties } from "@/features/editor/model";
import { buildFeatures } from "@/features/import/build";
import { classifyPlacemark } from "@/features/import/classify";
import { parseKml } from "@/features/import/kml";
import { buildKml, buildKmz } from "./kmz";

const node = (id: string, kind: ElementKind, x: number, extra: Partial<ElementProperties> = {}): ElementFeature => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates: [x, 0] },
  properties: { kind, name: id, status: "active", ...extra },
});

function project(): ElementFeature[] {
  const ports = makeCtoPorts(8);
  ports[0] = { index: 1, status: "in_use", subscriber: "Maria" };
  ports[6] = { index: 7, status: "free", shared: true };
  ports[7] = { index: 8, status: "in_use", shared: true };
  ports[3] = { index: 4, status: "defective" };
  return [
    node("POP Centro", "pop", 0),
    node("CEO-001", "ceo", 0.001, { splitRatio: 8, notes: "Poste da esquina <A&B>" }),
    node("CTO-001", "cto", 0.002, { ports }),
    {
      type: "Feature",
      id: "dst",
      geometry: { type: "LineString", coordinates: [[0.001, 0], [0.002, 0]] },
      properties: {
        kind: "cable_distribution",
        name: "DST-001",
        status: "planned",
        fromNodeId: "CEO-001",
        toNodeId: "CTO-001",
        fiberCount: 12,
        lengthMeters: 111,
      },
    },
  ];
}

describe("KMZ para a geo", () => {
  it("declara o asset_type da geo e escapa o texto", () => {
    const { kml, summary } = buildKml("Rede <Centro>", project());
    expect(kml).toContain('<Schema name="neutra-assets-v1" id="neutra-assets-v1">');
    expect(kml).toContain('<SimpleData name="asset_type">cto</SimpleData>');
    expect(kml).toContain('<SimpleData name="asset_type">splice_closure</SimpleData>');
    expect(kml).toContain('<SimpleData name="asset_type">fiber_cable</SimpleData>');
    // POP não tem tipo na geo: vai só com o tipo do editor.
    expect(kml).toMatch(/<name>POP Centro<\/name><ExtendedData><Data name="neutra_tipo">/);
    expect(kml).toContain("<name>Rede &lt;Centro&gt;</name>");
    expect(kml).toContain("Poste da esquina &lt;A&amp;B&gt;");
    // Uma CTO sem área desenhada: a área atendida garante um polígono.
    expect(summary).toEqual({ polygons: 1, elements: 4 });
  });

  it("é um ZIP com um único doc.kml", () => {
    const { kmz } = buildKmz("Rede", project());
    const files = unzipSync(kmz);
    expect(Object.keys(files)).toEqual(["doc.kml"]);
    expect(strFromU8(files["doc.kml"])).toContain("<kml");
  });

  it("abre de novo no editor sem perder tipo, portas, splitter e fibras", () => {
    const placemarks = parseKml(buildKml("Rede", project()).kml);
    const classifications = placemarks.map(classifyPlacemark);
    expect(classifications.every((c) => c.explicit)).toBe(true);

    let id = 0;
    const { features, connectedCables } = buildFeatures(
      placemarks,
      classifications,
      (i) => classifications[i].kind,
      [],
      () => `n${++id}`,
    );
    const byName = Object.fromEntries(features.map((f) => [f.properties.name, f.properties]));
    expect(byName["POP Centro"].kind).toBe("pop");
    expect(byName["CEO-001"]).toMatchObject({ kind: "ceo", splitRatio: 8, notes: "Poste da esquina <A&B>" });
    expect(byName["DST-001"]).toMatchObject({ kind: "cable_distribution", fiberCount: 12, status: "planned" });
    expect(byName["CTO-001"].ports).toEqual([
      { index: 1, status: "in_use" },
      { index: 2, status: "free" },
      { index: 3, status: "free" },
      { index: 4, status: "defective" },
      { index: 5, status: "free" },
      { index: 6, status: "free" },
      { index: 7, status: "free", shared: true },
      { index: 8, status: "in_use", shared: true },
    ]);
    // A área atendida é marcada como gerada, para não se duplicar a cada publicação.
    const served = placemarks.find((p) => p.name === "Área atendida pela rede");
    expect(served?.data?.gerado_pelo_editor).toBe("area_atendida");
    // O cabo volta ligado à CEO e à CTO.
    expect(connectedCables).toBe(1);
  });
});
