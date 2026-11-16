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
import type { OpticalModel } from "@/domain/opticalGraph";
import type { Id, LifecycleStatus, PortStatus } from "@/domain/types";
import { describeTrace, nodeHasDiagram, traceCto } from "@/features/diagram/model";
import { Share2, Workflow } from "lucide-react";
import { Button, FIELD, IdTag, LABEL } from "@/components/ui";
import {
  CTO_PORT_OPTIONS,
  makeCtoPorts,
  summarize,
  type CtoPort,
  type ElementFeature,
  type ElementProperties,
} from "./model";
import { networkInventory, shareFreePorts, unshareFreePorts } from "@/features/neutral/neutral";
import { analyzeNetwork, estimateLoss, impactOf, type Issue, type NetworkAnalysis } from "./network";

const SECTION = "border-t border-line-soft pt-4";
const HEADING = "mb-2 text-sm font-semibold text-ink";

/**
 * Aparência de uma porta na grade da CTO. A situação nunca é só cor: em uso é
 * cheia, reservada tem contorno tracejado, com defeito é hachurada, livre é vazada.
 * Compartilhada ganha a barra violeta embaixo.
 */
function portLook(port: CtoPort): { className: string; style?: React.CSSProperties } {
  const shared = port.shared ? "shadow-[inset_0_-4px_0_0_var(--color-shared)]" : "";
  switch (port.status) {
    case "in_use":
      return { className: `border-2 border-ok ${shared}`, style: { background: PORT_STATUS_COLORS.in_use } };
    case "reserved":
      return { className: `border-2 border-dashed border-warn bg-[#fde68a] ${shared}` };
    case "defective":
      return { className: `port-defective border-2 border-danger ${shared}` };
    default:
      return { className: `border-2 border-line bg-plate ${shared}` };
  }
}

