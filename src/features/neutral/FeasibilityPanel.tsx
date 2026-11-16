"use client";

import type { Id } from "@/domain/types";
import { FEASIBILITY_RADIUS_METERS, type Feasibility } from "./neutral";

function Verdict({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          ok ? "bg-green-600" : "bg-slate-400"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <p className="text-sm">
        <span className="font-medium text-slate-900">
          {label}: {ok ? "sim" : "não"}
        </span>
        <span className="block text-slate-600">{detail}</span>
      </p>
    </div>
  );
}

/** Resultado da consulta de viabilidade num ponto do mapa. */
export function FeasibilityPanel({
  result,
  onSelect,
  onAgain,
  onClose,
}: {
  result: Feasibility;
  onSelect: (id: Id) => void;
  onAgain: () => void;
  onClose: () => void;
}) {
  const ownFree = result.candidates.reduce((sum, cto) => sum + cto.ownFree, 0);
  const sharedFree = result.candidates.reduce((sum, cto) => sum + cto.sharedFree, 0);
  const [lng, lat] = result.point;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Viabilidade</h2>
        <p className="text-xs tabular-nums text-slate-500">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Verdict
          ok={result.viable}
          label="Viabilidade"
          detail={
            result.viable
              ? `${ownFree} ${ownFree === 1 ? "porta própria livre" : "portas próprias livres"} a até ${FEASIBILITY_RADIUS_METERS} m.`
              : `Nenhuma porta própria livre a até ${FEASIBILITY_RADIUS_METERS} m.`
          }
        />
        <Verdict
          ok={result.sharedViable}
          label="Portas compartilhadas"
          detail={
            result.sharedViable
              ? `${sharedFree} ${sharedFree === 1 ? "livre" : "livres"} no raio: é o que outra Empresa poderia usar aqui.`
              : "Nenhuma livre no raio."
          }
        />
        <Verdict
          ok={result.covered}
          label="Cobertura"
          detail={result.covered ? "O ponto está dentro de uma área de cobertura." : "O ponto está fora das áreas de cobertura."}
        />
      </div>

      <section className="border-t border-slate-200 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          CTOs no raio ({result.candidates.length})
        </h3>
        {result.candidates.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma CTO a até {FEASIBILITY_RADIUS_METERS} m, em linha reta.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-1 font-medium">CTO</th>
                <th className="pb-1 text-right font-medium">Dist.</th>
                <th className="pb-1 text-right font-medium" title="Portas próprias livres">
                  Próprias
                </th>
                <th className="pb-1 text-right font-medium" title="Portas compartilhadas livres">
                  Compart.
                </th>
              </tr>
            </thead>
            <tbody>
              {result.candidates.map((cto) => (
                <tr key={cto.id} className="border-t border-slate-100">
                  <td className="py-1">
                    <button type="button" onClick={() => onSelect(cto.id)} className="text-left text-blue-700 hover:underline">
                      {cto.name}
                    </button>
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-900">{Math.round(cto.distanceMeters)} m</td>
                  <td className="py-1 text-right tabular-nums text-slate-900">{cto.ownFree}</td>
                  <td className="py-1 text-right tabular-nums text-slate-900">{cto.sharedFree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-md bg-slate-900 px-2 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Consultar outro ponto
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
