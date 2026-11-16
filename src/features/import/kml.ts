import { unzipSync } from "fflate";
import type { LineString, Point, Polygon, Position } from "geojson";

/** Um Placemark do KML, já com uma única geometria. */
export interface Placemark {
  name: string;
  description: string;
  /** Nomes das pastas que contêm o Placemark, da raiz para dentro. */
  folders: string[];
  geometry: Point | LineString | Polygon;
  /** Campos de `ExtendedData` (`Data` e `SimpleData`), por nome. */
  data?: Record<string, string>;
}

/** "lng,lat[,alt] lng,lat[,alt] …" → posições [lng, lat]; a altitude é descartada. */
function parseCoordinates(text: string | null | undefined): Position[] {
  const positions: Position[] = [];
  for (const tuple of (text ?? "").trim().split(/\s+/)) {
    const [lng, lat] = tuple.split(",").map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) positions.push([lng, lat]);
  }
  return positions;
}

/** Texto do primeiro filho direto com esse nome, ignorando o namespace. */
function childText(element: Element, localName: string): string {
  for (const child of Array.from(element.children)) {
    if (child.localName === localName) return (child.textContent ?? "").trim();
  }
  return "";
}

/**
 * Descendentes com esse nome, em ordem de documento, ignorando o namespace.
 * Percorre a árvore à mão: arquivos reais misturam prefixos (`ns0:Placemark`) e
 * nem todo ambiente aceita o curinga de `getElementsByTagNameNS`.
 */
function descendants(element: Element, localName: string): Element[] {
  const found: Element[] = [];
  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (child.localName === localName) found.push(child);
      visit(child);
    }
  };
  visit(element);
  return found;
}

/** `<Data name><value>` e `<SchemaData><SimpleData name>` do Placemark. */
function extendedData(placemark: Element): Record<string, string> {
  const data: Record<string, string> = {};
  for (const block of Array.from(placemark.children).filter((child) => child.localName === "ExtendedData")) {
    for (const item of descendants(block, "Data")) {
      const name = item.getAttribute("name");
      if (name) data[name] = childText(item, "value");
    }
    for (const item of descendants(block, "SimpleData")) {
      const name = item.getAttribute("name");
      if (name) data[name] = (item.textContent ?? "").trim();
    }
  }
  return data;
}

function folderPath(placemark: Element): string[] {
  const names: string[] = [];
  for (let parent = placemark.parentElement; parent; parent = parent.parentElement) {
    if (parent.localName !== "Folder" && parent.localName !== "Document") continue;
    const name = childText(parent, "name");
    if (name) names.unshift(name);
  }
  return names;
}

/**
 * Lê os Placemarks de um KML. Um Placemark com MultiGeometry vira um item por
 * geometria. Geometrias vazias ou degeneradas são descartadas.
 */
export function parseKml(text: string): Placemark[] {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  if (xml.getElementsByTagName("parsererror").length > 0) {
    throw new Error("O arquivo não é um KML válido.");
  }

  const placemarks: Placemark[] = [];
  for (const element of descendants(xml.documentElement, "Placemark")) {
    const base = {
      name: childText(element, "name"),
      description: childText(element, "description"),
      folders: folderPath(element),
      data: extendedData(element),
    };
    const coordinatesOf = (geometry: Element) =>
      parseCoordinates(descendants(geometry, "coordinates")[0]?.textContent);

    for (const geometry of descendants(element, "Point")) {
      const [position] = coordinatesOf(geometry);
      if (position) placemarks.push({ ...base, geometry: { type: "Point", coordinates: position } });
    }
    for (const geometry of descendants(element, "LineString")) {
      const coordinates = coordinatesOf(geometry);
      if (coordinates.length >= 2) placemarks.push({ ...base, geometry: { type: "LineString", coordinates } });
    }
    for (const geometry of descendants(element, "Polygon")) {
      const outer = descendants(geometry, "outerBoundaryIs")[0] ?? geometry;
      const ring = coordinatesOf(outer);
      if (ring.length >= 4) placemarks.push({ ...base, geometry: { type: "Polygon", coordinates: [ring] } });
    }
  }
  return placemarks;
}

function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Exportações antigas do Google Earth no Windows.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Texto KML de um arquivo .kml ou .kmz (KMZ é um ZIP com o KML dentro). */
export async function readKmlFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return decode(bytes);

  const entries = unzipSync(bytes, { filter: (entry) => entry.name.toLowerCase().endsWith(".kml") });
  const names = Object.keys(entries);
  // Por convenção o principal é doc.kml; se não houver, o primeiro.
  const main = names.find((name) => name.toLowerCase() === "doc.kml") ?? names[0];
  if (!main) throw new Error("O KMZ não contém nenhum arquivo KML.");
  return decode(entries[main]);
}
