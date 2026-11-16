import { ELEMENTS, ELEMENT_KINDS } from "@/domain/catalog";

// O mesmo amarelo de etiqueta do painel (docs/16-design.md).
const SELECTED = "#ffc700";
const FALLBACK = "#3b82f6";

const isActive = ["==", ["get", "active"], "true"];

/** `match` do Mapbox que resolve a cor pelo tipo do elemento (propriedade `user_kind`). */
const colorByKind = [
  "match",
  ["get", "user_kind"],
  ...ELEMENT_KINDS.flatMap((kind) => [kind, ELEMENTS[kind].color]),
  FALLBACK,
];

const isPlanned = ["==", ["get", "user_status"], "planned"];

/**
 * Estilos do Mapbox GL Draw. Com `userProperties: true` as propriedades da
 * feature chegam prefixadas com `user_`, o que permite colorir por tipo.
 */
export const DRAW_STYLES: object[] = [
  {
    id: "neutra-area-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"]],
    paint: { "fill-color": colorByKind, "fill-opacity": 0.12 },
  },
  {
    id: "neutra-area-outline",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["case", isActive, SELECTED, colorByKind],
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  },
  {
    id: "neutra-cable-casing",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": SELECTED, "line-width": 9, "line-opacity": 0.45 },
  },
  {
    id: "neutra-cable",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": colorByKind,
      "line-width": [
        "match",
        ["get", "user_kind"],
        "cable_backbone",
        5,
        "cable_distribution",
        3.5,
        2,
      ],
      "line-opacity": ["case", isPlanned, 0.65, 1],
    },
  },
  {
    id: "neutra-node-halo",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
    paint: {
      "circle-radius": ["match", ["get", "user_kind"], "pop", 13, ["ceo", "cto"], 10, 7],
      "circle-color": ["case", isActive, SELECTED, "#ffffff"],
    },
  },
  {
    id: "neutra-node",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
    paint: {
      "circle-radius": ["match", ["get", "user_kind"], "pop", 10, ["ceo", "cto"], 7, 4.5],
      "circle-color": colorByKind,
      "circle-opacity": ["case", isPlanned, 0.7, 1],
    },
  },
  {
    id: "neutra-vertex-halo",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"], ["!=", "mode", "simple_select"]],
    paint: { "circle-radius": ["case", isActive, 7, 5], "circle-color": "#ffffff" },
  },
  {
    id: "neutra-vertex",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"], ["!=", "mode", "simple_select"]],
    paint: { "circle-radius": ["case", isActive, 5, 3], "circle-color": SELECTED },
  },
  {
    id: "neutra-midpoint",
    type: "circle",
    filter: ["all", ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 3, "circle-color": SELECTED },
  },
];
