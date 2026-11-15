import { isCableKind } from "@/domain/catalog";
import { FIBER_COLORS, fiberPosition } from "@/domain/optics";
import { fiberId, traceToOlt, validateConnections, type OpticalModel, type Trace } from "@/domain/opticalGraph";
import type { Cable, Connection, ConnectionKind, Equipment, Id, OpticalEndpoint, Port } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";

/**
 * O que o diagrama de ligações guarda por projeto: equipamentos cadastrados à
 * mão, suas portas e as ligações. Cabos e fibras não ficam aqui — vêm do mapa.
 */
export interface OpticalData {
  equipment: Equipment[];
  ports: Port[];
  connections: Connection[];
}

export const EMPTY_OPTICAL: OpticalData = { equipment: [], ports: [], connections: [] };

/** Fibras por tubo usadas para numerar e colorir (padrão de mercado: 12). */
export const FIBERS_PER_TUBE = 12;

export function endpointKey(endpoint: OpticalEndpoint): string {
  return endpoint.type === "fiber" ? `f:${endpoint.fiberId}` : `p:${endpoint.portId}`;
}

function toCable(feature: ElementFeature, projectId: Id): Cable {
  const { properties } = feature;
  return {
    id: feature.id,
    projectId,
    name: properties.name,
    status: properties.status,
    kind: properties.kind as Cable["kind"],
    path: [],
    fromNodeId: properties.fromNodeId,
    toNodeId: properties.toNodeId,
    fiberCount: properties.fiberCount ?? 1,
    fibersPerTube: FIBERS_PER_TUBE,
    lengthMeters: properties.lengthMeters ?? 0,
  };
}

function splitterPorts(equipmentId: Id, ratio: number, outRole: Port["role"]): Port[] {
  return [
    { id: `${equipmentId}:in`, equipmentId, role: "splitter_in", index: 1, status: "free" },
    ...Array.from({ length: ratio }, (_, i): Port => ({
      id: `${equipmentId}:out:${i + 1}`,
      equipmentId,
      role: outRole,
      index: i + 1,
      status: "free",
    })),
  ];
}

/**
 * Splitters que já estão descritos nas propriedades do mapa e por isso não são
 * cadastrados de novo: o da CTO (uma saída por porta de atendimento) e o de 1º
 * nível da CEO. Os ids são derivados do nó, então as ligações sobrevivem a
 * qualquer recarga.
 */
function derivedEquipment(features: ElementFeature[], projectId: Id): Pick<OpticalData, "equipment" | "ports"> {
  const equipment: Equipment[] = [];
  const ports: Port[] = [];
  for (const { id, properties } of features) {
    const ratio =
      properties.kind === "cto" ? properties.ports?.length : properties.kind === "ceo" ? properties.splitRatio : 0;
    if (!ratio) continue;
    const equipmentId = `${id}:spl`;
    equipment.push({
      id: equipmentId,
      projectId,
      nodeId: id,
      kind: "splitter",
      name: properties.kind === "cto" ? "Splitter de atendimento" : "Splitter de 1º nível",
      splitRatio: ratio as Equipment["splitRatio"],
    });
    const created = splitterPorts(equipmentId, ratio, properties.kind === "cto" ? "drop" : "splitter_out");
    if (properties.kind === "cto") {
      for (const port of created) {
        if (port.role === "drop") port.status = properties.ports?.[port.index - 1]?.status ?? "free";
      }
    }
    ports.push(...created);
  }
  return { equipment, ports };
}

export function isDerived(equipmentId: Id): boolean {
  return equipmentId.endsWith(":spl");
}

/**
 * Junta mapa e diagrama num modelo óptico completo. Descarta o que ficou órfão:
 * equipamento de nó excluído, ligação de fibra ou porta que não existe mais.
 */
export function buildOpticalModel(features: ElementFeature[], data: OpticalData, projectId: Id): OpticalModel {
  const nodeIds = new Set(features.filter((f) => f.geometry.type === "Point").map((f) => f.id));
  const cables = features.filter((f) => isCableKind(f.properties.kind)).map((f) => toCable(f, projectId));
  const derived = derivedEquipment(features, projectId);

  const equipment = [...derived.equipment, ...data.equipment.filter((item) => nodeIds.has(item.nodeId))];
  const equipmentIds = new Set(equipment.map((item) => item.id));
  const ports = [...derived.ports, ...data.ports.filter((port) => equipmentIds.has(port.equipmentId))];
  const portIds = new Set(ports.map((port) => port.id));
  const fiberCounts = new Map(cables.map((cable) => [cable.id, cable.fiberCount]));

  const exists = (endpoint: OpticalEndpoint) => {
    if (endpoint.type === "port") return portIds.has(endpoint.portId);
    const split = endpoint.fiberId.lastIndexOf("#");
    const count = fiberCounts.get(endpoint.fiberId.slice(0, split)) ?? 0;
    return Number(endpoint.fiberId.slice(split + 1)) <= count;
  };
  const connections = data.connections.filter(
    (connection) => nodeIds.has(connection.nodeId) && exists(connection.a) && exists(connection.b),
  );
  return { cables, equipment, ports, connections };
}

