"use client";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import turfLength from "@turf/length";
import mapboxgl from "mapbox-gl";
import type { Feature, Position } from "geojson";
import { useCallback, useEffect, useRef, useState } from "react";
import { ELEMENTS } from "@/domain/catalog";
import type { ElementKind, Id, Project } from "@/domain/types";
import { sharedRings } from "@/features/neutral/neutral";
import { loadFeatures, saveFeatures } from "@/lib/storage";
import { DRAW_STYLES } from "./drawStyles";
import { defaultProperties, type ElementFeature, type ElementProperties } from "./model";
import { detachNodes, followNode, snapCable, type Projector } from "./topology";

const OVERLAY_SOURCE = "neutra-overlay";
const SHARED_COLOR = "#7c3aed";
const FEASIBILITY_COLOR = "#0369a1";
const byRole = (role: string) => ["==", ["get", "role"], role];

const OVERLAY_LAYERS: mapboxgl.LayerSpecification[] = [
  {
    id: "neutra-feasibility-radius",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: byRole("radius"),
    paint: { "fill-color": FEASIBILITY_COLOR, "fill-opacity": 0.08 },
  },
  {
    id: "neutra-feasibility-radius-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: byRole("radius"),
    paint: { "line-color": FEASIBILITY_COLOR, "line-width": 1.5, "line-dasharray": [3, 2] },
  },
  {
    id: "neutra-feasibility-link",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: byRole("link"),
    paint: {
      "line-color": FEASIBILITY_COLOR,
      "line-width": 1.5,
      // CTO sem porta livre: linha apagada.
      "line-opacity": ["case", [">", ["get", "free"], 0], 0.9, 0.3],
    },
  },
  {
    id: "neutra-feasibility-point",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: byRole("point"),
    paint: {
      "circle-radius": 6,
      "circle-color": FEASIBILITY_COLOR,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  },
  {
    // Anel em volta da CTO com porta compartilhada; cheio quando há porta livre para ofertar.
    id: "neutra-shared-ring",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: byRole("shared"),
    paint: {
      "circle-radius": 14,
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": SHARED_COLOR,
      "circle-stroke-width": 2.5,
      "circle-stroke-opacity": ["case", [">", ["get", "sharedFree"], 0], 1, 0.35],
    },
  },
];

const DRAW_MODE = {
  Point: "draw_point",
  LineString: "draw_line_string",
  Polygon: "draw_polygon",
} as const;

/**
 * Liga o Mapbox GL Draw ao modelo do editor.
 *
 * O Draw é a fonte de verdade das geometrias enquanto a página está aberta;
 * `features` é o espelho em estado React usado pelos painéis. Toda alteração
 * (desenho, arraste, edição no inspetor) passa por `commit`, que atualiza o
 * espelho e persiste.
 */
export function useNetworkEditor(project: Project, accessToken: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pendingKindRef = useRef<ElementKind | null>(null);

  const [features, setFeatures] = useState<ElementFeature[]>([]);
  const [selectedId, setSelectedId] = useState<Id | null>(null);
  const [tool, setTool] = useState<ElementKind | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const commitRef = useRef<() => void>(() => {});
  // Camada de apoio por cima do Draw: anéis de CTO com porta compartilhada e o
  // desenho da consulta de viabilidade.
  const overlayRef = useRef<{ rings: Feature[]; extra: Feature[] }>({ rings: [], extra: [] });
  const renderOverlayRef = useRef<() => void>(() => {});
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  const [pickedPoint, setPickedPoint] = useState<Position | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new mapboxgl.Map({
      container,
      accessToken,
      style: "mapbox://styles/mapbox/streets-v12",
      center: project.center,
      zoom: project.zoom,
    });
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      styles: DRAW_STYLES,
    });
    map.addControl(draw);
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");
    drawRef.current = draw;
    mapRef.current = map;

    // Posição de cada nó no último estado salvo: ao mover um poste, é por ela que
    // se acha o vértice do cabo que deve acompanhá-lo.
    const lastPositions = new Map<Id, Position>();

    const projector: Projector = (position) => map.project(position as [number, number]);

    // Features ainda em desenho não têm `kind`; ficam fora do modelo.
    const elements = () =>
      (draw.getAll().features as ElementFeature[]).filter((feature) => feature.properties?.kind);

    /** Atualiza o espelho em estado React sem gravar. */
    const mirror = () => {
      const current = elements();
      lastPositions.clear();
      for (const feature of current) {
        if (feature.geometry.type === "Point") lastPositions.set(feature.id, feature.geometry.coordinates);
      }
      setFeatures(current);
      overlayRef.current.rings = sharedRings(current);
      renderOverlayRef.current();
      return current;
    };

    renderOverlayRef.current = () => {
      const source = map.getSource(OVERLAY_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      const { rings, extra } = overlayRef.current;
      source?.setData({ type: "FeatureCollection", features: [...extra, ...rings] });
    };

    const commit = () => {
      setSaveFailed(!saveFeatures(project.id, { type: "FeatureCollection", features: mirror() }));
    };
    commitRef.current = commit;

    /** Gruda as pontas nos nós próximos e recalcula o comprimento. */
    const settleCable = (cable: ElementFeature, others: ElementFeature[]): ElementFeature => {
      if (cable.geometry.type !== "LineString") return cable;
      const snapped = snapCable(cable.geometry, others, projector);
      const geometry = { type: "LineString" as const, coordinates: snapped.coordinates };
      return {
        ...cable,
        geometry,
        properties: {
          ...cable.properties,
          fromNodeId: snapped.fromNodeId,
          toNodeId: snapped.toNodeId,
          viaNodeIds: snapped.viaNodeIds,
          lengthMeters: Math.round(
            turfLength({ type: "Feature", geometry, properties: {} }, { units: "kilometers" }) * 1000,
          ),
        },
      };
    };

    map.on("load", () => {
      map.addSource(OVERLAY_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      for (const layer of OVERLAY_LAYERS) map.addLayer(layer);
      draw.set(loadFeatures(project.id));
      mirror();
      setReady(true);
    });

    map.on("click", (event) => {
      if (!pickingRef.current) return;
      pickingRef.current = false;
      setPicking(false);
      map.getCanvas().style.cursor = "";
      setPickedPoint([event.lngLat.lng, event.lngLat.lat]);
    });

    map.on("error", (event) => {
      setMapError(event.error?.message ?? "Erro ao carregar o mapa");
    });

    map.on("draw.create", (event: MapboxDraw.DrawCreateEvent) => {
      const kind = pendingKindRef.current;
      if (!kind) return;
      for (const drawn of event.features) {
        const others = elements();
        const element = {
          ...drawn,
          properties: defaultProperties(kind, others),
        } as ElementFeature;
        draw.add(settleCable(element, others));
      }
      commit();
    });

    map.on("draw.update", (event: MapboxDraw.DrawUpdateEvent) => {
      for (const updated of event.features as ElementFeature[]) {
        const others = elements().filter((feature) => feature.id !== updated.id);
        if (updated.geometry.type === "Point") {
          const previous = lastPositions.get(updated.id);
          for (const cable of followNode(updated, previous, others)) draw.add(settleCable(cable, elements()));
        } else {
          draw.add(settleCable(updated, others));
        }
      }
      commit();
    });

    map.on("draw.delete", (event: MapboxDraw.DrawDeleteEvent) => {
      const removedIds = event.features.map((feature) => String(feature.id));
      for (const cable of detachNodes(removedIds, elements())) draw.add(cable);
      setSelectedId(null);
      commit();
    });

    map.on("draw.selectionchange", (event: MapboxDraw.DrawSelectionChangeEvent) => {
      const selected = event.features[0];
      setSelectedId(selected?.properties?.kind ? String(selected.id) : null);
    });

    map.on("draw.modechange", (event: MapboxDraw.DrawModeChangeEvent) => {
      if (!event.mode.startsWith("draw_")) {
        pendingKindRef.current = null;
        setTool(null);
      }
    });

    return () => {
      drawRef.current = null;
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
  }, [project, accessToken]);

  /** Ativa a ferramenta de desenho de um tipo de elemento (ou volta à seleção com `null`). */
  const selectTool = useCallback((kind: ElementKind | null) => {
    const draw = drawRef.current;
    if (!draw) return;
    pendingKindRef.current = kind;
    setTool(kind);
    // O tipo de changeMode não aceita a união dos modos de desenho; os três têm a mesma assinatura.
    if (kind) draw.changeMode(DRAW_MODE[ELEMENTS[kind].geometry] as "draw_point");
    else draw.changeMode("simple_select");
  }, []);

  /** Altera propriedades de um elemento pelo inspetor. */
  const updateProperties = useCallback(
    (id: Id, patch: Partial<ElementProperties>) => {
      const draw = drawRef.current;
      const feature = draw?.get(id) as ElementFeature | undefined;
      if (!draw || !feature) return;
      draw.add({ ...feature, properties: { ...feature.properties, ...patch } });
      commitRef.current();
    },
    [],
  );

  /** Acrescenta elementos prontos (importação) e enquadra o mapa neles. */
  const addFeatures = useCallback((added: ElementFeature[]) => {
    const draw = drawRef.current;
    if (!draw || added.length === 0) return;
    draw.add({ type: "FeatureCollection", features: added });
    commitRef.current();
    const bounds = new mapboxgl.LngLatBounds();
    for (const { geometry } of added) {
      const positions =
        geometry.type === "Point"
          ? [geometry.coordinates]
          : geometry.type === "LineString"
            ? geometry.coordinates
            : geometry.coordinates[0];
      for (const position of positions) bounds.extend(position as [number, number]);
    }
    mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 0 });
  }, []);

  /** Seleciona um elemento e leva o mapa até ele (usado pela lista de pendências). */
  const selectElement = useCallback((id: Id) => {
    const draw = drawRef.current;
    const feature = draw?.get(id) as ElementFeature | undefined;
    if (!draw || !feature) return;
    pendingKindRef.current = null;
    setTool(null);
    // changeMode pela API não dispara draw.selectionchange.
    draw.changeMode("simple_select", { featureIds: [id] });
    setSelectedId(id);
    const { geometry } = feature;
    const anchor =
      geometry.type === "Point"
        ? geometry.coordinates
        : geometry.type === "LineString"
          ? geometry.coordinates[Math.floor(geometry.coordinates.length / 2)]
          : geometry.coordinates[0][0];
    mapRef.current?.easeTo({ center: anchor as [number, number] });
  }, []);

  /** Tira a seleção, para um painel do projeto poder ocupar o lugar das propriedades. */
  const clearSelection = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    pendingKindRef.current = null;
    setTool(null);
    draw.changeMode("simple_select");
    setSelectedId(null);
  }, []);

  /** O próximo clique no mapa vira `pickedPoint` (consulta de viabilidade). */
  const startPicking = useCallback(() => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;
    pendingKindRef.current = null;
    setTool(null);
    draw.changeMode("simple_select");
    setSelectedId(null);
    pickingRef.current = true;
    setPicking(true);
    map.getCanvas().style.cursor = "crosshair";
  }, []);

  const clearPicked = useCallback(() => {
    pickingRef.current = false;
    setPicking(false);
    setPickedPoint(null);
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = "";
  }, []);

  /** Desenho de apoio no mapa (raio e linhas da viabilidade); `[]` apaga. */
  const setOverlay = useCallback((extra: Feature[]) => {
    overlayRef.current.extra = extra;
    renderOverlayRef.current();
  }, []);

  const deleteSelected = useCallback(() => {
    // `trash` dispara draw.delete, que cuida de desligar cabos e persistir.
    drawRef.current?.trash();
  }, []);

  return {
    containerRef,
    features,
    selected: features.find((feature) => feature.id === selectedId) ?? null,
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
  };
}
