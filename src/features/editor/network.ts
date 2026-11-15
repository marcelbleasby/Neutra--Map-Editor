import { CABLE_ENDPOINTS, ELEMENTS, isCableKind } from "@/domain/catalog";
import { GPON_B_PLUS_BUDGET_DB, pathLossDb } from "@/domain/optics";
import type { Id, NodeKind } from "@/domain/types";
import type { ElementFeature } from "./model";

/**
 * Análise do grafo físico: nós e cabos como estão no mapa.
 *
 * Responde três perguntas sem depender do diagrama de fusões:
 *   - por onde este ponto chega a um POP (`routes`);
 *   - o que deixa de funcionar se este elemento falhar (`impactOf`);
 *   - o que está errado ou incompleto no desenho (`issues`).
 *
 * O caminho óptico exato (qual fibra, qual porta PON) é outro nível e vive em
 * src/domain/opticalGraph.ts.
 */

/** Caminho físico de um nó até o POP mais próximo. */
export interface Route {
  popId: Id;
  /** Do POP até o nó, inclusive os dois. */
  nodeIds: Id[];
  /** Cabos percorridos, na mesma ordem. */
  cableIds: Id[];
  lengthMeters: number;
}

export interface Impact {
  /** Nós que perdem o caminho até o POP. */
  nodes: ElementFeature[];
  ctos: number;
  subscribers: number;
  portsInUse: number;
  /** Portas compartilhadas, reservadas ou em uso, nas CTOs afetadas. */
  sharedPorts: number;
}

export type IssueSeverity = "error" | "warning";

export interface Issue {
  elementId: Id;
  severity: IssueSeverity;
  message: string;
}

export interface NetworkAnalysis {
  routes: Map<Id, Route>;
  issues: Issue[];
  byId: Map<Id, ElementFeature>;
}

interface Edge {
  cableId: Id;
  to: Id;
  length: number;
}

/**
 * Caminho mais curto de cada nó até um POP (Dijkstra partindo de todos os POPs).
 * Redes FTTH são árvores, então na prática há um só caminho; o critério de menor
 * comprimento só decide quando o desenho tem anel.
 */
export function computeRoutes(features: ElementFeature[]): Map<Id, Route> {
  const adjacency = new Map<Id, Edge[]>();
  const link = (a: Id, edge: Edge) => adjacency.set(a, [...(adjacency.get(a) ?? []), edge]);
  for (const { id, properties } of features) {
    const { fromNodeId, toNodeId } = properties;
    if (!isCableKind(properties.kind) || !fromNodeId || !toNodeId) continue;
    const length = properties.lengthMeters ?? 0;
    link(fromNodeId, { cableId: id, to: toNodeId, length });
    link(toNodeId, { cableId: id, to: fromNodeId, length });
  }

  const routes = new Map<Id, Route>();
  const pending = new Map<Id, Route>();
  for (const feature of features) {
    if (feature.properties.kind === "pop") {
      pending.set(feature.id, { popId: feature.id, nodeIds: [feature.id], cableIds: [], lengthMeters: 0 });
    }
  }

  while (pending.size > 0) {
    let nearest: Route | undefined;
    let nearestId: Id | undefined;
    for (const [id, route] of pending) {
      if (!nearest || route.lengthMeters < nearest.lengthMeters) {
        nearest = route;
        nearestId = id;
      }
    }
    if (!nearest || nearestId === undefined) break;
    pending.delete(nearestId);
    routes.set(nearestId, nearest);

    for (const edge of adjacency.get(nearestId) ?? []) {
      if (routes.has(edge.to)) continue;
      const lengthMeters = nearest.lengthMeters + edge.length;
      const known = pending.get(edge.to);
      if (known && known.lengthMeters <= lengthMeters) continue;
      pending.set(edge.to, {
        popId: nearest.popId,
        nodeIds: [...nearest.nodeIds, edge.to],
        cableIds: [...nearest.cableIds, edge.cableId],
        lengthMeters,
      });
    }
  }
  return routes;
}

/** Nós cujo caminho até o POP passa pelo elemento (o próprio elemento fica de fora). */
export function downstreamOf(
  element: ElementFeature,
  features: ElementFeature[],
  routes: Map<Id, Route>,
): ElementFeature[] {
  const { kind } = element.properties;
  let cableIds: Id[] = [];
  if (isCableKind(kind)) {
    cableIds = [element.id];
  } else if (ELEMENTS[kind].passThrough) {
    // Um poste derrubado leva junto todos os cabos que passam por ele.
    cableIds = features
      .filter((feature) => feature.properties.viaNodeIds?.includes(element.id))
      .map((feature) => feature.id);
  }

  return features.filter((feature) => {
    if (feature.id === element.id) return false;
    const route = routes.get(feature.id);
    if (!route) return false;
    return route.nodeIds.includes(element.id) || cableIds.some((id) => route.cableIds.includes(id));
  });
}