export type EquipmentSpec =
  | { kind: "olt"; size: number }
  | { kind: "dio"; size: number }
  | { kind: "splitter"; size: number };

const EQUIPMENT_PREFIX = { olt: "OLT", dio: "DIO", splitter: "SPL", onu: "ONU" } as const;

/** Opções oferecidas no diagrama, por tipo de nó. A CTO só tem o splitter derivado. */
export const EQUIPMENT_OPTIONS: Record<string, { kind: EquipmentSpec["kind"]; label: string; sizes: number[] }[]> = {
  pop: [
    { kind: "olt", label: "OLT (portas PON)", sizes: [8, 16] },
    { kind: "dio", label: "DIO (posições)", sizes: [12, 24, 48] },
    { kind: "splitter", label: "Splitter", sizes: [2, 4, 8, 16] },
  ],
  ceo: [{ kind: "splitter", label: "Splitter", sizes: [2, 4, 8, 16] }],
};

export function addEquipment(
  data: OpticalData,
  nodeId: Id,
  spec: EquipmentSpec,
  projectId: Id,
  newId: () => string = () => crypto.randomUUID(),
): OpticalData {
  const id = newId();
  const sameKind = data.equipment.filter((item) => item.nodeId === nodeId && item.kind === spec.kind).length;
  const equipment: Equipment = {
    id,
    projectId,
    nodeId,
    kind: spec.kind,
    name: `${EQUIPMENT_PREFIX[spec.kind]}-${sameKind + 1}`,
    splitRatio: spec.kind === "splitter" ? (spec.size as Equipment["splitRatio"]) : undefined,
  };
  const ports: Port[] =
    spec.kind === "splitter"
      ? splitterPorts(id, spec.size, "splitter_out")
      : Array.from({ length: spec.size }, (_, i): Port => ({
          id: `${id}:${spec.kind === "olt" ? "pon" : "dio"}:${i + 1}`,
          equipmentId: id,
          role: spec.kind === "olt" ? "pon" : "dio",
          index: i + 1,
          status: "free",
        }));
  return { ...data, equipment: [...data.equipment, equipment], ports: [...data.ports, ...ports] };
}

export function removeEquipment(data: OpticalData, equipmentId: Id): OpticalData {
  const portIds = new Set(data.ports.filter((port) => port.equipmentId === equipmentId).map((port) => port.id));
  const touches = (endpoint: OpticalEndpoint) => endpoint.type === "port" && portIds.has(endpoint.portId);
  return {
    equipment: data.equipment.filter((item) => item.id !== equipmentId),
    ports: data.ports.filter((port) => !portIds.has(port.id)),
    connections: data.connections.filter((connection) => !touches(connection.a) && !touches(connection.b)),
  };
}

function connectionKind(a: OpticalEndpoint, b: OpticalEndpoint, ports: Port[]): ConnectionKind {
  if (a.type === "port" && b.type === "port") return "patch_cord";
  if (a.type === "fiber" && b.type === "fiber") return "fusion";
  const port = ports.find((candidate) => candidate.id === (a.type === "port" ? a.portId : (b as { portId: Id }).portId));
  // Fibra chega ao splitter por fusão; ao DIO e à OLT, por conector.
  return port?.role === "dio" || port?.role === "pon" ? "connector" : "fusion";
}

export const CONNECTION_LABELS: Record<ConnectionKind, string> = {
  fusion: "fusão",
  connector: "conector",
  patch_cord: "cordão",
};

