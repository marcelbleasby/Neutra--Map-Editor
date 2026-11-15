import {
  CONNECTOR_LOSS_DB,
  FIBER_LOSS_DB_PER_KM,
  FUSION_LOSS_DB,
  SPLITTER_LOSS_DB,
  fiberPosition,
} from "./optics";
import type { Cable, Connection, Equipment, Fiber, Id, OpticalEndpoint, Port } from "./types";

/**
 * Grafo óptico: o que acontece dentro dos nós.
 *
 * Vértices são pontas de fibra e portas; arestas são conexões (fusão, conector,
 * cordão). Uma fibra tem duas pontas, uma em cada extremidade do cabo — por isso
 * toda conexão diz em que nó acontece.
 *
 * Este módulo é puro e ainda não tem tela: é a base do diagrama de fusões.
 */

export interface OpticalModel {
  cables: Cable[];
  equipment: Equipment[];
  ports: Port[];
  connections: Connection[];
}

/** Id estável da fibra `n` (contagem a partir de 1) de um cabo. */
export function fiberId(cableId: Id, n: number): Id {
  return `${cableId}#${n}`;
}

/** As fibras de um cabo, derivadas de `fiberCount` e `fibersPerTube`. */
export function generateFibers(cable: Cable): Fiber[] {
  return Array.from({ length: cable.fiberCount }, (_, i) => {
    const { tube, indexInTube } = fiberPosition(i + 1, cable.fibersPerTube);
    return { id: fiberId(cable.id, i + 1), cableId: cable.id, tubeIndex: tube, indexInTube };
  });
}

function cableOfFiber(id: Id, cables: Cable[]): Cable | undefined {
  const cableId = id.slice(0, id.lastIndexOf("#"));
  return cables.find((cable) => cable.id === cableId);
}

function sameEndpoint(a: OpticalEndpoint, b: OpticalEndpoint): boolean {
  if (a.type === "fiber" && b.type === "fiber") return a.fiberId === b.fiberId;
  if (a.type === "port" && b.type === "port") return a.portId === b.portId;
  return false;
}

function describe(endpoint: OpticalEndpoint): string {
  return endpoint.type === "fiber" ? `fibra ${endpoint.fiberId}` : `porta ${endpoint.portId}`;
}

/**
 * Quantas conexões uma ponta aceita no mesmo nó. Posição de DIO é passagem
 * (fibra atrás, cordão na frente), então aceita duas; o resto, uma.
 */
function capacity(endpoint: OpticalEndpoint, ports: Port[]): number {
  if (endpoint.type === "fiber") return 1;
  return ports.find((port) => port.id === endpoint.portId)?.role === "dio" ? 2 : 1;
}

export interface ConnectionIssue {
  connectionId: Id;
  message: string;
}

/** Confere as regras do grafo óptico. Lista vazia = consistente. */
export function validateConnections(model: OpticalModel): ConnectionIssue[] {
  const issues: ConnectionIssue[] = [];
  const usage = new Map<string, number>();

  for (const connection of model.connections) {
    const add = (message: string) => issues.push({ connectionId: connection.id, message });
    if (sameEndpoint(connection.a, connection.b)) add("Liga uma ponta a ela mesma");

    for (const endpoint of [connection.a, connection.b]) {
      if (endpoint.type === "fiber") {
        const cable = cableOfFiber(endpoint.fiberId, model.cables);
        if (!cable) add(`A ${describe(endpoint)} não pertence a nenhum cabo`);
        else if (cable.fromNodeId !== connection.nodeId && cable.toNodeId !== connection.nodeId) {
          add(`O cabo ${cable.name} não termina neste nó`);
        }
      } else {
        const port = model.ports.find((candidate) => candidate.id === endpoint.portId);
        const equipment = model.equipment.find((candidate) => candidate.id === port?.equipmentId);
        if (!port || !equipment) add(`A ${describe(endpoint)} não existe`);
        else if (equipment.nodeId !== connection.nodeId) add(`O equipamento ${equipment.name} não está neste nó`);
      }

      const key = `${connection.nodeId}|${endpoint.type}|${endpoint.type === "fiber" ? endpoint.fiberId : endpoint.portId}`;
      const count = (usage.get(key) ?? 0) + 1;
      usage.set(key, count);
      if (count > capacity(endpoint, model.ports)) add(`A ${describe(endpoint)} já está ligada neste nó`);
    }
  }
  return issues;
}

export interface TraceStep {
  nodeId: Id;
  endpoint: OpticalEndpoint;
}

