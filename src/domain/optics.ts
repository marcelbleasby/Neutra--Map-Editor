/**
 * Regras ópticas puras (sem mapa, sem React). Valores típicos de projeto GPON;
 * devem virar configuração por projeto quando houver backend.
 */

/** Perda típica de splitter balanceado 1:N, em dB (inclui excesso). */
export const SPLITTER_LOSS_DB: Record<number, number> = {
  2: 3.7,
  4: 7.3,
  8: 10.5,
  16: 13.7,
  32: 17.1,
  64: 20.5,
};

export const FIBER_LOSS_DB_PER_KM = 0.35; // 1310 nm (upstream), pior caso
export const FUSION_LOSS_DB = 0.1;
export const CONNECTOR_LOSS_DB = 0.5;

/** Orçamento GPON classe B+: potência máxima perdida entre OLT e ONU. */
export const GPON_B_PLUS_BUDGET_DB = 28;

export interface OpticalPath {
  lengthMeters: number;
  /** Razões dos splitters em cascata, na ordem (ex.: [8, 8] = 1:8 + 1:8). */
  splitRatios: number[];
  fusions: number;
  connectors: number;
}

/** Atenuação total estimada de um caminho OLT → ONU, em dB. */
export function pathLossDb(path: OpticalPath): number {
  const splitters = path.splitRatios.reduce((sum, ratio) => {
    const loss = SPLITTER_LOSS_DB[ratio];
    if (loss === undefined) throw new Error(`Razão de splitter não suportada: 1:${ratio}`);
    return sum + loss;
  }, 0);
  return (
    (path.lengthMeters / 1000) * FIBER_LOSS_DB_PER_KM +
    splitters +
    path.fusions * FUSION_LOSS_DB +
    path.connectors * CONNECTOR_LOSS_DB
  );
}

/** Quantos assinantes uma porta PON atende com essa cascata de splitters. */
export function totalSplit(splitRatios: number[]): number {
  return splitRatios.reduce((product, ratio) => product * ratio, 1);
}

/** Cores padrão ABNT NBR 14771 para fibras e tubos, na ordem de contagem. */
export const FIBER_COLORS = [
  { name: "Verde", hex: "#16a34a" },
  { name: "Amarelo", hex: "#eab308" },
  { name: "Branco", hex: "#f8fafc" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Vermelho", hex: "#dc2626" },
  { name: "Violeta", hex: "#7c3aed" },
  { name: "Marrom", hex: "#78350f" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Preto", hex: "#0f172a" },
  { name: "Cinza", hex: "#64748b" },
  { name: "Laranja", hex: "#ea580c" },
  { name: "Água-marinha", hex: "#06b6d4" },
] as const;

/** Tubo (1-based) e posição no tubo (1-based) da fibra número `n` (1-based) do cabo. */
export function fiberPosition(n: number, fibersPerTube: number) {
  if (n < 1 || fibersPerTube < 1) throw new Error("Numeração de fibra começa em 1");
  return {
    tube: Math.ceil(n / fibersPerTube),
    indexInTube: ((n - 1) % fibersPerTube) + 1,
  };
}
