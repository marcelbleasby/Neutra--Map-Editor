/**
 * Modelo de domínio do Neutra Map Editor.
 *
 * Este arquivo é a referência canônica das entidades. A explicação de cada
 * conceito está em docs/01-dominio-ftth.md e o modelo relacional em
 * docs/02-modelo-de-dados.md — mantenha os três sincronizados.
 *
 * Convenções:
 * - Identificadores e tipos em inglês; siglas do setor mantidas (CTO, CEO, POP, OLT, ONU).
 * - Todo registro de rede carrega `projectId`; todo projeto carrega `companyId`.
 * - Potência em dBm, atenuação em dB, comprimento em metros.
 */

export type Id = string;
export type IsoDateTime = string;
/** [longitude, latitude] em WGS84, como no GeoJSON. */
export type LngLat = [number, number];

// ---------------------------------------------------------------------------
// Organização: empresa, usuários, projetos e provedores (rede neutra)
// ---------------------------------------------------------------------------

/** Empresa dona/operadora da infraestrutura (a operadora de rede neutra). */
export interface Company {
  id: Id;
  name: string;
  document?: string; // CNPJ
}

export interface User {
  id: Id;
  name: string;
  email: string;
}

export type CompanyRole = "owner" | "admin" | "member";

/** Vínculo usuário ↔ empresa. Um usuário pode pertencer a várias empresas. */
export interface CompanyMembership {
  userId: Id;
  companyId: Id;
  role: CompanyRole;
}

/**
 * Projeto: recorte da rede (cidade, bairro, expansão). É a unidade de trabalho
 * do editor — cada projeto tem seu mapa, seus elementos e seus membros.
 */
