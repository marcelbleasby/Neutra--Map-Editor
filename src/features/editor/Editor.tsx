"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import { ArrowLeft, ChevronDown, ChevronUp, Crosshair, FileDown, FileUp, Store, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/domain/types";
import type { BuildResult } from "@/features/import/build";
import { clearPendingImport, peekPendingImport, prepareImport, type ImportDraft } from "@/features/import/draft";
import { ImportDialog } from "@/features/import/ImportDialog";
import { buildOpticalModel, type OpticalData } from "@/features/diagram/model";
import { NodeDiagram } from "@/features/diagram/NodeDiagram";
import type { Polygon } from "geojson";
import { buildKmz, MAX_KMZ_BYTES } from "@/features/publish/kmz";
import { NearbyPortsPanel } from "@/features/neutral/NearbyPortsPanel";
import { OfferPanel } from "@/features/neutral/OfferPanel";
import { findNearbyPorts, nearbyOverlay } from "@/features/neutral/neutral";
import { getProject, loadOptical, saveOptical } from "@/lib/storage";
import { computeRoutes } from "./network";
import { Inspector } from "./Inspector";
import type { ElementFeature } from "./model";
import { Palette, paletteHint } from "./Palette";
import { useNetworkEditor } from "./useNetworkEditor";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-line-soft bg-plate p-6 text-sm text-ink-soft">
        <h1 className="mb-2 text-base font-semibold text-ink">{title}</h1>
        {children}
        <Link href="/" className="mt-4 inline-block font-medium text-signal hover:underline">
          Voltar aos projetos
        </Link>
      </div>
    </main>
  );
}

function downloadKmz(project: Project, features: ElementFeature[]): string {
  const { kmz, summary } = buildKmz(project.name, features);
  if (kmz.byteLength > MAX_KMZ_BYTES) return "O KMZ passou de 50 MB, o limite da plataforma. Divida o projeto.";
  const url = URL.createObjectURL(new Blob([kmz as BlobPart], { type: "application/vnd.google-earth.kmz" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.kmz`;
  link.click();
  URL.revokeObjectURL(url);
  if (summary.polygons === 0) {
    return "KMZ gerado sem nenhum polígono: na plataforma ele não dá cobertura. Posicione CTOs ou desenhe uma área de cobertura.";
  }
  return `KMZ gerado com ${summary.elements} elementos e ${summary.polygons} ${summary.polygons === 1 ? "polígono" : "polígonos"}. Para publicar, envie como nova versão do arquivo na plataforma.`;
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

  // No celular o painel é uma gaveta. Ela abre sozinha quando o assunto muda
  // (outro elemento, outro painel) e o técnico pode recolhê-la para ver o mapa.
  const sheetKey = selected?.id ?? (offerOpen ? "offer" : nearby ? "nearby" : "summary");
  const [collapsedKey, setCollapsedKey] = useState<string | null>("summary");
  const sheetOpen = collapsedKey !== sheetKey;
  const sheetTitle = selected ? selected.properties.name : offerOpen ? "Portas para ofertar" : nearby ? "Portas próximas" : "Resumo do projeto";
  const hint = paletteHint(tool) ?? (picking ? "Toque no ponto que quer consultar." : null);
  const alerts = [
    mapError,
    importError,
    saveFailed || opticalSaveFailed
      ? "A rede não coube no armazenamento do navegador: as alterações desta sessão não estão sendo salvas. Gere o KMZ para não perder o trabalho."
      : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-plate px-3 py-2 md:px-4">
        <Link
          href="/"
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-sm text-ink-soft hover:bg-concrete hover:text-ink pointer-coarse:min-h-11"
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Projetos</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{project.name}</h1>
        <input
          ref={fileInput}
          type="file"
          accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
          className="sr-only"
          aria-label="Arquivo KML ou KMZ"
          onChange={handleFile}
        />
        {/* Duas famílias de ação: o arquivo da rede e a rede neutra. */}
        <div className="flex w-full gap-2 overflow-x-auto md:w-auto md:overflow-visible">
          <div role="group" aria-label="Arquivo da rede" className="flex shrink-0 gap-1.5">
            <Button onClick={() => fileInput.current?.click()}>
              <FileUp aria-hidden className="size-4" />
              Importar
            </Button>
            <Button variant="primary" onClick={() => setNotice(downloadKmz(project, features))}>
              <FileDown aria-hidden className="size-4" />
              Gerar KMZ
            </Button>
          </div>
          <span aria-hidden className="w-px shrink-0 self-stretch bg-line" />
          <div role="group" aria-label="Rede neutra" className="flex shrink-0 gap-1.5">
            <Button pressed={picking} onClick={picking ? clearPicked : startPicking}>
              <Crosshair aria-hidden className="size-4" />
              Portas próximas
            </Button>
            <Button
              pressed={offerOpen}
              onClick={() => {
                if (!offerOpen) {
                  clearSelection();
                  clearPicked();
                }
                setOfferOpen(!offerOpen);
                setOfferPreview(null);
              }}
            >
              <Store aria-hidden className="size-4" />
              Portas para ofertar
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-line bg-plate max-md:border-b md:w-56 md:overflow-y-auto md:border-r">
          <Palette tool={tool} onSelect={selectTool} />
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1">
          {/* O CSS do Mapbox impõe position: relative ao contêiner; o tamanho vem do wrapper. */}
          <div className="absolute inset-0">
            <div ref={containerRef} className="size-full" />
          </div>
          <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-col items-start gap-2 md:inset-x-3 md:top-3">
            {alerts.map((message) => (
              <p key={message} role="alert" className="max-w-xl rounded-md border-2 border-danger bg-plate px-3 py-2 text-sm font-medium text-danger shadow-sm">
                {message}
              </p>
            ))}
            {notice && (
              <div role="status" className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-md bg-ink px-3 py-2 text-sm text-white shadow-md">
                <p className="flex-1 py-0.5">{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  aria-label="Fechar aviso"
                  className="-mr-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-plate/15 pointer-coarse:size-10"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            )}
            {hint && (
              <p aria-live="polite" className="max-w-md rounded-md border border-ink bg-tag px-3 py-1.5 text-sm font-medium text-ink shadow-sm md:hidden">
                {hint}
              </p>
            )}
          </div>
        </div>

        <aside
          aria-label="Painel"
          className="flex shrink-0 flex-col border-line bg-plate max-md:max-h-[42dvh] max-md:border-t md:w-80 md:border-l"
        >
          <button
            type="button"
            aria-expanded={sheetOpen}
            onClick={() => setCollapsedKey(sheetOpen ? sheetKey : null)}
            className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left md:hidden"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{sheetTitle}</span>
            {sheetOpen ? <ChevronDown aria-hidden className="size-5" /> : <ChevronUp aria-hidden className="size-5" />}
            <span className="sr-only">{sheetOpen ? "Recolher painel" : "Abrir painel"}</span>
          </button>
          <div className={`min-h-0 flex-1 overflow-y-auto p-3 md:p-4 ${sheetOpen ? "" : "max-md:hidden"}`}>
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
          </div>
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