function PortLegend() {
  const items: [string, CtoPort][] = [
    ["Livre", { index: 0, status: "free" }],
    ["Em uso", { index: 0, status: "in_use" }],
    ["Reservada", { index: 0, status: "reserved" }],
    ["Defeito", { index: 0, status: "defective" }],
    ["Compartilhada", { index: 0, status: "free", shared: true }],
  ];
  return (
    <ul aria-label="Legenda das portas" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
      {items.map(([label, port]) => {
        const look = portLook(port);
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-3.5 rounded-sm ${look.className}`} style={look.style} />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

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
        const error = issue.severity === "error";
        const tone = error ? "border-danger/40 bg-danger-soft text-danger" : "border-warn/40 bg-warn-soft text-warn";
        // Gravidade também em texto, não só na cor.
        const text = (
          <>
            <span className="font-semibold">{error ? "Erro" : "Aviso"}</span>
            {nameOf && <span className="font-tag font-semibold"> · {nameOf(issue.elementId)}</span>}
            <span className="block text-ink">{issue.message}</span>
          </>
        );
        return (
          <li key={`${issue.elementId}-${index}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(issue.elementId)}
                className={`min-h-9 w-full cursor-pointer rounded-md border px-2.5 py-1.5 text-left text-sm ${tone} hover:brightness-95 pointer-coarse:min-h-11`}
              >
                {text}
              </button>
            ) : (
              <p className={`rounded-md border px-2.5 py-1.5 text-sm ${tone}`}>{text}</p>
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
    return <p className="text-sm text-ink-muted">Projeto vazio. Comece posicionando um POP.</p>;
  }
  const errors = analysis.issues.filter((issue) => issue.severity === "error").length;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {kinds.map(([kind, count]) => (
          <div key={kind} className="contents">
            <dt className="text-ink-soft">{ELEMENTS[kind as keyof typeof ELEMENTS].label}</dt>
            <dd className="text-right font-medium tabular-nums text-ink">{count}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="text-ink-soft">Cabo lançado</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{formatMeters(summary.cableMeters)}</dd>
        </div>
      </dl>
      {totalPorts > 0 && (
        <div>
          <h3 className={HEADING}>Portas de CTO ({totalPorts})</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {(Object.keys(summary.ports) as PortStatus[]).map((status) => (
              <div key={status} className="contents">
                <dt className="flex items-center gap-2 text-ink-soft">
                  <span
                    aria-hidden
                    className={`size-3.5 rounded-sm ${portLook({ index: 0, status }).className}`}
                    style={portLook({ index: 0, status }).style}
                  />
                  {PORT_STATUS_LABELS[status]}
                </dt>
                <dd className="text-right font-medium tabular-nums text-ink">{summary.ports[status]}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="flex items-center gap-2 text-ink-soft">
                <span aria-hidden className={`size-3.5 rounded-sm ${portLook({ index: 0, status: "free", shared: true }).className}`} />
                Compartilhadas
              </dt>
              <dd className="text-right font-medium tabular-nums text-ink">{summary.sharedPorts}</dd>
            </div>
          </dl>
        </div>
      )}
      {totalPorts > 0 && <NeutralSummary features={features} />}
      <section className={SECTION}>
        <h3 className={HEADING}>
          Pendências ({analysis.issues.length}
          {errors > 0 ? `, ${errors} ${errors === 1 ? "erro" : "erros"}` : ""})
        </h3>
        {analysis.issues.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma. A topologia está consistente.</p>
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

/** O que o projeto tem de portas compartilhadas: é o estoque para ofertar. */
function NeutralSummary({ features }: { features: ElementFeature[] }) {
  const { totals, ctosWithOffer } = networkInventory(features);
  const shared = totals.sharedFree + totals.sharedBusy;
  return (
    <section className={SECTION}>
      <h3 className={HEADING}>Rede neutra</h3>
      {shared === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhuma porta compartilhada. Marque portas nas CTOs para ter o que ofertar a outras Empresas.
        </p>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-soft">Livres para ofertar</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{totals.sharedFree}</dd>
          <dt className="text-ink-soft">CTOs com oferta</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{ctosWithOffer}</dd>
          <dt className="text-ink-soft">Em uso por outras Empresas</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{totals.sharedBusy}</dd>
          <dt className="text-ink-soft">Portas próprias livres</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{totals.ownFree}</dd>
        </dl>
      )}
    </section>
  );
}

function PortEditor({
  ports,
  onChange,
}: {
  ports: CtoPort[];
  onChange: (ports: CtoPort[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = ports.find((port) => port.index === openIndex);

  const patch = (changes: Partial<CtoPort>) => {
    onChange(ports.map((port) => (port.index === openIndex ? { ...port, ...changes } : port)));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LABEL}>Portas</span>
        <select
          aria-label="Quantidade de portas"
          className="rounded border border-line bg-plate px-1 py-0.5 text-xs text-ink"
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
      <div className="grid grid-cols-8 gap-1.5">
        {ports.map((port) => (
          <button
            key={port.index}
            type="button"
            aria-pressed={openIndex === port.index}
            aria-label={`Porta ${port.index}: ${PORT_STATUS_LABELS[port.status]}${port.shared ? ", compartilhada" : ""}`}
            onClick={() => setOpenIndex(openIndex === port.index ? null : port.index)}
            className={`aspect-square min-h-8 cursor-pointer rounded-md font-tag text-base font-semibold text-ink ${portLook(port).className} ${
              openIndex === port.index ? "outline-3 outline-offset-2 outline-ink" : ""
            }`}
            style={portLook(port).style}
          >
            {port.index}
          </button>
        ))}
      </div>
      <PortLegend />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => onChange(shareFreePorts(ports))} disabled={!ports.some((port) => port.status === "free" && !port.shared)}>
          <Share2 aria-hidden className="size-4 text-shared" />
          Compartilhar as livres
        </Button>
        <Button
          variant="quiet"
          onClick={() => onChange(unshareFreePorts(ports))}
          disabled={!ports.some((port) => port.status === "free" && port.shared)}
        >
          Tirar o compartilhamento das livres
        </Button>
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-line-soft bg-concrete/60 p-2">
          <p className="text-xs font-semibold text-ink-soft">Porta {open.index}</p>
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
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={open.shared ?? false}
              onChange={(event) =>
                patch(event.target.checked ? { shared: true, subscriber: undefined } : { shared: undefined })
              }
            />
            Porta compartilhada
          </label>
          {open.shared ? (
            <p className="text-xs leading-relaxed text-ink-soft">
              Fica à disposição de outra Empresa. Quem a usa será indicado pelo pedido aceito no marketplace, quando
              essa integração existir.
            </p>
          ) : (
            <label>
              <span className={LABEL}>Assinante</span>
              <input
                className={FIELD}
                value={open.subscriber ?? ""}
                placeholder="Nome ou código"
                onChange={(event) => patch({ subscriber: event.target.value || undefined })}
              />
            </label>
          )}
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
  onSelect,
}: {
  selected: ElementFeature;
  features: ElementFeature[];
  analysis: NetworkAnalysis;
  onSelect: (id: Id) => void;
}) {
  const { kind } = selected.properties;
  if (kind === "coverage_area") return null;

  const route = analysis.routes.get(selected.id);
  const loss = route && (kind === "cto" || kind === "subscriber") ? estimateLoss(route, analysis.byId) : null;
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
                      {index > 0 && <span className="text-ink-muted">›</span>}
                      {nodeId === selected.id ? (
                        <span className="font-medium text-ink">{nameOf(nodeId)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelect(nodeId)}
                          className="text-signal hover:underline"
                        >
                          {nameOf(nodeId)}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="mt-1 text-xs text-ink-muted">{formatMeters(route.lengthMeters)} de cabo</p>
              </>
            ) : (
              <p className="text-ink-muted">Não conectado a nenhum POP.</p>
            )}
          </div>
        )}

        {loss && (
          <div>
            <p className={LABEL}>Orçamento óptico (estimado)</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
              <dt className="text-ink-soft">Divisão</dt>
              <dd className="text-right tabular-nums text-ink">1:{loss.split}</dd>
              <dt className="text-ink-soft">Atenuação</dt>
              <dd className="text-right tabular-nums text-ink">{loss.lossDb.toFixed(1)} dB</dd>
              <dt className="text-ink-soft">Folga (GPON B+)</dt>
              <dd className={`text-right font-medium tabular-nums ${loss.marginDb < 0 ? "text-danger" : "text-ok"}`}>
                {loss.marginDb.toFixed(1)} dB
              </dd>
            </dl>
          </div>
        )}

        {isCableKind(kind) && (selected.properties.viaNodeIds?.length ?? 0) > 0 && (
          <div>
            <p className={LABEL}>Passa por</p>
            <p className="text-ink">{selected.properties.viaNodeIds!.map(nameOf).join(", ")}</p>
          </div>
        )}

        <div>
          <p className={LABEL}>Se este elemento falhar</p>
          {hasImpact ? (
            <>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                <dt className="text-ink-soft">CTOs afetadas</dt>
                <dd className="text-right tabular-nums text-ink">{impact.ctos}</dd>
                <dt className="text-ink-soft">Portas em uso</dt>
                <dd className="text-right tabular-nums text-ink">{impact.portsInUse}</dd>
                <dt className="text-ink-soft">Portas compartilhadas</dt>
                <dd className="text-right tabular-nums text-ink">{impact.sharedPorts}</dd>
                <dt className="text-ink-soft">Assinantes no mapa</dt>
                <dd className="text-right tabular-nums text-ink">{impact.subscribers}</dd>
              </dl>
            </>
          ) : (
            <p className="text-ink-muted">Nada depende dele.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Quantas ligações o nó tem e, na CTO, se o sinal chega até uma OLT pelas fusões. */
function OpticalSummary({
  node,
  optical,
  nameOf,
}: {
  node: ElementFeature;
  optical: OpticalModel;
  nameOf: (id?: Id) => string;
}) {
  const count = optical.connections.filter((connection) => connection.nodeId === node.id).length;
  const equipment = optical.equipment.filter((item) => item.nodeId === node.id).length;
  const trace = node.properties.kind === "cto" ? traceCto(node.id, optical) : null;
  return (
    <div className="flex flex-col gap-1 text-sm text-ink-soft">
      <p>
        {equipment} {equipment === 1 ? "equipamento" : "equipamentos"}, {count} {count === 1 ? "ligação" : "ligações"}.
      </p>
      {trace && count > 0 && (
        <p className={trace.complete ? "text-ok" : "text-warn"}>{describeTrace(trace, optical, nameOf)}</p>
      )}
    </div>
  );
}

export function Inspector({
  features,
  selected,
  onChange,
  onSelect,
  onDelete,
  optical,
  onOpenDiagram,
}: {
  features: ElementFeature[];
  selected: ElementFeature | null;
  onChange: (id: Id, patch: Partial<ElementProperties>) => void;
  onSelect: (id: Id) => void;
  onDelete: () => void;
  optical: OpticalModel;
  onOpenDiagram: (id: Id) => void;
}) {
  const analysis = analyzeNetwork(features);

  if (!selected) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Resumo do projeto</h2>
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
      <h2 className="sr-only">
        {definition.label} {properties.name}
      </h2>
      <IdTag kind={definition.label} name={properties.name} color={definition.color} />

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
            <dt className="text-ink-soft">Comprimento</dt>
            <dd className="text-right font-medium tabular-nums text-ink">
              {formatMeters(properties.lengthMeters ?? 0)}
            </dd>
            <dt className="text-ink-soft">Origem</dt>
            <dd className="text-right text-ink">{nameOf(properties.fromNodeId)}</dd>
            <dt className="text-ink-soft">Destino</dt>
            <dd className="text-right text-ink">{nameOf(properties.toNodeId)}</dd>
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
          onChange={(ports) => onChange(id, { ports })}
        />
      )}

      {nodeHasDiagram(selected) && (
        <section className={SECTION}>
          <h3 className={HEADING}>Ligações</h3>
          <OpticalSummary node={selected} optical={optical} nameOf={nameOf} />
          <Button variant="primary" onClick={() => onOpenDiagram(id)} className="mt-2 w-full">
            <Workflow aria-hidden className="size-4" />
            Abrir diagrama de ligações
          </Button>
        </section>
      )}

      <TopologySection
        selected={selected}
        features={features}
        analysis={analysis}
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

      <Button variant="danger" onClick={onDelete} className="mt-1">
        Excluir {definition.label.toLowerCase()}
      </Button>
    </div>
  );
}
