/**
 * Nomes dos campos que o editor grava no `ExtendedData` de cada Placemark do KMZ
 * e lê de volta na importação. Mudar um nome quebra a leitura de arquivos já
 * publicados.
 */
export const FIELDS = {
  /** Campo do esquema `neutra-assets-v1` da geo: é por ele que a geo classifica. */
  assetType: "asset_type",
  /** Tipo do editor, mais detalhado que o da geo (POP, assinante, tipo de cabo). */
  kind: "neutra_tipo",
  status: "situacao",
  fibers: "fibras",
  lengthMeters: "comprimento_m",
  from: "origem",
  to: "destino",
  split: "splitter",
  ports: "portas",
  sharedPorts: "portas_compartilhadas",
  busyPorts: "portas_em_uso",
  reservedPorts: "portas_reservadas",
  defectivePorts: "portas_com_defeito",
  sharedFree: "compartilhadas_livres",
  /** Marca o que o editor gera sozinho (área atendida): é descartado ao reabrir. */
  generated: "gerado_pelo_editor",
} as const;

export const ASSET_SCHEMA = "neutra-assets-v1";

/** "1,2,7" → [1, 2, 7]. */
export function readPortList(text: string | undefined): number[] {
  return (text ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}
