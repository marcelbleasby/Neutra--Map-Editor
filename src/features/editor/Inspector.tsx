"use client";

import { useState } from "react";
import {
  CEO_SPLIT_OPTIONS,
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
import { analyzeNetwork, estimateLoss, impactOf, type Issue, type NetworkAnalysis } from "./network";

const FIELD = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900";
const LABEL = "mb-1 block text-xs font-medium text-slate-600";
const SECTION = "border-t border-slate-200 pt-3";
const HEADING = "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500";

function formatMeters(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
}

function IssueList({
  issues,
  nameOf,
  onSelect,
}: {
  issues: Issue[];
  nameOf?: (id: Id) => string;
  onSelect?: (id: Id) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {issues.map((issue, index) => {
        const tone = issue.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";
        const text = (
          <>
            {nameOf && <span className="font-semibold">{nameOf(issue.elementId)}: </span>}
            {issue.message}
          </>
        );
        return (
          <li key={`${issue.elementId}-${index}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(issue.elementId)}
                className={`w-full rounded-md border px-2 py-1 text-left text-xs ${tone} hover:brightness-95`}
              >
                {text}
              </button>
            ) : (
              <p className={`rounded-md border px-2 py-1 text-xs ${tone}`}>{text}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Summary({
  features,
  analysis,
  onSelect,
}: {
  features: ElementFeature[];
  analysis: NetworkAnalysis;
  onSelect: (id: Id) => void;
}) {
  const summary = summarize(features);
  const kinds = Object.entries(summary.countByKind);
  const totalPorts = Object.values(summary.ports).reduce((a, b) => a + b, 0);
  if (kinds.length === 0) {
    return <p className="text-sm text-slate-500">Projeto vazio. Comece posicionando um POP.</p>;
  }
  const errors = analysis.issues.filter((issue) => issue.severity === "error").length;
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
      <section className={SECTION}>
        <h3 className={HEADING}>
          Pendências ({analysis.issues.length}
          {errors > 0 ? `, ${errors} ${errors === 1 ? "erro" : "erros"}` : ""})
        </h3>
        {analysis.issues.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma. A topologia está consistente.</p>
        ) : (
          <IssueList
            issues={analysis.issues}
            nameOf={(id) => analysis.byId.get(id)?.properties.name ?? "?"}
            onSelect={onSelect}
          />
        )}
      </section>
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

/** Caminho até o POP, orçamento óptico e o que depende do elemento. */
function TopologySection({
  selected,
  features,
  analysis,
  providers,
  onSelect,
}: {
  selected: ElementFeature;
  features: ElementFeature[];
  analysis: NetworkAnalysis;
  providers: Provider[];
  onSelect: (id: Id) => void;
}) {
  const { kind } = selected.properties;
  if (kind === "coverage_area") return null;

  const route = analysis.routes.get(selected.id);
  const loss = route && (kind === "cto" || kind === "customer") ? estimateLoss(route, analysis.byId) : null;
  const impact = impactOf(selected, features, analysis.routes);
  const hasImpact = impact.nodes.length > 0 || impact.portsInUse > 0;
  const showsRoute = ELEMENTS[kind].cableEndpoint && kind !== "pop";
  const nameOf = (id: Id) => analysis.byId.get(id)?.properties.name ?? "?";

  return (
    <section className={SECTION}>
      <h3 className={HEADING}>Topologia</h3>
      <div className="flex flex-col gap-3 text-sm">
        {showsRoute && (
          <div>
            <p className={LABEL}>Caminho até o POP</p>
            {route ? (
              <>
                <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  {route.nodeIds.map((nodeId, index) => (
                    <li key={nodeId} className="flex items-center gap-1">
                      {index > 0 && <span className="text-slate-400">›</span>}
                      {nodeId === selected.id ? (
                        <span className="font-medium text-slate-900">{nameOf(nodeId)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelect(nodeId)}
                          className="text-blue-700 hover:underline"
                        >
                          {nameOf(nodeId)}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="mt-1 text-xs text-slate-500">{formatMeters(route.lengthMeters)} de cabo</p>
              </>
            ) : (
              <p className="text-slate-500">Não conectado a nenhum POP.</p>
            )}
          </div>
        )}

        {loss && (
          <div>
            <p className={LABEL}>Orçamento óptico (estimado)</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
              <dt className="text-slate-600">Divisão</dt>
              <dd className="text-right tabular-nums text-slate-900">1:{loss.split}</dd>
              <dt className="text-slate-600">Atenuação</dt>
              <dd className="text-right tabular-nums text-slate-900">{loss.lossDb.toFixed(1)} dB</dd>
              <dt className="text-slate-600">Folga (GPON B+)</dt>
              <dd className={`text-right font-medium tabular-nums ${loss.marginDb < 0 ? "text-red-700" : "text-green-700"}`}>
                {loss.marginDb.toFixed(1)} dB
              </dd>
            </dl>
          </div>
        )}

        {isCableKind(kind) && (selected.properties.viaNodeIds?.length ?? 0) > 0 && (
          <div>
            <p className={LABEL}>Passa por</p>
            <p className="text-slate-900">{selected.properties.viaNodeIds!.map(nameOf).join(", ")}</p>
          </div>
        )}

        <div>
          <p className={LABEL}>Se este elemento falhar</p>
          {hasImpact ? (
            <>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                <dt className="text-slate-600">CTOs afetadas</dt>
                <dd className="text-right tabular-nums text-slate-900">{impact.ctos}</dd>
                <dt className="text-slate-600">Portas em uso</dt>
                <dd className="text-right tabular-nums text-slate-900">{impact.portsInUse}</dd>
                <dt className="text-slate-600">Clientes no mapa</dt>
                <dd className="text-right tabular-nums text-slate-900">{impact.customers}</dd>
              </dl>
              {impact.providerIds.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {impact.providerIds.map((providerId) => {
                    const provider = providers.find((candidate) => candidate.id === providerId);
                    return (
                      <li
                        key={providerId}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
                      >
                        <span className="size-2 rounded-full" style={{ background: provider?.color ?? "#94a3b8" }} />
                        {provider?.name ?? providerId}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-slate-500">Nada depende dele.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Inspector({
  features,
  selected,
  providers,
  onChange,
  onSelect,
  onDelete,
}: {
  features: ElementFeature[];
  selected: ElementFeature | null;
  providers: Provider[];
  onChange: (id: Id, patch: Partial<ElementProperties>) => void;
  onSelect: (id: Id) => void;
  onDelete: () => void;
}) {
  const analysis = analyzeNetwork(features);

  if (!selected) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Resumo do projeto</h2>
        <Summary features={features} analysis={analysis} onSelect={onSelect} />
      </div>
    );
  }

  const { id, properties } = selected;
  const definition = ELEMENTS[properties.kind];
  const ownIssues = analysis.issues.filter((issue) => issue.elementId === id);
  const nameOf = (nodeId?: Id) =>
    features.find((feature) => feature.id === nodeId)?.properties.name ?? "não conectado";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ background: definition.color }} />
        <h2 className="text-sm font-semibold text-slate-900">{definition.label}</h2>
      </div>

      {ownIssues.length > 0 && <IssueList issues={ownIssues} />}

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

      {properties.kind === "ceo" && (
        <label>
          <span className={LABEL}>Splitter de 1º nível</span>
          <select
            className={FIELD}
            value={properties.splitRatio ?? 0}
            onChange={(event) => onChange(id, { splitRatio: Number(event.target.value) || undefined })}
          >
            {CEO_SPLIT_OPTIONS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio === 0 ? "Sem splitter (só emenda)" : `1:${ratio}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {properties.kind === "cto" && (
        <PortEditor
          key={id}
          ports={properties.ports ?? []}
          providers={providers}
          onChange={(ports) => onChange(id, { ports })}
        />
      )}

      <TopologySection
        selected={selected}
        features={features}
        analysis={analysis}
        providers={providers}
        onSelect={onSelect}
      />

      <label className={SECTION}>
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
