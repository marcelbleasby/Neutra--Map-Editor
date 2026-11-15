"use client";

import { useState } from "react";
import { ELEMENTS } from "@/domain/catalog";
import { traceToOlt, type OpticalModel } from "@/domain/opticalGraph";
import type { Id, OpticalEndpoint } from "@/domain/types";
import type { ElementFeature } from "@/features/editor/model";
import {
  connectionPath,
  LANE_WIDTH,
  layoutNode,
  ROW_HEIGHT,
  type DiagramBlock,
  type DiagramRow,
} from "./layout";
import {
  addEquipment,
  connect,
  CONNECTION_LABELS,
  describeTrace,
  disconnect,
  endpointKey,
  endpointLabel,
  EQUIPMENT_OPTIONS,
  removeEquipment,
  type EquipmentSpec,
  type OpticalData,
} from "./model";

const NEUTRAL_LINE = "#475569";

function sameEndpoint(a: OpticalEndpoint, b: OpticalEndpoint) {
  return endpointKey(a) === endpointKey(b);
}

function AddEquipment({ nodeKind, onAdd }: { nodeKind: string; onAdd: (spec: EquipmentSpec) => void }) {
  const options = EQUIPMENT_OPTIONS[nodeKind] ?? [];
  const [choice, setChoice] = useState("0:0");
  if (options.length === 0) return null;
  const [optionIndex, sizeIndex] = choice.split(":").map(Number);
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Equipamento a adicionar"
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        {options.map((option, i) =>
          option.sizes.map((size, j) => (
            <option key={`${i}:${j}`} value={`${i}:${j}`}>
              {option.kind === "splitter" ? `Splitter 1:${size}` : `${option.label.split(" ")[0]} com ${size}`}
            </option>
          )),
        )}
      </select>
      <button
        type="button"
        onClick={() => onAdd({ kind: options[optionIndex].kind, size: options[optionIndex].sizes[sizeIndex] })}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
      >
        Adicionar
      </button>
    </div>
  );
}