export interface Project {
  id: Id;
  companyId: Id;
  name: string;
  description?: string;
  /** Centro e zoom iniciais do mapa. */
  center: LngLat;
  zoom: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Papel dentro de um projeto. `field` = técnico de campo (edita status, não topologia). */
export type ProjectRole = "manager" | "designer" | "field" | "viewer";

/** Um usuário participa de vários projetos da empresa, com papel por projeto. */
export interface ProjectMembership {
  userId: Id;
  projectId: Id;
  role: ProjectRole;
}

/**
 * Provedor (ISP) que contrata capacidade da rede neutra. Não é dono da
 * infraestrutura: aluga portas/fibras e é dono da relação com o assinante.
 */
export interface Provider {
  id: Id;
  companyId: Id;
  name: string;
  document?: string;
  /** Cor usada no mapa e nos diagramas para identificar o provedor. */
  color: string;
  /** VLAN/S-VLAN de entrega, quando o modelo for bitstream. */
  serviceVlan?: number;
}

// ---------------------------------------------------------------------------
// Rede física georreferenciada (o que se desenha no mapa)
// ---------------------------------------------------------------------------

/** Ciclo de vida de qualquer elemento de rede. */
export type LifecycleStatus = "planned" | "in_construction" | "active" | "decommissioned";

/** Elementos pontuais. */
export type NodeKind =
  | "pop" // ponto de presença / central: abriga OLTs e DIOs
  | "ceo" // caixa de emenda óptica
  | "cto" // caixa de terminação óptica (ponto de atendimento do assinante)
  | "pole" // poste
  | "chamber" // caixa subterrânea
  | "reserve" // reserva técnica de cabo
  | "customer"; // ponto de instalação do assinante

/** Elementos lineares. */
export type CableKind =
  | "cable_backbone" // tronco / feeder (POP → CEO)
  | "cable_distribution" // distribuição (CEO → CTO)
  | "cable_drop"; // drop (CTO → assinante)

/** Elementos de área. */
export type AreaKind = "coverage_area";

export type ElementKind = NodeKind | CableKind | AreaKind;

interface NetworkElementBase {
  id: Id;
  projectId: Id;
  name: string;
  status: LifecycleStatus;
  notes?: string;
}

export interface NetworkNode extends NetworkElementBase {
  kind: NodeKind;
  position: LngLat;
  address?: string;
}

export interface Cable extends NetworkElementBase {
  kind: CableKind;
  path: LngLat[];
  /** Nós nas extremidades. Preenchido pelo editor ao "grudar" o cabo em um nó. */
  fromNodeId?: Id;
  toNodeId?: Id;
  /** Nós intermediários por onde o cabo passa sem ser aberto (postes, reservas). */
  viaNodeIds?: Id[];
  fiberCount: number;
  /** Fibras por tubo loose (tipicamente 2, 6 ou 12). */
  fibersPerTube: number;
  /** Comprimento medido no mapa, em metros. O real inclui reservas e sobras. */
  lengthMeters: number;
}

export interface CoverageArea extends NetworkElementBase {
  kind: AreaKind;
  ring: LngLat[];
  /** Domicílios passados (HP) estimados na área. */
  homesPassed?: number;
}

// ---------------------------------------------------------------------------
// Rede óptica interna (o que existe "dentro" de um nó)
// ---------------------------------------------------------------------------

/** Fibra de um cabo. Identificada por tubo + posição, com a cor padrão ABNT. */
export interface Fiber {
  id: Id;
  cableId: Id;
  tubeIndex: number;
  indexInTube: number;
}

export type EquipmentKind = "olt" | "dio" | "splitter" | "onu";

/** Equipamento instalado em um nó (OLT/DIO em POP, splitter em CEO/CTO, ONU no assinante). */
export interface Equipment {
  id: Id;
  projectId: Id;
  nodeId: Id;
  kind: EquipmentKind;
  name: string;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  /** Splitter: razão 1:N. Balanceado quando `unbalancedTapPercent` é indefinido. */
  splitRatio?: 2 | 4 | 8 | 16 | 32 | 64;
  unbalancedTapPercent?: number;
  /** OLT/ONU: endereço de gerência usado pela integração SNMP. */
  managementAddress?: string;
}

export type PortRole =
  | "pon" // porta PON da OLT
  | "uplink"
  | "splitter_in"
  | "splitter_out"
  | "dio" // posição de DIO/bastidor
  | "drop" // porta de atendimento da CTO (onde liga o drop)
  | "onu_pon";

export type PortStatus = "free" | "reserved" | "in_use" | "defective";

/** Porta de um equipamento. OLT usa slot/índice (ex.: 0/1/3). */
export interface Port {
  id: Id;
  equipmentId: Id;
  role: PortRole;
  slot?: number;
  index: number;
  status: PortStatus;
}

/** Uma ponta de fibra ou uma porta: os vértices do grafo óptico. */
export type OpticalEndpoint = { type: "fiber"; fiberId: Id } | { type: "port"; portId: Id };

export type ConnectionKind = "fusion" | "connector" | "patch_cord";

/**
 * Ligação entre duas pontas dentro de um nó (fusão em CEO, conector em CTO,
 * cordão em POP). São as arestas do grafo óptico: seguindo conexões e fibras
 * chega-se da porta PON até a ONU do assinante.
 */
export interface Connection {
  id: Id;
  projectId: Id;
  nodeId: Id;
  kind: ConnectionKind;
  a: OpticalEndpoint;
  b: OpticalEndpoint;
  lossDb?: number;
}

// ---------------------------------------------------------------------------
// Camada comercial: rede neutra e assinantes
// ---------------------------------------------------------------------------

/** O que pode ser cedido a um provedor. */
export type LeasableResource =
  | { type: "port"; portId: Id } // porta de CTO, saída de splitter, porta PON
  | { type: "fiber"; fiberId: Id }; // fibra apagada

export type LeaseStatus = "reserved" | "active" | "suspended" | "terminated";

/**
 * Cessão de um recurso da rede neutra a um provedor. É o registro que responde
 * "de quem é esta porta?" e sustenta ocupação e faturamento por provedor.
 */
export interface Lease {
  id: Id;
  projectId: Id;
  providerId: Id;
  resource: LeasableResource;
  status: LeaseStatus;
  startsAt: IsoDateTime;
  endsAt?: IsoDateTime;
}

/** Assinante final. Pertence a um provedor, nunca diretamente à operadora neutra. */
export interface Customer {
  id: Id;
  projectId: Id;
  providerId: Id;
  /** Identificador no ERP/CRM do provedor. */
  externalId?: string;
  name: string;
  /** Nó `customer` no mapa. */
  nodeId?: Id;
}

export type ServiceStatus = "pending_install" | "active" | "suspended" | "cancelled";

/**
 * Serviço instalado: amarra assinante → ONU → porta da CTO. A partir da porta
 * da CTO o caminho até a OLT é derivado do grafo óptico, não duplicado aqui.
 */
export interface Service {
  id: Id;
  projectId: Id;
  customerId: Id;
  ctoPortId: Id;
  onuEquipmentId?: Id;
  dropCableId?: Id;
  status: ServiceStatus;
}

// ---------------------------------------------------------------------------
// Monitoramento (SNMP) e notificações — integração futura
// ---------------------------------------------------------------------------

export type AlarmSeverity = "info" | "warning" | "major" | "critical";

export type AlarmType =
  | "olt_unreachable"
  | "pon_down"
  | "onu_offline"
  | "onu_dying_gasp" // queda de energia no assinante
  | "low_rx_power"
  | "high_temperature";

/** Do que o alarme fala. Sempre resolvível para um ponto no mapa. */
export type AlarmSubject =
  | { type: "equipment"; equipmentId: Id }
  | { type: "port"; portId: Id }
  | { type: "service"; serviceId: Id };

export interface Alarm {
  id: Id;
  projectId: Id;
  type: AlarmType;
  severity: AlarmSeverity;
  subject: AlarmSubject;
  raisedAt: IsoDateTime;
  clearedAt?: IsoDateTime;
  /**
   * Causa raiz provável, quando vários alarmes são correlacionados pela
   * topologia (ex.: todas as ONUs de uma CTO offline → cabo de distribuição).
   */
  rootCauseElementId?: Id;
}

export type NotificationChannel = "in_app" | "email" | "webhook";

export type NotificationSource =
  | { type: "alarm"; alarmId: Id }
  | { type: "system"; code: string }; // convite, exportação concluída, conflito de edição

export interface Notification {
  id: Id;
  companyId: Id;
  projectId?: Id;
  userId: Id;
  source: NotificationSource;
  title: string;
  body?: string;
  channel: NotificationChannel;
  createdAt: IsoDateTime;
  readAt?: IsoDateTime;
}
