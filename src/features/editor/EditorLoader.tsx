"use client";

import dynamic from "next/dynamic";

/** mapbox-gl e localStorage só existem no navegador: o editor não é renderizado no servidor. */
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-slate-500">Carregando editor…</p>,
});

export function EditorLoader() {
  return <Editor />;
}
