"use client";

import dynamic from "next/dynamic";

const ProjectList = dynamic(() => import("./ProjectList"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-slate-500">Carregando projetos…</p>,
});

export function ProjectListLoader() {
  return <ProjectList />;
}
