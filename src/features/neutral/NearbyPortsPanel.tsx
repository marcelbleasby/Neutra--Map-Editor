"use client";

import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui";
import type { Id } from "@/domain/types";
import { SERVICE_RADIUS_METERS, type NearbyPorts } from "./neutral";

function Answer({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-ok text-white" : "border-2 border-line text-ink-muted"
        }`}
      >
        {ok ? <Check className="size-4" strokeWidth={3} /> : <Minus className="size-4" strokeWidth={3} />}
      </span>
      <p className="text-sm">
        <span className="font-semibold text-ink">
          {label}: {ok ? "sim" : "não"}
        </span>
        <span className="block text-ink-soft">{detail}</span>
      </p>
    </div>
  );
}

/** Resultado da consulta de portas próximas a um ponto do mapa. */
export function NearbyPortsPanel({
  result,
  onSelect,
  onAgain,
  onClose,
}: {
  result: NearbyPorts;
  onSelect: (id: Id) => void;
  onAgain: () => void;
  onClose: () => void;
}) {
  const ownFree = result.ctos.reduce((sum, cto) => sum + cto.ownFree, 0);
  const sharedFree = result.ctos.reduce((sum, cto) => sum + cto.sharedFree, 0);
  const [lng, lat] = result.point;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Portas próximas</h2>
        <p className="text-sm text-ink-soft">Até {SERVICE_RADIUS_METERS} m em linha reta do ponto</p>
        <p className="text-xs tabular-nums text-ink-muted">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Answer
          ok={result.ownAvailable}
          label="Para um assinante seu"
          detail={
            result.ownAvailable
              ? `${ownFree} ${ownFree === 1 ? "porta própria livre" : "portas próprias livres"}.`
              : "Nenhuma porta própria livre."
          }
        />
        <Answer
          ok={result.sharedAvailable}
          label="Para um pedido de outra Empresa"
          detail={
            result.sharedAvailable
              ? `${sharedFree} ${sharedFree === 1 ? "porta compartilhada livre" : "portas compartilhadas livres"}.`
              : "Nenhuma porta compartilhada livre."
          }
        />
      </div>

      <p className="rounded-md bg-concrete/60 p-2 text-xs leading-relaxed text-ink-soft">
        Isto não é a viabilidade da plataforma. Viabilidade é a geo que responde: se o ponto está na cobertura da
        oferta. Use esta consulta para confirmar que dá para atender, por exemplo antes de aceitar um pedido.
      </p>

      <section className="border-t border-line-soft pt-3">
        <h3 className="mb-2 text-sm font-semibold text-ink">
          CTOs no raio ({result.ctos.length})
        </h3>
        {result.ctos.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma CTO a até {SERVICE_RADIUS_METERS} m.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
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
              {result.ctos.map((cto) => (
                <tr key={cto.id} className="border-t border-line-soft">
                  <td className="py-1">
                    <button type="button" onClick={() => onSelect(cto.id)} className="min-h-8 cursor-pointer text-left font-tag text-base font-semibold text-signal hover:underline pointer-coarse:min-h-11">
                      {cto.name}
                    </button>
                  </td>
                  <td className="py-1 text-right tabular-nums text-ink">{Math.round(cto.distanceMeters)} m</td>
                  <td className="py-1 text-right tabular-nums text-ink">{cto.ownFree}</td>
                  <td className="py-1 text-right tabular-nums text-ink">{cto.sharedFree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex gap-2">
        <Button variant="primary" onClick={onAgain} className="flex-1">
          Consultar outro ponto
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
