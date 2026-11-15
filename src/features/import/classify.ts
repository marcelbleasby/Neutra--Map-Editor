import { ELEMENTS } from "@/domain/catalog";
import type { ElementKind } from "@/domain/types";
import type { Placemark } from "./kml";

/**
 * Reconhece o tipo de elemento de rede de um Placemark pelo nome e pelas pastas.
 *
 * As regras vieram dos nomes reais do conjunto de dados do repositório
 * `ml-neutramais-kml-kmz` (145 mil Placemarks de 12 arquivos de operadoras).
 * Detalhes em docs/11-fluxos-de-entrada.md.
 */

export interface Classification {
  /** Tipo reconhecido; `null` quando o nome não diz nada. */
  kind: ElementKind | null;
  /** Fibras do cabo, quando o nome informa ("12FO", "Cabo 72"). */
  fiberCount?: number;
  /** Portas da CTO, quando a descrição informa ("Portas: 16"). */
  portCount?: number;
}

/** Maiúsculas, sem acento e com separadores virando espaço. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** A ordem importa: a primeira regra que casar decide. */
const POINT_RULES: [RegExp, ElementKind][] = [
  [/\b(RT|RESERVA( TECNICA)?)\b/, "reserve"],
  [/\b(CTO|NAP|CAIXA DE ATENDIMENTO|TERMINACAO)\b/, "cto"],
  [/\b(CEO|EMENDA|CX EMENDA)\b/, "ceo"],
  [/\b(POP|OLT|CENTRAL|HEADEND|DATACENTER|DATA CENTER)\b/, "pop"],
  [/\b(POSTE|PST)\b|^P \d+$/, "pole"],
  [/\b(CS|SUBTERRANEA|CAIXA DE PASSAGEM|CP)\b/, "chamber"],
  [/\b(CLIENTE|ASSINANTE|ONU|ONT)\b/, "customer"],
];

const BACKBONE = /\b(BACKBONE|TRONCO|FEEDER|ANEL|INTERLIGACAO|BKB)\b/;
const DROP = /\bDROP\b/;

function firstMatch(text: string, rules: [RegExp, ElementKind][]): ElementKind | null {
  for (const [pattern, kind] of rules) if (pattern.test(text)) return kind;
  return null;
}

function parseFiberCount(name: string): number | undefined {
  const match = /\b(\d{1,3}) ?(FO|FIBRAS?)\b/.exec(name) ?? /\bCABO (\d{1,3})\b/.exec(name);
  const count = match ? Number(match[1]) : NaN;
  return count >= 1 && count <= 288 ? count : undefined;
}

function classifyLine(name: string, folders: string): Classification {
  const fiberCount = parseFiberCount(name);
  for (const text of [name, folders]) {
    if (DROP.test(text)) return { kind: "cable_drop", fiberCount };
    if (BACKBONE.test(text)) return { kind: "cable_backbone", fiberCount };
    // "CEO-…-CTO-…" e "CTO-…-CTO-…" são distribuição; só CEO/POP nas pontas, tronco.
    if (/\bCTO\b/.test(text)) return { kind: "cable_distribution", fiberCount };
    if (/\b(CEO|POP)\b.*\b(CEO|POP)\b/.test(text)) return { kind: "cable_backbone", fiberCount };
  }
  return { kind: null, fiberCount };
}

export function classifyPlacemark(placemark: Placemark): Classification {
  const name = normalize(placemark.name);
  const folders = normalize(placemark.folders.join(" "));

  if (placemark.geometry.type === "Polygon") return { kind: "coverage_area" };
  if (placemark.geometry.type === "LineString") return classifyLine(name, folders);

  const kind = firstMatch(name, POINT_RULES) ?? firstMatch(folders, POINT_RULES);
  const ports = /\bPORTAS? (\d{1,2})\b/.exec(normalize(placemark.description));
  return { kind, portCount: kind === "cto" && ports ? Number(ports[1]) : undefined };
}

/** Um grupo de Placemarks que o usuário decide em conjunto na tela de importação. */
export interface ImportGroup {
  key: string;
  label: string;
  geometry: Placemark["geometry"]["type"];
  /** Tipo sugerido; `null` = ignorar. */
  suggested: ElementKind | null;
  /** Tipos que essa geometria pode virar. */
  options: ElementKind[];
  examples: string[];
  indexes: number[];
}

const GEOMETRY_LABEL = { Point: "Pontos", LineString: "Linhas", Polygon: "Polígonos" } as const;

/** Primeira palavra do nome: agrupa "KM 12", "KM 13"… num grupo só. */
function leadingWord(name: string): string {
  const word = /^[A-Z]+/.exec(normalize(name))?.[0];
  if (word) return word;
  return name.trim() ? "numerados" : "sem nome";
}

/**
 * Agrupa os Placemarks para revisão: os reconhecidos por tipo, os demais pela
 * primeira palavra do nome. Linhas não reconhecidas são sugeridas como cabo de
 * distribuição (em KML de rede, linha quase sempre é cabo); pontos não
 * reconhecidos são sugeridos como "ignorar".
 */
export function groupPlacemarks(placemarks: Placemark[], classifications: Classification[]): ImportGroup[] {
  const groups = new Map<string, ImportGroup>();
  placemarks.forEach((placemark, index) => {
    const { kind } = classifications[index];
    const geometry = placemark.geometry.type;
    const word = kind ? "" : leadingWord(placemark.name);
    const key = kind ?? `${geometry}:${word}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: kind ? ELEMENTS[kind].label : `${GEOMETRY_LABEL[geometry]} "${word}"`,
        geometry,
        suggested: kind ?? (geometry === "LineString" ? "cable_distribution" : null),
        options: (Object.keys(ELEMENTS) as ElementKind[]).filter((option) => ELEMENTS[option].geometry === geometry),
        examples: [],
        indexes: [],
      };
      groups.set(key, group);
    }
    group.indexes.push(index);
    if (group.examples.length < 3 && placemark.name && !group.examples.includes(placemark.name)) {
      group.examples.push(placemark.name);
    }
  });
  // Reconhecidos primeiro; dentro de cada bloco, os maiores primeiro.
  return [...groups.values()].sort(
    (a, b) => Number(b.key in ELEMENTS) - Number(a.key in ELEMENTS) || b.indexes.length - a.indexes.length,
  );
}
