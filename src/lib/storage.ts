import type { Company, Id, Project } from "@/domain/types";
import { EMPTY_OPTICAL, type OpticalData } from "@/features/diagram/model";
import { EMPTY_COLLECTION, migrateCollection, type ElementCollection } from "@/features/editor/model";

/**
 * Persistência provisória em localStorage.
 *
 * Tudo que lê ou grava dados passa por este módulo para que a troca por uma
 * API existente (ver docs/04-arquitetura.md) fique contida
 * aqui. As funções são síncronas hoje; ao migrar, passam a devolver Promise.
 */

const PROJECTS_KEY = "neutra:projects";
const featuresKey = (projectId: Id) => `neutra:features:${projectId}`;
const opticalKey = (projectId: Id) => `neutra:optical:${projectId}`;

/** Empresa fixa até existir login pela identidade da plataforma. */
export const DEMO_COMPANY: Company = { id: "company-demo", name: "Empresa Demo" };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Devolve falso se o navegador recusou gravar (armazenamento cheio ou bloqueado). */
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
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
    window.localStorage.removeItem(opticalKey(projectId));
  } catch {
    // ver write()
  }
}

export function loadFeatures(projectId: Id): ElementCollection {
  return migrateCollection(read<ElementCollection>(featuresKey(projectId), EMPTY_COLLECTION));
}

/** Devolve falso se não coube: o editor segue em memória e avisa o usuário. */
export function saveFeatures(projectId: Id, collection: ElementCollection): boolean {
  if (!write(featuresKey(projectId), collection)) return false;
  const now = new Date().toISOString();
  write(
    PROJECTS_KEY,
    listProjects().map((project) => (project.id === projectId ? { ...project, updatedAt: now } : project)),
  );
  return true;
}

/** Equipamentos e ligações do diagrama de cada nó (ver src/features/diagram). */
export function loadOptical(projectId: Id): OpticalData {
  return read<OpticalData>(opticalKey(projectId), EMPTY_OPTICAL);
}

export function saveOptical(projectId: Id, data: OpticalData): boolean {
  return write(opticalKey(projectId), data);
}