export interface Trace {
  /** Chegou a uma porta PON. */
  complete: boolean;
  ponPortId?: Id;
  /** Onde o caminho parou, quando incompleto. */
  openAt?: TraceStep;
  steps: TraceStep[];
  lengthMeters: number;
  splitRatios: number[];
  lossDb: number;
}

const DEFAULT_CONNECTION_LOSS = {
  fusion: FUSION_LOSS_DB,
  connector: CONNECTOR_LOSS_DB,
  patch_cord: 2 * CONNECTOR_LOSS_DB,
};

/**
 * Segue o sinal de uma porta (tipicamente a porta de atendimento de uma CTO)
 * rio acima até a porta PON da OLT. É a resposta a "este assinante está em qual
 * PON?" e a base do cálculo de potência e da correlação de alarmes.
 */
export function traceToOlt(startPortId: Id, model: OpticalModel): Trace {
  const trace: Trace = { complete: false, steps: [], lengthMeters: 0, splitRatios: [], lossDb: 0 };
  const portById = new Map(model.ports.map((port) => [port.id, port]));
  const equipmentById = new Map(model.equipment.map((equipment) => [equipment.id, equipment]));

  const start = portById.get(startPortId);
  const startEquipment = start && equipmentById.get(start.equipmentId);
  if (!start || !startEquipment) return trace;

  let nodeId = startEquipment.nodeId;
  // O `as` impede o TypeScript de estreitar o tipo para "port": `cross` reatribui.
  let endpoint = { type: "port", portId: startPortId } as OpticalEndpoint;
  let arrivedBy: Id | undefined;

  const connectionAt = (at: Id, target: OpticalEndpoint, except?: Id) =>
    model.connections.find(
      (connection) =>
        connection.nodeId === at &&
        connection.id !== except &&
        (sameEndpoint(connection.a, target) || sameEndpoint(connection.b, target)),
    );

  /** Atravessa uma conexão; devolve falso se a ponta está solta. */
  const cross = (): boolean => {
    const connection = connectionAt(nodeId, endpoint, arrivedBy);
    if (!connection) {
      trace.openAt = { nodeId, endpoint };
      return false;
    }
    trace.lossDb += connection.lossDb ?? DEFAULT_CONNECTION_LOSS[connection.kind];
    endpoint = sameEndpoint(connection.a, endpoint) ? connection.b : connection.a;
    arrivedBy = connection.id;
    return true;
  };

  // O limite evita laço infinito se os dados tiverem um anel.
  for (let guard = 0; guard < 10_000; guard++) {
    // Cópia tipada: `endpoint` é reatribuído dentro de `cross`.
    const current: OpticalEndpoint = endpoint;
    trace.steps.push({ nodeId, endpoint: current });

    if (current.type === "port") {
      const port = portById.get(current.portId);
      const equipment = port && equipmentById.get(port.equipmentId);
      if (!port || !equipment) break;

      if (port.role === "pon") {
        trace.complete = true;
        trace.ponPortId = port.id;
        break;
      }

      if (port.role === "splitter_out" || port.role === "drop") {
        const input = model.ports.find(
          (candidate) => candidate.equipmentId === equipment.id && candidate.role === "splitter_in",
        );
        const ratio = equipment.splitRatio;
        if (!input || !ratio) {
          trace.openAt = { nodeId, endpoint: current };
          break;
        }
        trace.splitRatios.push(ratio);
        trace.lossDb += SPLITTER_LOSS_DB[ratio] ?? 0;
        endpoint = { type: "port", portId: input.id };
        arrivedBy = undefined;
        continue;
      }

      if (!cross()) break;
      continue;
    }

    // Fibra: percorre o cabo até a outra extremidade e procura a conexão lá.
    const cable = cableOfFiber(current.fiberId, model.cables);
    const farNodeId = cable && (cable.fromNodeId === nodeId ? cable.toNodeId : cable.fromNodeId);
    if (!cable || !farNodeId) {
      trace.openAt = { nodeId, endpoint: current };
      break;
    }
    trace.lengthMeters += cable.lengthMeters;
    trace.lossDb += (cable.lengthMeters / 1000) * FIBER_LOSS_DB_PER_KM;
    nodeId = farNodeId;
    arrivedBy = undefined;
    trace.steps.push({ nodeId, endpoint: current });
    if (!cross()) break;
  }

  // Do POP para a CTO, que é como se lê uma rede.
  trace.splitRatios.reverse();
  return trace;
}
