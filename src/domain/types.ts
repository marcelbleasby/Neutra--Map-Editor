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
// Organização: empresa, usuários e projetos
// ---------------------------------------------------------------------------

/**
 * Empresa: organização da plataforma, no perfil Seller. É um provedor dono da
 * própria rede. `id` é o `organization_id` usado por todos os serviços
 * (ver GLOSSARY.md e docs/12-portal-da-plataforma.md).
 */
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

/** Papéis de Seller do serviço de identidade; vêm no campo `roles` do token. */
export type CompanyRole =
  | "seller_owner"
  | "seller_operations"
  | "seller_technical"
  | "seller_commercial"
  | "seller_support"
  | "seller_finance";

/** O que cada papel pode fazer no editor. */
export type EditorAccess = "edit_network" | "edit_links" | "read" | "none";

export const ROLE_ACCESS: Record<CompanyRole, EditorAccess> = {
  seller_owner: "edit_network",
  seller_operations: "edit_network",
  // Liga fibras e altera situação de elementos e portas; não redesenha a rede.
  seller_technical: "edit_links",
  seller_commercial: "read",
  seller_support: "read",
  seller_finance: "none",
};

/** Vínculo usuário ↔ empresa. Na plataforma, um usuário tem um único vínculo ativo. */
export interface CompanyMembership {
  userId: Id;
  companyId: Id;
  role: CompanyRole;
}

/**
 * Projeto: recorte da rede de uma Empresa (uma cidade, várias, ou parte de uma).
 * Um POP e tudo que ele alimenta ficam no mesmo projeto. Na plataforma, é um
 * rascunho de cobertura da geo (docs/adr/0003).
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
  | "subscriber"; // ponto de instalação do assinante

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
  /** Id do dispositivo no coletor SNMP (ver docs/06-integracao-snmp.md). */
  monitoringDeviceId?: Id;
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
  /** Porta compartilhada: fica à disposição de outra Empresa (GLOSSARY.md). */
  shared?: boolean;
  /**
   * Assinante atendido, em portas próprias: só um nome ou código. O cadastro é
   * do sistema de gestão da Empresa, não do editor.
   */
  subscriber?: string;
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
// Rede neutra: portas compartilhadas
// ---------------------------------------------------------------------------

export type PortShareStatus = "active" | "suspended" | "ended";

/**
 * Compartilhamento: uso de uma porta compartilhada por outra Empresa. Nasce de um
 * pedido aceito no marketplace — o editor não cria, só indica qual porta atende o
 * pedido (docs/adr/0005). Uma porta tem no máximo um compartilhamento ativo.
 */
export interface PortShare {
  id: Id;
  projectId: Id;
  portId: Id;
  /** `organization_id` da Empresa que usa a porta. */
  partnerCompanyId: Id;
  /** Pedido do marketplace que originou o compartilhamento. */
  orderId: Id;
  status: PortShareStatus;
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
  | { type: "port"; portId: Id };

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
