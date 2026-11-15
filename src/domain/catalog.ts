import type { CableKind, ElementKind, LifecycleStatus, NodeKind, PortStatus } from "./types";

export type GeometryType = "Point" | "LineString" | "Polygon";

export interface ElementDefinition {
  kind: ElementKind;
  geometry: GeometryType;
  /** Nome exibido na interface. */
  label: string;
  /** Prefixo dos nomes gerados automaticamente (CTO-001, CEO-002…). */
  prefix: string;
  color: string;
  description: string;
  /** Um cabo pode terminar neste tipo de nó. */
  cableEndpoint?: boolean;
  /** O cabo passa por este tipo de nó sem ser aberto (poste, caixa, reserva). */
  passThrough?: boolean;
}

/**
 * Catálogo dos elementos que podem ser desenhados. É a única fonte de verdade
 * para paleta, estilos do mapa e nomes automáticos.
 */
export const ELEMENTS: Record<ElementKind, ElementDefinition> = {
  pop: {
    kind: "pop",
    geometry: "Point",
    label: "POP",
    prefix: "POP",
    color: "#7c3aed",
    description: "Central que abriga OLTs e DIOs",
    cableEndpoint: true,
  },
  ceo: {
    kind: "ceo",
    geometry: "Point",
    label: "CEO",
    prefix: "CEO",
    color: "#ea580c",
    description: "Caixa de emenda: fusões e splitters de 1º nível",
    cableEndpoint: true,
  },
  cto: {
    kind: "cto",
    geometry: "Point",
    label: "CTO",
    prefix: "CTO",
    color: "#16a34a",
    description: "Caixa de terminação: portas de atendimento",
    cableEndpoint: true,
  },
  pole: {
    kind: "pole",
    geometry: "Point",
    label: "Poste",
    prefix: "PST",
    color: "#64748b",
    description: "Ponto de fixação do cabo aéreo",
    passThrough: true,
  },
  chamber: {
    kind: "chamber",
    geometry: "Point",
    label: "Caixa subterrânea",
    prefix: "CS",
    color: "#78716c",
    description: "Caixa de passagem em rede subterrânea",
    passThrough: true,
  },
  reserve: {
    kind: "reserve",
    geometry: "Point",
    label: "Reserva técnica",
    prefix: "RT",
    color: "#0891b2",
    description: "Sobra de cabo para manutenção",
    passThrough: true,
  },
  subscriber: {
    kind: "subscriber",
    geometry: "Point",
    label: "Assinante",
    prefix: "ASN",
    color: "#2563eb",
    description: "Ponto de instalação do assinante",
    cableEndpoint: true,
  },
  cable_backbone: {
    kind: "cable_backbone",
    geometry: "LineString",
    label: "Cabo backbone",
    prefix: "BKB",
    color: "#dc2626",
    description: "Tronco entre POP e CEOs",
  },
  cable_distribution: {
    kind: "cable_distribution",
    geometry: "LineString",
    label: "Cabo distribuição",
    prefix: "DST",
    color: "#d97706",
    description: "Entre CEO e CTOs",
  },
  cable_drop: {
    kind: "cable_drop",
    geometry: "LineString",
    label: "Drop",
    prefix: "DRP",
    color: "#0284c7",
    description: "Da CTO até o assinante",
  },
  coverage_area: {
    kind: "coverage_area",
    geometry: "Polygon",
    label: "Área de cobertura",
    prefix: "AREA",
    color: "#9333ea",
    description: "Região atendida ou planejada",
  },
};

export const ELEMENT_KINDS = Object.keys(ELEMENTS) as ElementKind[];

export const PALETTE_GROUPS: { title: string; kinds: ElementKind[] }[] = [
  { title: "Equipamentos", kinds: ["pop", "ceo", "cto", "subscriber"] },
  { title: "Infraestrutura", kinds: ["pole", "chamber", "reserve"] },
  { title: "Cabos", kinds: ["cable_backbone", "cable_distribution", "cable_drop"] },
  { title: "Áreas", kinds: ["coverage_area"] },
];

export const STATUS_LABELS: Record<LifecycleStatus, string> = {
  planned: "Planejado",
  in_construction: "Em construção",
  active: "Ativo",
  decommissioned: "Desativado",
};

export const PORT_STATUS_LABELS: Record<PortStatus, string> = {
  free: "Livre",
  reserved: "Reservada",
  in_use: "Em uso",
  defective: "Defeito",
};

export const PORT_STATUS_COLORS: Record<PortStatus, string> = {
  free: "#e2e8f0",
  reserved: "#fbbf24",
  in_use: "#22c55e",
  defective: "#ef4444",
};

/**
 * Em que tipos de nó cada cabo pode terminar. Um drop liga exatamente uma CTO a
 * um assinante; os demais aceitam qualquer combinação dos tipos listados.
 */
export const CABLE_ENDPOINTS: Record<CableKind, NodeKind[]> = {
  cable_backbone: ["pop", "ceo"],
  cable_distribution: ["pop", "ceo", "cto"],
  cable_drop: ["cto", "subscriber"],
};

/** Razões de splitter aceitas em CEO (1º nível). 0 = caixa só de emenda. */
export const CEO_SPLIT_OPTIONS = [0, 2, 4, 8, 16] as const;

export function isCableKind(kind: ElementKind): kind is CableKind {
  return ELEMENTS[kind].geometry === "LineString";
}
