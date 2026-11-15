import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import { ELEMENTS } from "@/domain/catalog";
import type { ElementKind, Id, LifecycleStatus, PortStatus } from "@/domain/types";

/**
 * Porta de atendimento de uma CTO como o editor a enxerga hoje.
 *
 * Simplificação deliberada: no modelo completo (src/domain/types.ts) isto se
 * desdobra em Port + Lease (provedor) + Service (assinante). Enquanto não há
 * backend, o editor guarda o resumo direto nas propriedades da CTO.
 */
export interface CtoPort {
  index: number;
  status: PortStatus;
  providerId?: Id;
  customerName?: string;
}

/** Propriedades de uma feature do editor. `kind` decide quais opcionais se aplicam. */
export interface ElementProperties {
  kind: ElementKind;
  name: string;
  status: LifecycleStatus;
  notes?: string;
  // Cabos
  fromNodeId?: Id;
  toNodeId?: Id;
  fiberCount?: number;
  lengthMeters?: number;
  // CTO
  ports?: CtoPort[];
}

export type ElementGeometry = Point | LineString | Polygon;
export type ElementFeature = Feature<ElementGeometry, ElementProperties> & { id: Id };
export type ElementCollection = FeatureCollection<ElementGeometry, ElementProperties>;

export const EMPTY_COLLECTION: ElementCollection = { type: "FeatureCollection", features: [] };

const DEFAULT_FIBER_COUNT: Partial<Record<ElementKind, number>> = {
  cable_backbone: 48,
  cable_distribution: 12,
  cable_drop: 1,
};

export const CTO_PORT_OPTIONS = [8, 16] as const;

export function makeCtoPorts(count: number, previous: CtoPort[] = []): CtoPort[] {
  return Array.from(
    { length: count },
    (_, i) => previous[i] ?? { index: i + 1, status: "free" as const },
  );
}

/** Próximo nome livre para o tipo: CTO-001, CTO-002… */
export function nextName(kind: ElementKind, existing: ElementFeature[]): string {
  const { prefix } = ELEMENTS[kind];
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = existing.reduce((max, feature) => {
    const match = pattern.exec(feature.properties.name);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/** Propriedades iniciais de um elemento recém-desenhado. */
export function defaultProperties(kind: ElementKind, existing: ElementFeature[]): ElementProperties {
  const properties: ElementProperties = {
    kind,
    name: nextName(kind, existing),
    status: "planned",
  };
  const fiberCount = DEFAULT_FIBER_COUNT[kind];
  if (fiberCount) properties.fiberCount = fiberCount;
  if (kind === "cto") properties.ports = makeCtoPorts(8);
  return properties;
}

export interface NetworkSummary {
  countByKind: Partial<Record<ElementKind, number>>;
  cableMeters: number;
  ports: Record<PortStatus, number>;
}

export function summarize(features: ElementFeature[]): NetworkSummary {
  const summary: NetworkSummary = {
    countByKind: {},
    cableMeters: 0,
    ports: { free: 0, reserved: 0, in_use: 0, defective: 0 },
  };
  for (const { properties } of features) {
    summary.countByKind[properties.kind] = (summary.countByKind[properties.kind] ?? 0) + 1;
    summary.cableMeters += properties.lengthMeters ?? 0;
    for (const port of properties.ports ?? []) summary.ports[port.status] += 1;
  }
  return summary;
}
