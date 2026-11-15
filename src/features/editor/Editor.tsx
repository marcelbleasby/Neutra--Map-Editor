"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/domain/types";
import { DEMO_PROVIDERS, getProject } from "@/lib/storage";
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
  const { containerRef, features, selected, tool, mapError, selectTool, updateProperties, deleteSelected } =
    useNetworkEditor(project, MAPBOX_TOKEN);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← Projetos
        </Link>
        <h1 className="truncate text-sm font-semibold text-slate-900">{project.name}</h1>
        <button
          type="button"
          onClick={() => exportGeoJson(project, features)}
          className="ml-auto rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
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
          {mapError && (
            <p role="alert" className="absolute inset-x-3 top-3 rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow">
              {mapError}
            </p>
          )}
        </div>
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
          <Inspector
            features={features}
            selected={selected}
            providers={DEMO_PROVIDERS}
            onChange={updateProperties}
            onDelete={deleteSelected}
          />
        </aside>
      </div>
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
