"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { centerOf } from "@/features/import/build";
import { prepareImport, setPendingImport } from "@/features/import/draft";
import { Button, FIELD, LABEL } from "@/components/ui";
import { createProject, deleteProject, DEMO_COMPANY, listProjects } from "@/lib/storage";


// Centro inicial padrão: São Paulo.
const DEFAULT_LAT = "-23.5505";
const DEFAULT_LNG = "-46.6333";

/** Renderizado só no cliente (ver ProjectListLoader): pode ler localStorage na montagem. */
export default function ProjectList() {
  const router = useRouter();
  const [projects, setProjects] = useState(listProjects);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const lat = Number(data.get("lat"));
    const lng = Number(data.get("lng"));
    const file = data.get("file");
    if (!name) return setError("Informe o nome do projeto.");
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return setError("Latitude ou longitude inválida.");

    // Com arquivo, o mapa abre na rede importada e o editor já mostra a revisão.
    let draft = null;
    if (file instanceof File && file.size > 0) {
      try {
        draft = await prepareImport(file);
      } catch (cause) {
        return setError(cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.");
      }
    }
    const project = createProject({
      name,
      description: String(data.get("description") ?? "").trim() || undefined,
      center: (draft && centerOf(draft.placemarks)) ?? [lng, lat],
      zoom: 14,
    });
    if (draft) setPendingImport(project.id, draft);
    router.push(`/projetos/${project.id}`);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o projeto "${name}" e toda a rede desenhada nele?`)) return;
    deleteProject(id);
    setProjects(listProjects());
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:gap-8 md:py-10">
      <header>
        <p className="text-sm text-ink-muted">{DEMO_COMPANY.name}</p>
        <h1 className="text-3xl font-semibold text-ink">Projetos</h1>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <section aria-label="Projetos da empresa">
          {projects.length === 0 ? (
            <p className="rounded-md border-2 border-dashed border-line bg-plate p-6 text-ink-soft">
              Nenhum projeto ainda. Crie o primeiro ao lado, do zero ou a partir do KMZ da sua rede.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center gap-2 rounded-md border border-line bg-plate py-1 pr-1 pl-1 hover:border-ink"
                >
                  <Link href={`/projetos/${project.id}`} className="min-w-0 flex-1 rounded px-3 py-2">
                    <span className="block truncate text-lg font-semibold text-ink">{project.name}</span>
                    {project.description && (
                      <span className="block truncate text-sm text-ink-soft">{project.description}</span>
                    )}
                    <span className="block text-sm text-ink-muted">
                      Atualizado em {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                  <Button
                    variant="quiet"
                    onClick={() => handleDelete(project.id, project.name)}
                    aria-label={`Excluir o projeto ${project.name}`}
                    className="text-danger hover:bg-danger-soft"
                  >
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 self-start rounded-md border border-line bg-plate p-4">
          <h2 className="text-lg font-semibold text-ink">Novo projeto</h2>
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
          <label>
            <span className={LABEL}>Arquivo da rede, KML ou KMZ (opcional)</span>
            <input
              name="file"
              type="file"
              accept=".kml,.kmz"
              className="w-full text-sm text-ink-soft file:mr-2 file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-plate file:px-3 file:text-sm file:font-medium file:text-ink"
            />
            <span className="mt-1 block text-sm text-ink-muted">
              Com arquivo, o mapa abre na rede importada e a posição acima é ignorada.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="mt-1">
            Criar e abrir o editor
          </Button>
        </form>
      </div>
    </main>
  );
}
