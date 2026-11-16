"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/domain/types";
import type { BuildResult } from "@/features/import/build";
import { clearPendingImport, peekPendingImport, prepareImport, type ImportDraft } from "@/features/import/draft";
import { ImportDialog } from "@/features/import/ImportDialog";
import { buildOpticalModel, type OpticalData } from "@/features/diagram/model";
import { NodeDiagram } from "@/features/diagram/NodeDiagram";
import type { Polygon } from "geojson";
import { NearbyPortsPanel } from "@/features/neutral/NearbyPortsPanel";
import { OfferPanel } from "@/features/neutral/OfferPanel";
import { findNearbyPorts, nearbyOverlay } from "@/features/neutral/neutral";
import { getProject, loadOptical, saveOptical } from "@/lib/storage";
import { computeRoutes } from "./network";
import { Inspector } from "./Inspector";
import type { ElementFeature } from "./model";
import { Palette } from "./Palette";
import { useNetworkEditor } from "./useNetworkEditor";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <h1 className="mb-2 text-base font-semibold text-slate-900">{title}</h1>
        {children}
        <Link href="/" className="mt-4 inline-block font-medium text-blue-700 hover:underline">
          Voltar aos projetos
        </Link>
      </div>
    </main>
  );
}

function exportGeoJson(project: Project, features: ElementFeature[]) {
  const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.geojson`;
  link.click();
  URL.revokeObjectURL(url);
}

function Workspace({ project }: { project: Project }) {
  const {
    containerRef,
    features,
    selected,
    tool,
    mapError,
    saveFailed,
    ready,
    picking,
    pickedPoint,
    startPicking,
    clearPicked,
    setOverlay,
    addFeatures,
    selectTool,
    selectElement,
    clearSelection,
    updateProperties,
    deleteSelected,
  } = useNetworkEditor(project, MAPBOX_TOKEN);

  // Portas próximas: o ponto clicado é guardado; o resultado acompanha as edições da rede.
  const nearby = pickedPoint ? findNearbyPorts(pickedPoint, features) : null;
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPreview, setOfferPreview] = useState<Polygon[] | null>(null);
  useEffect(() => {
    if (pickedPoint) setOverlay(nearbyOverlay(findNearbyPorts(pickedPoint, features)));
    else if (offerOpen && offerPreview)
      setOverlay(offerPreview.map((geometry) => ({ type: "Feature", properties: { role: "offer" }, geometry })));
    else setOverlay([]);
  }, [pickedPoint, features, offerOpen, offerPreview, setOverlay]);

  // Nível óptico: equipamentos e ligações dentro dos nós.
  const [optical, setOptical] = useState<OpticalData>(() => loadOptical(project.id));
  const [diagramNodeId, setDiagramNodeId] = useState<string | null>(null);
  const [opticalSaveFailed, setOpticalSaveFailed] = useState(false);
  const opticalModel = buildOpticalModel(features, optical, project.id);
  const diagramNode = features.find((feature) => feature.id === diagramNodeId);

  function changeOptical(next: OpticalData) {
    setOptical(next);
    setOpticalSaveFailed(!saveOptical(project.id, next));
  }

  const fileInput = useRef<HTMLInputElement>(null);
  // Um projeto criado a partir de um arquivo já chega com a importação pendente.
  const [draft, setDraft] = useState<ImportDraft | null>(() => peekPendingImport(project.id));
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    setNotice(null);
    try {
      setDraft(await prepareImport(file));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  }

  function closeImport() {
    clearPendingImport(project.id);
    setDraft(null);
  }

  function handleImport(result: BuildResult) {
    addFeatures(result.features);
    const count = result.features.length.toLocaleString("pt-BR");
    setNotice(
      result.cables > 0
        ? `${count} elementos importados. ${result.connectedCables} de ${result.cables} cabos ligados nas duas pontas; o restante aparece nas pendências.`
        : `${count} elementos importados.`,
    );
    closeImport();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← Projetos
        </Link>
        <h1 className="truncate text-sm font-semibold text-slate-900">{project.name}</h1>
        <input
          ref={fileInput}
          type="file"
          accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
          className="sr-only"
          aria-label="Arquivo KML ou KMZ"
          onChange={handleFile}
        />
        <button
          type="button"
          aria-pressed={picking}
          onClick={picking ? clearPicked : startPicking}
          className={`ml-auto rounded-md border px-2.5 py-1 text-sm ${
            picking ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {picking ? "Clique no mapa…" : "Portas próximas"}
        </button>
        <button
          type="button"
          aria-pressed={offerOpen}
          onClick={() => {
            if (!offerOpen) {
              clearSelection();
              clearPicked();
            }
            setOfferOpen(!offerOpen);
            setOfferPreview(null);
          }}
          className={`rounded-md border px-2.5 py-1 text-sm ${
            offerOpen ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Portas para ofertar
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
        >
          Importar KML/KMZ
        </button>
        <button
          type="button"
          onClick={() => exportGeoJson(project, features)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
        >
          Exportar GeoJSON
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
          <Palette tool={tool} onSelect={selectTool} />
        </aside>
        <div className="relative min-w-0 flex-1">
          {/* O CSS do Mapbox impõe position: relative ao contêiner; o tamanho vem do wrapper. */}
          <div className="absolute inset-0">
            <div ref={containerRef} className="size-full" />
          </div>
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
            {[mapError, importError, saveFailed || opticalSaveFailed ? "A rede não coube no armazenamento do navegador: as alterações desta sessão não estão sendo salvas. Exporte o GeoJSON para não perder o trabalho." : null]
              .filter(Boolean)
              .map((message) => (
                <p key={message} role="alert" className="rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow">
                  {message}
                </p>
              ))}
            {notice && (
              <p role="status" className="pointer-events-auto flex items-start gap-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow">
                <span className="flex-1">{notice}</span>
                <button type="button" onClick={() => setNotice(null)} className="font-medium underline">
                  Fechar
                </button>
              </p>
            )}
          </div>
        </div>
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
          {/* Um elemento selecionado sempre mostra suas propriedades; sem seleção, o painel aberto. */}
          {!selected && offerOpen ? (
            <OfferPanel
              features={features}
              projectName={project.name}
              onSelect={selectElement}
              onPreview={setOfferPreview}
              onClose={() => {
                setOfferOpen(false);
                setOfferPreview(null);
              }}
            />
          ) : !selected && nearby ? (
            <NearbyPortsPanel
              result={nearby}
              onSelect={selectElement}
              onAgain={startPicking}
              onClose={clearPicked}
            />
          ) : (
            <Inspector
              features={features}
              selected={selected}
              onChange={updateProperties}
              onSelect={selectElement}
              onDelete={deleteSelected}
              optical={opticalModel}
              onOpenDiagram={setDiagramNodeId}
            />
          )}
        </aside>
      </div>
      {diagramNode && (
        <NodeDiagram
          key={diagramNode.id}
          node={diagramNode}
          projectId={project.id}
          model={opticalModel}
          data={optical}
          upstreamCableId={computeRoutes(features).get(diagramNode.id)?.cableIds.at(-1)}
          nameOf={(id) => features.find((feature) => feature.id === id)?.properties.name ?? "?"}
          onChange={changeOptical}
          onClose={() => setDiagramNodeId(null)}
        />
      )}
      {draft && (
        <ImportDialog draft={draft} existing={features} ready={ready} onImport={handleImport} onClose={closeImport} />
      )}
    </div>
  );
}

/** Renderizado só no cliente (ver EditorLoader): pode ler localStorage na montagem. */
export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project] = useState(() => getProject(projectId));

  if (!project) {
    return (
      <Notice title="Projeto não encontrado">
        <p>Este projeto não existe neste navegador. Os dados ainda ficam salvos localmente.</p>
      </Notice>
    );
  }
  if (!MAPBOX_TOKEN) {
    return (
      <Notice title="Token do Mapbox ausente">
        <p>
          Crie o arquivo <code>.env.local</code> na raiz com <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk…</code> e reinicie o
          servidor.
        </p>
      </Notice>
    );
  }
  return <Workspace project={project} />;
}
