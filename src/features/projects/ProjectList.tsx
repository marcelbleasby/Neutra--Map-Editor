"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProject, deleteProject, DEMO_COMPANY, listProjects } from "@/lib/storage";

const FIELD = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900";
const LABEL = "mb-1 block text-xs font-medium text-slate-600";

// Centro inicial padrão: São Paulo.
const DEFAULT_LAT = "-23.5505";
const DEFAULT_LNG = "-46.6333";

/** Renderizado só no cliente (ver ProjectListLoader): pode ler localStorage na montagem. */
export default function ProjectList() {
  const router = useRouter();
  const [projects, setProjects] = useState(listProjects);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const lat = Number(data.get("lat"));
    const lng = Number(data.get("lng"));
    if (!name) return setError("Informe o nome do projeto.");
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return setError("Latitude ou longitude inválida.");
    const project = createProject({
      name,
      description: String(data.get("description") ?? "").trim() || undefined,
      center: [lng, lat],
      zoom: 14,
    });
    router.push(`/projetos/${project.id}`);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o projeto "${name}" e toda a rede desenhada nele?`)) return;
    deleteProject(id);
    setProjects(listProjects());
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <header>
        <p className="text-sm text-slate-500">{DEMO_COMPANY.name}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Projetos</h1>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <section aria-label="Projetos da empresa">
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Nenhum projeto ainda. Crie o primeiro para começar a mapear a rede.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <Link href={`/projetos/${project.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{project.name}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {project.description ?? "Sem descrição"} · atualizado em{" "}
                      {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(project.id, project.name)}
                    className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Novo projeto</h2>
          <label>
            <span className={LABEL}>Nome</span>
            <input name="name" className={FIELD} placeholder="Ex.: Expansão Zona Norte" />
          </label>
          <label>
            <span className={LABEL}>Descrição</span>
            <input name="description" className={FIELD} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={LABEL}>Latitude</span>
              <input name="lat" className={FIELD} inputMode="decimal" defaultValue={DEFAULT_LAT} />
            </label>
            <label>
              <span className={LABEL}>Longitude</span>
              <input name="lng" className={FIELD} inputMode="decimal" defaultValue={DEFAULT_LNG} />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Criar e abrir editor
          </button>
        </form>
      </div>
    </main>
  );
}
