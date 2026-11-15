import type { Company, Id, Project, Provider } from "@/domain/types";
import { EMPTY_COLLECTION, type ElementCollection } from "@/features/editor/model";

/**
 * Persistência provisória em localStorage.
 *
 * Tudo que lê ou grava dados passa por este módulo para que a troca por uma
 * API (Route Handlers + PostGIS, ver docs/03-arquitetura.md) fique contida
 * aqui. As funções são síncronas hoje; ao migrar, passam a devolver Promise.
 */

const PROJECTS_KEY = "neutra:projects";
const featuresKey = (projectId: Id) => `neutra:features:${projectId}`;

/** Empresa e provedores fixos até existir autenticação e cadastro. */
export const DEMO_COMPANY: Company = { id: "company-demo", name: "Operadora Neutra Demo" };

export const DEMO_PROVIDERS: Provider[] = [
  { id: "provider-1", companyId: DEMO_COMPANY.id, name: "Provedor Alfa", color: "#2563eb" },
  { id: "provider-2", companyId: DEMO_COMPANY.id, name: "Provedor Beta", color: "#db2777" },
  { id: "provider-3", companyId: DEMO_COMPANY.id, name: "Provedor Gama", color: "#0d9488" },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento cheio ou bloqueado: o editor segue funcionando em memória.
  }
}

export function listProjects(): Project[] {
  return read<Project[]>(PROJECTS_KEY, []);
}

export function getProject(projectId: Id): Project | undefined {
  return listProjects().find((project) => project.id === projectId);
}

export function createProject(input: Pick<Project, "name" | "description" | "center" | "zoom">): Project {
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: crypto.randomUUID(),
    companyId: DEMO_COMPANY.id,
    createdAt: now,
    updatedAt: now,
  };
  write(PROJECTS_KEY, [...listProjects(), project]);
  return project;
}

export function deleteProject(projectId: Id) {
  write(
    PROJECTS_KEY,
    listProjects().filter((project) => project.id !== projectId),
  );
  try {
    window.localStorage.removeItem(featuresKey(projectId));
  } catch {
    // ver write()
  }
}

export function loadFeatures(projectId: Id): ElementCollection {
  return read<ElementCollection>(featuresKey(projectId), EMPTY_COLLECTION);
}

export function saveFeatures(projectId: Id, collection: ElementCollection) {
  write(featuresKey(projectId), collection);
  const now = new Date().toISOString();
  write(
    PROJECTS_KEY,
    listProjects().map((project) => (project.id === projectId ? { ...project, updatedAt: now } : project)),
  );
}