/** O que deixa de funcionar se o elemento falhar. */
export function impactOf(element: ElementFeature, features: ElementFeature[], routes: Map<Id, Route>): Impact {
  const nodes = downstreamOf(element, features, routes);
  // A própria CTO também conta: se ela cai, as portas dela caem.
  const affected = element.properties.kind === "cto" ? [element, ...nodes] : nodes;
  let sharedPorts = 0;
  let portsInUse = 0;
  for (const { properties } of affected) {
    for (const port of properties.ports ?? []) {
      if (port.status === "in_use") portsInUse += 1;
      if (port.shared && port.status !== "free") sharedPorts += 1;
    }
  }
  return {
    nodes,
    ctos: affected.filter((feature) => feature.properties.kind === "cto").length,
    subscribers: affected.filter((feature) => feature.properties.kind === "subscriber").length,
    portsInUse,
    sharedPorts,
  };
}

export interface LossEstimate {
  lossDb: number;
  /** Folga em relação ao orçamento GPON B+; negativa = fora do orçamento. */
  marginDb: number;
  /** Divisão total até o nó (ex.: 64 para 1:8 + 1:8). */
  split: number;
}

/**
 * Atenuação estimada do POP até o nó, a partir do que o mapa sabe: comprimento
 * dos cabos, splitter de cada CEO no caminho e o splitter da CTO de destino.
 * Conta uma emenda por caixa atravessada e dois conectores (POP e CTO).
 *
 * É estimativa de projeto. O valor exato depende das fusões reais
 * (`traceToOlt` em src/domain/opticalGraph.ts).
 */
export function estimateLoss(route: Route, byId: Map<Id, ElementFeature>): LossEstimate {
  const splitRatios: number[] = [];
  for (const nodeId of route.nodeIds) {
    const properties = byId.get(nodeId)?.properties;
    if (properties?.kind === "ceo" && properties.splitRatio) splitRatios.push(properties.splitRatio);
    if (properties?.kind === "cto" && properties.ports?.length) splitRatios.push(properties.ports.length);
  }
  const lossDb = pathLossDb({
    lengthMeters: route.lengthMeters,
    splitRatios,
    fusions: route.nodeIds.length - 1,
    connectors: 2,
  });
  return {
    lossDb,
    marginDb: GPON_B_PLUS_BUDGET_DB - lossDb,
    split: splitRatios.reduce((product, ratio) => product * ratio, 1),
  };
}

const NEEDS_ROUTE: NodeKind[] = ["ceo", "cto", "subscriber"];

function listKinds(kinds: NodeKind[]): string {
  return kinds.map((kind) => ELEMENTS[kind].label).join(", ");
}

/** Erros e pendências do desenho. Não bloqueiam a edição: orientam a correção. */
export function findIssues(
  features: ElementFeature[],
  routes: Map<Id, Route>,
  byId: Map<Id, ElementFeature>,
): Issue[] {
  const issues: Issue[] = [];
  const namesSeen = new Map<string, Id>();

  for (const feature of features) {
    const { id, properties } = feature;
    const { kind } = properties;
    const add = (severity: IssueSeverity, message: string) => issues.push({ elementId: id, severity, message });

    const nameKey = `${kind}:${properties.name.trim().toLowerCase()}`;
    if (namesSeen.has(nameKey)) add("warning", `Nome repetido: ${properties.name}`);
    else namesSeen.set(nameKey, id);

    if (isCableKind(kind)) {
      const ends = [byId.get(properties.fromNodeId ?? ""), byId.get(properties.toNodeId ?? "")];
      if (!ends[0] || !ends[1]) {
        add("warning", ends[0] || ends[1] ? "Uma ponta do cabo está solta" : "Cabo sem ligação nas duas pontas");
      }
      const allowed = CABLE_ENDPOINTS[kind];
      const endKinds = ends.flatMap((end) => (end ? [end.properties.kind as NodeKind] : []));
      const invalid = endKinds.find((endKind) => !allowed.includes(endKind));
      if (invalid) {
        add("error", `${ELEMENTS[kind].label} não termina em ${ELEMENTS[invalid].label} (aceita: ${listKinds(allowed)})`);
      } else if (kind === "cable_drop" && endKinds.length === 2 && endKinds[0] === endKinds[1]) {
        add("error", "Drop liga uma CTO a um assinante");
      }
      continue;
    }

    const route = routes.get(id);
    if (NEEDS_ROUTE.includes(kind as NodeKind) && !route) {
      add("warning", "Sem caminho até um POP");
    }
    if (kind === "cto" && route) {
      const { lossDb, marginDb } = estimateLoss(route, byId);
      if (marginDb < 0) {
        add("error", `Atenuação estimada de ${lossDb.toFixed(1)} dB passa do orçamento de ${GPON_B_PLUS_BUDGET_DB} dB`);
      }
    }
    if (kind === "cto") {
      const drops = features.filter(
        (other) =>
          other.properties.kind === "cable_drop" &&
          (other.properties.fromNodeId === id || other.properties.toNodeId === id),
      ).length;
      const ports = properties.ports?.length ?? 0;
      if (drops > ports) add("error", `${drops} drops para ${ports} portas`);
    }
  }
  return issues;
}

export function analyzeNetwork(features: ElementFeature[]): NetworkAnalysis {
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  const routes = computeRoutes(features);
  return { routes, byId, issues: findIssues(features, routes, byId) };
}