function Block({
  block,
  picked,
  connected,
  onPick,
  onRemove,
}: {
  block: DiagramBlock;
  picked: OpticalEndpoint | null;
  connected: Set<string>;
  onPick: (row: DiagramRow) => void;
  onRemove: (id: Id) => void;
}) {
  const isCable = block.kind === "cable";
  return (
    <g>
      <rect
        x={block.x}
        y={block.y}
        width={LANE_WIDTH}
        height={block.height}
        rx={6}
        fill="#ffffff"
        stroke={isCable ? "#cbd5e1" : "#94a3b8"}
        strokeWidth={isCable ? 1 : 1.5}
      />
      <text x={block.x + 10} y={block.y + 19} fontSize={12} fontWeight={600} fill="#0f172a">
        {block.title.length > 20 ? `${block.title.slice(0, 19)}…` : block.title}
      </text>
      <text x={block.x + LANE_WIDTH - (block.removable ? 30 : 10)} y={block.y + 19} fontSize={11} fill="#64748b" textAnchor="end">
        {block.subtitle}
      </text>
      {block.removable && (
        <g
          role="button"
          tabIndex={0}
          aria-label={`Remover ${block.title}`}
          className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-slate-900"
          onClick={() => onRemove(block.id)}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onRemove(block.id)}
        >
          <rect x={block.x + LANE_WIDTH - 24} y={block.y + 6} width={18} height={18} rx={4} fill="#fff" stroke="#e2e8f0" />
          <text x={block.x + LANE_WIDTH - 15} y={block.y + 19} fontSize={13} textAnchor="middle" fill="#b91c1c">
            ×
          </text>
        </g>
      )}
      {block.rows.map((row) => {
        const isPicked = picked !== null && sameEndpoint(picked, row.endpoint);
        const top = row.y - ROW_HEIGHT / 2;
        return (
          <g
            key={row.key}
            role="button"
            tabIndex={0}
            aria-pressed={isPicked}
            aria-label={`${block.title}, ${row.label}${connected.has(row.key) ? ", ligada" : ""}`}
            className="cursor-pointer outline-none [&>rect:first-child]:hover:fill-slate-100 focus-visible:[&>rect:first-child]:stroke-slate-900"
            onClick={() => onPick(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPick(row);
              }
            }}
          >
            <rect
              x={block.x + 1}
              y={top}
              width={LANE_WIDTH - 2}
              height={ROW_HEIGHT}
              fill={isPicked ? "#fef3c7" : "transparent"}
              stroke={isPicked ? "#f59e0b" : "transparent"}
            />
            {row.band && <rect x={block.x + 1} y={top} width={4} height={ROW_HEIGHT} fill={row.band} />}
            {row.swatch && (
              <circle cx={block.x + 18} cy={row.y} r={5} fill={row.swatch} stroke="#64748b" strokeWidth={0.75} />
            )}
            <text x={block.x + (row.swatch ? 30 : 12)} y={row.y + 4} fontSize={11.5} fill="#1e293b">
              {row.label}
            </text>
            {row.sides.map((side) => (
              <circle
                key={side}
                cx={side === "left" ? block.x : block.x + LANE_WIDTH}
                cy={row.y}
                r={4}
                fill={connected.has(row.key) ? "#0f172a" : "#ffffff"}
                stroke="#0f172a"
                strokeWidth={1.25}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Diagrama de ligações de um nó: cabos com suas fibras, equipamentos com suas
 * portas e as ligações entre eles. Clicar em duas pontas as liga; clicar numa
 * ponta ligada mostra a ligação e o caminho do sinal.
 */
export function NodeDiagram({
  node,
  projectId,
  model,
  data,
  upstreamCableId,
  nameOf,
  onChange,
  onClose,
}: {
  node: ElementFeature;
  projectId: Id;
  model: OpticalModel;
  data: OpticalData;
  upstreamCableId: Id | undefined;
  nameOf: (nodeId: Id) => string;
  onChange: (data: OpticalData) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<OpticalEndpoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { kind, name } = node.properties;

  const layout = layoutNode(node.id, kind, model, upstreamCableId);
  const connections = model.connections.filter((connection) => connection.nodeId === node.id);
  const connected = new Set(connections.flatMap((connection) => [endpointKey(connection.a), endpointKey(connection.b)]));
  const pickedConnections = picked
    ? connections.filter((connection) => sameEndpoint(connection.a, picked) || sameEndpoint(connection.b, picked))
    : [];
  const fiberColors = new Map(
    layout.blocks.flatMap((block) => block.rows.filter((row) => row.band).map((row) => [row.key, row.swatch] as const)),
  );

  function handlePick(row: DiagramRow) {
    setError(null);
    if (!picked) return setPicked(row.endpoint);
    if (sameEndpoint(picked, row.endpoint)) return setPicked(null);
    // Com a ponta escolhida já ligada, o segundo clique só troca a seleção.
    const pickedIsFull = pickedConnections.length > 0 && !endpointKey(picked).includes(":dio:");
    if (pickedIsFull) return setPicked(row.endpoint);
    const result = connect(model, data, node.id, picked, row.endpoint, projectId);
    if ("error" in result) {
      setError(result.error);
      return setPicked(row.endpoint);
    }
    onChange(result.data);
    setPicked(null);
  }

  const trace = picked?.type === "port" ? traceToOlt(picked.portId, model) : null;
  const isEmpty = layout.blocks.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagram-title"
        className="flex h-full max-h-[52rem] w-full max-w-5xl flex-col rounded-lg bg-slate-50 shadow-xl"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <span className="size-3 rounded-full" style={{ background: ELEMENTS[kind].color }} />
          <h2 id="diagram-title" className="text-base font-semibold text-slate-900">
            Ligações de {name}
          </h2>
          <span className="text-sm text-slate-500">
            {connections.length} {connections.length === 1 ? "ligação" : "ligações"}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <AddEquipment
              nodeKind={kind}
              onAdd={(spec) => onChange(addEquipment(data, node.id, spec, projectId))}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {isEmpty ? (
            <p className="p-6 text-sm text-slate-600">
              Nada para ligar ainda. Conecte um cabo a {name} no mapa
              {EQUIPMENT_OPTIONS[kind] ? " ou adicione um equipamento acima." : "."}
            </p>
          ) : (
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="group"
              aria-label={`Diagrama de ligações de ${name}`}
            >
              {/* As ligações vêm antes dos blocos: uma fibra de passagem corre por trás do splitter. */}
              <g fill="none" strokeLinecap="round" pointerEvents="none">
                {connections.map((connection) => {
                  const path = connectionPath(
                    layout.anchors.get(endpointKey(connection.a)),
                    layout.anchors.get(endpointKey(connection.b)),
                  );
                  if (!path) return null;
                  const emphasized = pickedConnections.includes(connection);
                  const color =
                    fiberColors.get(endpointKey(connection.a)) ?? fiberColors.get(endpointKey(connection.b)) ?? NEUTRAL_LINE;
                  return (
                    <g key={connection.id} opacity={picked && !emphasized ? 0.35 : 1}>
                      {/* Contorno escuro: mantém fibras claras (branca, amarela) visíveis. */}
                      <path d={path} stroke="#0f172a" strokeWidth={emphasized ? 5.5 : 3.5} />
                      <path d={path} stroke={color} strokeWidth={emphasized ? 3.5 : 2} />
                    </g>
                  );
                })}
              </g>
              {layout.blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  picked={picked}
                  connected={connected}
                  onPick={handlePick}
                  onRemove={(id) => {
                    setPicked(null);
                    onChange(removeEquipment(data, id));
                  }}
                />
              ))}
            </svg>
          )}
        </div>

        <footer className="min-h-16 border-t border-slate-200 bg-white px-5 py-3 text-sm" aria-live="polite">
          {error && (
            <p role="alert" className="mb-1 text-red-700">
              {error}
            </p>
          )}
          {!picked ? (
            <p className="text-slate-600">
              Clique em uma fibra ou porta e depois em outra para ligar as duas. Clique em uma ponta ligada para ver a
              ligação e o caminho do sinal.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-medium text-slate-900">{endpointLabel(picked, model)}</p>
              {pickedConnections.length === 0 && (
                <p className="text-slate-600">Sem ligação. Clique em outra ponta para ligar.</p>
              )}
              {pickedConnections.map((connection) => {
                const other = sameEndpoint(connection.a, picked) ? connection.b : connection.a;
                return (
                  <p key={connection.id} className="flex items-center gap-3 text-slate-700">
                    <span>
                      Ligada a {endpointLabel(other, model)} por {CONNECTION_LABELS[connection.kind]}.
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(disconnect(data, connection.id))}
                      className="font-medium text-red-700 hover:underline"
                    >
                      Desligar
                    </button>
                  </p>
                );
              })}
              {trace && <p className="text-slate-700">{describeTrace(trace, model, nameOf)}</p>}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
