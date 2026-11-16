"use client";

import { useState } from "react";
import { ELEMENTS } from "@/domain/catalog";
import type { ElementKind } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import { buildFeatures, MAX_IMPORT_ELEMENTS, type BuildResult } from "./build";
import type { ImportDraft } from "./draft";

/** Grupos além deste número são muito pequenos para revisar um a um e ficam de fora. */
const MAX_GROUPS = 40;
const IGNORE = "";

export function ImportDialog({
  draft,
  existing,
  ready,
  onImport,
  onClose,
}: {
  draft: ImportDraft;
  existing: ElementFeature[];
  /** O mapa já carregou e pode receber elementos. */
  ready: boolean;
  onImport: (result: BuildResult) => void;
  onClose: () => void;
}) {
  const groups = draft.groups.slice(0, MAX_GROUPS);
  const hidden = draft.groups.length - groups.length;
  const [choices, setChoices] = useState<Record<string, ElementKind | null>>(() =>
    Object.fromEntries(groups.map((group) => [group.key, group.suggested])),
  );

  const total = groups.reduce((sum, group) => sum + (choices[group.key] ? group.indexes.length : 0), 0);
  const tooMany = total > MAX_IMPORT_ELEMENTS;

  function handleImport() {
    const kindByIndex = new Map<number, ElementKind>();
    for (const group of groups) {
      const kind = choices[group.key];
      if (kind) for (const index of group.indexes) kindByIndex.set(index, kind);
    }
    onImport(buildFeatures(draft.placemarks, draft.classifications, (index) => kindByIndex.get(index) ?? null, existing));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-plate shadow-xl"
      >
        <header className="border-b border-line-soft px-5 py-4">
          <h2 id="import-title" className="text-base font-semibold text-ink">
            Importar {draft.fileName}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {draft.placemarks.length.toLocaleString("pt-BR")} itens encontrados. Confira como cada grupo entra na rede;
            os tipos foram sugeridos pelo nome.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sm text-ink-muted">
                <th className="py-1 font-semibold">Grupo</th>
                <th className="py-1 text-right font-semibold">Itens</th>
                <th className="py-1 pl-4 font-semibold">Importar como</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.key} className="border-t border-line-soft align-top">
                  <td className="py-2 pr-2">
                    <span className="font-medium text-ink">{group.label}</span>
                    {group.examples.length > 0 && (
                      <span className="block truncate text-xs text-ink-muted">{group.examples.join(" · ")}</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink">
                    {group.indexes.length.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pl-4">
                    <select
                      aria-label={`Importar ${group.label} como`}
                      className="w-44 rounded-md border border-line bg-plate px-2 py-1 text-sm text-ink"
                      value={choices[group.key] ?? IGNORE}
                      onChange={(event) =>
                        setChoices({ ...choices, [group.key]: (event.target.value as ElementKind) || null })
                      }
                    >
                      <option value={IGNORE}>Ignorar</option>
                      {group.options.map((kind) => (
                        <option key={kind} value={kind}>
                          {ELEMENTS[kind].label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Outros {hidden} grupos menores não reconhecidos ficam de fora desta importação.
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-line-soft px-5 py-3">
          <p role={tooMany ? "alert" : undefined} className={`flex-1 text-sm ${tooMany ? "text-danger" : "text-ink-soft"}`}>
            {tooMany
              ? `O editor ainda comporta até ${MAX_IMPORT_ELEMENTS.toLocaleString("pt-BR")} elementos por importação. Ignore alguns grupos ou divida o arquivo.`
              : "Cabos são ligados aos nós que estiverem a até 5 m das pontas."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-concrete"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ready || total === 0 || tooMany}
            onClick={handleImport}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ready ? `Importar ${total.toLocaleString("pt-BR")}` : "Carregando mapa…"}
          </button>
        </footer>
      </div>
    </div>
  );
}
