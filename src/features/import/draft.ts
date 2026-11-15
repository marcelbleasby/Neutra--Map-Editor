import type { Id } from "@/domain/types";
import { classifyPlacemark, groupPlacemarks, type Classification, type ImportGroup } from "./classify";
import { parseKml, readKmlFile, type Placemark } from "./kml";

/** Um arquivo lido e classificado, aguardando a revisão do usuário. */
export interface ImportDraft {
  fileName: string;
  placemarks: Placemark[];
  classifications: Classification[];
  groups: ImportGroup[];
}

export async function prepareImport(file: File): Promise<ImportDraft> {
  const placemarks = parseKml(await readKmlFile(file));
  if (placemarks.length === 0) throw new Error("O arquivo não tem pontos, linhas ou polígonos.");
  const classifications = placemarks.map(classifyPlacemark);
  return { fileName: file.name, placemarks, classifications, groups: groupPlacemarks(placemarks, classifications) };
}

/**
 * Importação escolhida na criação do projeto, entregue ao editor depois da
 * navegação. Fica só em memória: recarregar a página a descarta.
 */
const pending = new Map<Id, ImportDraft>();

export function setPendingImport(projectId: Id, draft: ImportDraft) {
  pending.set(projectId, draft);
}

export function peekPendingImport(projectId: Id): ImportDraft | null {
  return pending.get(projectId) ?? null;
}

export function clearPendingImport(projectId: Id) {
  pending.delete(projectId);
}
