"use client";

import { useState } from "react";
import {
  ELEMENTS,
  PORT_STATUS_COLORS,
  PORT_STATUS_LABELS,
  STATUS_LABELS,
  isCableKind,
} from "@/domain/catalog";
import type { Id, LifecycleStatus, PortStatus, Provider } from "@/domain/types";
import {
  CTO_PORT_OPTIONS,
  makeCtoPorts,
  summarize,
  type CtoPort,
  type ElementFeature,
  type ElementProperties,
} from "./model";

const FIELD = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900";
const LABEL = "mb-1 block text-xs font-medium text-slate-600";

function formatMeters(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
}

function Summary({ features }: { features: ElementFeature[] }) {
  const summary = summarize(features);
  const kinds = Object.entries(summary.countByKind);
  const totalPorts = Object.values(summary.ports).reduce((a, b) => a + b, 0);
  if (kinds.length === 0) {
    return <p className="text-sm text-slate-500">Projeto vazio. Comece posicionando um POP.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {kinds.map(([kind, count]) => (
          <div key={kind} className="contents">
            <dt className="text-slate-600">{ELEMENTS[kind as keyof typeof ELEMENTS].label}</dt>
            <dd className="text-right font-medium tabular-nums text-slate-900">{count}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="text-slate-600">Cabo lançado</dt>
          <dd className="text-right font-medium tabular-nums text-slate-900">{formatMeters(summary.cableMeters)}</dd>
        </div>
      </dl>
      {totalPorts > 0 && (
        <div>
          <h3 className={LABEL}>Portas de CTO ({totalPorts})</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {(Object.keys(summary.ports) as PortStatus[]).map((status) => (
              <div key={status} className="contents">
                <dt className="flex items-center gap-2 text-slate-600">
                  <span className="size-2.5 rounded-sm" style={{ background: PORT_STATUS_COLORS[status] }} />
                  {PORT_STATUS_LABELS[status]}
                </dt>
                <dd className="text-right font-medium tabular-nums text-slate-900">{summary.ports[status]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function PortEditor({
  ports,
  providers,
  onChange,
}: {
  ports: CtoPort[];
  providers: Provider[];
  onChange: (ports: CtoPort[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = ports.find((port) => port.index === openIndex);
  const providerColor = (id?: Id) => providers.find((provider) => provider.id === id)?.color;

  const patch = (changes: Partial<CtoPort>) => {
    onChange(ports.map((port) => (port.index === openIndex ? { ...port, ...changes } : port)));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Portas</span>
        <select
          aria-label="Quantidade de portas"
          className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-900"
          value={ports.length}
          onChange={(event) => {
            setOpenIndex(null);
            onChange(makeCtoPorts(Number(event.target.value), ports));
          }}
        >
          {CTO_PORT_OPTIONS.map((count) => (
            <option key={count} value={count}>
              1:{count}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {ports.map((port) => (
          <button
            key={port.index}
            type="button"
            aria-pressed={openIndex === port.index}
            aria-label={`Porta ${port.index}: ${PORT_STATUS_LABELS[port.status]}`}
            onClick={() => setOpenIndex(openIndex === port.index ? null : port.index)}
            className={`aspect-square rounded text-[11px] font-medium text-slate-900 ${
              openIndex === port.index ? "ring-2 ring-slate-900 ring-offset-1" : ""
            }`}
            style={{
              background: PORT_STATUS_COLORS[port.status],
              boxShadow: providerColor(port.providerId) && `inset 0 -3px 0 ${providerColor(port.providerId)}`,
            }}
          >
            {port.index}
          </button>
        ))}
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-700">Porta {open.index}</p>
          <label>
            <span className={LABEL}>Situação</span>
            <select
              className={FIELD}
              value={open.status}
              onChange={(event) => patch({ status: event.target.value as PortStatus })}
            >
              {(Object.keys(PORT_STATUS_LABELS) as PortStatus[]).map((status) => (
                <option key={status} value={status}>
                  {PORT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>Provedor</span>
            <select
              className={FIELD}
              value={open.providerId ?? ""}
              onChange={(event) => patch({ providerId: event.target.value || undefined })}
            >
              <option value="">Sem provedor</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>Cliente</span>
            <input
              className={FIELD}
              value={open.customerName ?? ""}
              placeholder="Nome ou código do assinante"
              onChange={(event) => patch({ customerName: event.target.value || undefined })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function Inspector({
  features,
  selected,
  providers,
  onChange,
  onDelete,
}: {
  features: ElementFeature[];
  selected: ElementFeature | null;
  providers: Provider[];
  onChange: (id: Id, patch: Partial<ElementProperties>) => void;
  onDelete: () => void;
}) {
  if (!selected) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Resumo do projeto</h2>
        <Summary features={features} />
      </div>
    );
  }

  const { id, properties } = selected;
  const definition = ELEMENTS[properties.kind];
  const nameOf = (nodeId?: Id) =>
    features.find((feature) => feature.id === nodeId)?.properties.name ?? "não conectado";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ background: definition.color }} />
        <h2 className="text-sm font-semibold text-slate-900">{definition.label}</h2>
      </div>

      <label>
        <span className={LABEL}>Nome</span>
        <input className={FIELD} value={properties.name} onChange={(event) => onChange(id, { name: event.target.value })} />
      </label>

      <label>
        <span className={LABEL}>Situação</span>
        <select
          className={FIELD}
          value={properties.status}
          onChange={(event) => onChange(id, { status: event.target.value as LifecycleStatus })}
        >
          {(Object.keys(STATUS_LABELS) as LifecycleStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      {isCableKind(properties.kind) && (
        <>
          <label>
            <span className={LABEL}>Fibras</span>
            <input
              className={FIELD}
              type="number"
              min={1}
              value={properties.fiberCount ?? 1}
              onChange={(event) => onChange(id, { fiberCount: Math.max(1, Number(event.target.value) || 1) })}
            />
          </label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-600">Comprimento</dt>
            <dd className="text-right font-medium tabular-nums text-slate-900">
              {formatMeters(properties.lengthMeters ?? 0)}
            </dd>
            <dt className="text-slate-600">Origem</dt>
            <dd className="text-right text-slate-900">{nameOf(properties.fromNodeId)}</dd>
            <dt className="text-slate-600">Destino</dt>
            <dd className="text-right text-slate-900">{nameOf(properties.toNodeId)}</dd>
          </dl>
        </>
      )}

      {properties.kind === "cto" && (
        <PortEditor
          key={id}
          ports={properties.ports ?? []}
          providers={providers}
          onChange={(ports) => onChange(id, { ports })}
        />
      )}

      <label>
        <span className={LABEL}>Observações</span>
        <textarea
          className={FIELD}
          rows={2}
          value={properties.notes ?? ""}
          onChange={(event) => onChange(id, { notes: event.target.value || undefined })}
        />
      </label>

      <button
        type="button"
        onClick={onDelete}
        className="rounded-md border border-red-200 px-2 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Excluir elemento
      </button>
    </div>
  );
}
