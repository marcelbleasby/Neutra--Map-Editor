import { strToU8, zipSync } from "fflate";
import type { Position } from "geojson";
import { ELEMENTS, isCableKind } from "@/domain/catalog";
import type { ElementKind } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import { coverageFromCtos } from "@/features/neutral/offer";
import { countPorts } from "@/features/neutral/neutral";
import { ASSET_SCHEMA, FIELDS } from "./fields";

/**
 * Gera o KMZ que vira uma nova versão de cobertura na geo.
 *
 * - Cada elemento leva o `asset_type` da geo, no esquema `neutra-assets-v1`, para
 *   ser classificado como declarado e não adivinhado.
 * - Os demais dados do editor (tipo detalhado, portas, fibras) vão em `Data`, para
 *   o arquivo poder ser aberto de novo no editor sem perda.
 * - Só polígono dá cobertura na geo. O arquivo leva as áreas desenhadas e a **área
 *   atendida pela rede**: o raio de atendimento em volta de cada CTO. É dentro dela
 *   que a cobertura de uma oferta pode ser montada.
 */

const ASSET_TYPE: Partial<Record<ElementKind, string>> = {
  cto: "cto",
  ceo: "splice_closure",
  pole: "pole",
  cable_backbone: "fiber_cable",
  cable_distribution: "fiber_cable",
  cable_drop: "fiber_cable",
  coverage_area: "coverage_area",
};

const FOLDER_ORDER: ElementKind[] = [
  "pop",
  "ceo",
  "cto",
  "subscriber",
  "pole",
  "chamber",
  "reserve",
  "cable_backbone",
  "cable_distribution",
  "cable_drop",
  "coverage_area",
];

function xml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function coordinates(positions: Position[]): string {
  return positions.map(([lng, lat]) => `${lng},${lat},0`).join(" ");
}

function geometryXml(feature: ElementFeature): string {
  const { geometry } = feature;
  if (geometry.type === "Point") return `<Point><coordinates>${coordinates([geometry.coordinates])}</coordinates></Point>`;
  if (geometry.type === "LineString") {
    return `<LineString><tessellate>1</tessellate><coordinates>${coordinates(geometry.coordinates)}</coordinates></LineString>`;
  }
  return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates(geometry.coordinates[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
}

function portList(indexes: number[]): string {
  return indexes.join(",");
}

/** Campos `Data` do elemento: o que o editor precisa para reabrir o arquivo. */
function editorData(feature: ElementFeature, nameOf: (id?: string) => string | undefined): [string, string][] {
  const { properties } = feature;
  const data: [string, string][] = [
    [FIELDS.kind, properties.kind],
    [FIELDS.status, properties.status],
  ];
  if (isCableKind(properties.kind)) {
    if (properties.fiberCount) data.push([FIELDS.fibers, String(properties.fiberCount)]);
    if (properties.lengthMeters) data.push([FIELDS.lengthMeters, String(properties.lengthMeters)]);
    const from = nameOf(properties.fromNodeId);
    const to = nameOf(properties.toNodeId);
    if (from) data.push([FIELDS.from, from]);
    if (to) data.push([FIELDS.to, to]);
  }
  if (properties.kind === "ceo" && properties.splitRatio) data.push([FIELDS.split, String(properties.splitRatio)]);
  if (properties.kind === "cto" && properties.ports) {
    const ports = properties.ports;
    const where = (test: (port: (typeof ports)[number]) => boolean) => portList(ports.filter(test).map((port) => port.index));
    data.push(
      [FIELDS.ports, String(ports.length)],
      [FIELDS.sharedPorts, where((port) => port.shared === true)],
      [FIELDS.busyPorts, where((port) => port.status === "in_use")],
      [FIELDS.reservedPorts, where((port) => port.status === "reserved")],
      [FIELDS.defectivePorts, where((port) => port.status === "defective")],
      [FIELDS.sharedFree, String(countPorts(ports).sharedFree)],
    );
  }
  return data;
}

function placemarkXml(
  feature: ElementFeature,
  nameOf: (id?: string) => string | undefined,
  extra: [string, string][] = [],
): string {
  const assetType = ASSET_TYPE[feature.properties.kind];
  const schemaData = assetType
    ? `<SchemaData schemaUrl="#${ASSET_SCHEMA}"><SimpleData name="${FIELDS.assetType}">${assetType}</SimpleData></SchemaData>`
    : "";
  const data = [...editorData(feature, nameOf), ...extra]
    .filter(([, value]) => value !== "")
    .map(([name, value]) => `<Data name="${name}"><value>${xml(value)}</value></Data>`)
    .join("");
  const description = feature.properties.notes ? `<description>${xml(feature.properties.notes)}</description>` : "";
  return `<Placemark id="${xml(feature.id)}"><name>${xml(feature.properties.name)}</name>${description}<ExtendedData>${schemaData}${data}</ExtendedData>${geometryXml(feature)}</Placemark>`;
}

/** Área atendida pela rede: o raio de atendimento em volta de cada CTO. */
export function servedArea(features: ElementFeature[]): ElementFeature[] {
  const ctos = features.filter((feature) => feature.properties.kind === "cto" && feature.geometry.type === "Point");
  return coverageFromCtos(ctos.map((cto) => cto.geometry.coordinates as Position)).map((geometry, index, all) => ({
    type: "Feature",
    id: `area-atendida-${index + 1}`,
    geometry,
    properties: {
      kind: "coverage_area",
      name: all.length === 1 ? "Área atendida pela rede" : `Área atendida pela rede ${index + 1}`,
      status: "active",
      notes: "Gerada pelo editor: raio de atendimento em volta de cada CTO.",
    },
  }));
}

export interface KmlSummary {
  /** Polígonos no arquivo: sem nenhum, a versão não dá cobertura. */
  polygons: number;
  elements: number;
}

export function buildKml(projectName: string, features: ElementFeature[]): { kml: string; summary: KmlSummary } {
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  const nameOf = (id?: string) => (id ? byId.get(id)?.properties.name : undefined);
  const served = servedArea(features);

  const folders = FOLDER_ORDER.map((kind) => {
    const items = features.filter((feature) => feature.properties.kind === kind);
    if (items.length === 0) return "";
    return `<Folder><name>${xml(ELEMENTS[kind].label)}</name>${items.map((item) => placemarkXml(item, nameOf)).join("")}</Folder>`;
  }).join("");
  const servedFolder = served.length
    ? `<Folder><name>Área atendida pela rede</name>${served.map((item) => placemarkXml(item, nameOf, [[FIELDS.generated, "area_atendida"]])).join("")}</Folder>`
    : "";

  const kml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(projectName)}</name>` +
    `<Schema name="${ASSET_SCHEMA}" id="${ASSET_SCHEMA}"><SimpleField name="${FIELDS.assetType}" type="string"/></Schema>` +
    folders +
    servedFolder +
    `</Document></kml>\n`;

  const drawnAreas = features.filter((feature) => feature.geometry.type === "Polygon").length;
  return { kml, summary: { polygons: drawnAreas + served.length, elements: features.length } };
}

/** KMZ = ZIP com um único `doc.kml`, como a geo exige. */
export function buildKmz(projectName: string, features: ElementFeature[]): { kmz: Uint8Array; summary: KmlSummary } {
  const { kml, summary } = buildKml(projectName, features);
  return { kmz: zipSync({ "doc.kml": strToU8(kml) }, { level: 6 }), summary };
}

/** Limite de tamanho do KMZ na geo. */
export const MAX_KMZ_BYTES = 50 * 1024 * 1024;