/** Liga duas pontas num nó. Devolve o erro, em vez de gravar, se a regra não permite. */
export function connect(
  model: OpticalModel,
  data: OpticalData,
  nodeId: Id,
  a: OpticalEndpoint,
  b: OpticalEndpoint,
  projectId: Id,
  newId: () => string = () => crypto.randomUUID(),
): { data: OpticalData } | { error: string } {
  const connection: Connection = {
    id: newId(),
    projectId,
    nodeId,
    kind: connectionKind(a, b, model.ports),
    a,
    b,
  };
  const issue = validateConnections({ ...model, connections: [...model.connections, connection] }).find(
    (candidate) => candidate.connectionId === connection.id,
  );
  if (issue) {
    // A regra fala em ids; aqui trocamos pelo nome que o usuário vê no diagrama.
    let message = issue.message;
    for (const endpoint of [a, b]) {
      const raw = endpoint.type === "fiber" ? `fibra ${endpoint.fiberId}` : `porta ${endpoint.portId}`;
      message = message.replace(`A ${raw}`, endpointLabel(endpoint, model)).replace(raw, endpointLabel(endpoint, model));
    }
    return { error: message };
  }
  return { data: { ...data, connections: [...data.connections, connection] } };
}

export function disconnect(data: OpticalData, connectionId: Id): OpticalData {
  return { ...data, connections: data.connections.filter((connection) => connection.id !== connectionId) };
}

const PORT_LABEL: Record<Port["role"], string> = {
  pon: "PON",
  uplink: "Uplink",
  splitter_in: "Entrada",
  splitter_out: "Saída",
  dio: "Posição",
  drop: "Porta",
  onu_pon: "PON",
};

export function portLabel(port: Port): string {
  return port.role === "splitter_in" ? PORT_LABEL[port.role] : `${PORT_LABEL[port.role]} ${port.index}`;
}

/** Tubo, posição e cores ABNT da fibra `n` de um cabo. */
export function fiberInfo(n: number) {
  const { tube, indexInTube } = fiberPosition(n, FIBERS_PER_TUBE);
  return {
    tube,
    indexInTube,
    color: FIBER_COLORS[(indexInTube - 1) % FIBER_COLORS.length],
    tubeColor: FIBER_COLORS[(tube - 1) % FIBER_COLORS.length],
  };
}

/** Nome legível de uma ponta: "CEO-001 › DST-002 fibra 3" ou "OLT-1 PON 2". */
export function endpointLabel(endpoint: OpticalEndpoint, model: OpticalModel): string {
  if (endpoint.type === "fiber") {
    const split = endpoint.fiberId.lastIndexOf("#");
    const cable = model.cables.find((candidate) => candidate.id === endpoint.fiberId.slice(0, split));
    return `${cable?.name ?? "cabo"} fibra ${endpoint.fiberId.slice(split + 1)}`;
  }
  const port = model.ports.find((candidate) => candidate.id === endpoint.portId);
  const equipment = model.equipment.find((candidate) => candidate.id === port?.equipmentId);
  return port && equipment ? `${equipment.name} ${portLabel(port).toLowerCase()}` : "porta";
}

/** Frase que resume um rastreamento, para o painel e para o diagrama. */
export function describeTrace(trace: Trace, model: OpticalModel, nameOf: (nodeId: Id) => string): string {
  if (trace.complete && trace.ponPortId) {
    const pon = model.ports.find((port) => port.id === trace.ponPortId);
    const olt = model.equipment.find((equipment) => equipment.id === pon?.equipmentId);
    const split = trace.splitRatios.reduce((product, ratio) => product * ratio, 1);
    const km = (trace.lengthMeters / 1000).toFixed(2).replace(".", ",");
    const loss = trace.lossDb.toFixed(1).replace(".", ",");
    return `Chega a ${olt?.name ?? "OLT"} PON ${pon?.index ?? "?"} em ${nameOf(olt?.nodeId ?? "")}: ${km} km, divisão 1:${split}, ${loss} dB.`;
  }
  if (trace.openAt) {
    return `Interrompido em ${nameOf(trace.openAt.nodeId)}: ${endpointLabel(trace.openAt.endpoint, model)} sem ligação.`;
  }
  return "Sem caminho.";
}

/**
 * Rastreamento a partir de uma porta de atendimento da CTO. Todas as portas
 * compartilham o caminho, então a primeira representa a caixa — e, partindo dela,
 * o splitter da própria CTO entra na conta.
 */
export function traceCto(ctoId: Id, model: OpticalModel): Trace | null {
  const first = `${ctoId}:spl:out:1`;
  if (!model.ports.some((port) => port.id === first)) return null;
  return traceToOlt(first, model);
}

export function nodeHasDiagram(feature: ElementFeature): boolean {
  return ["pop", "ceo", "cto"].includes(feature.properties.kind);
}

export function cablesAt(nodeId: Id, model: OpticalModel): Cable[] {
  return model.cables.filter((cable) => cable.fromNodeId === nodeId || cable.toNodeId === nodeId);
}

export { fiberId };
