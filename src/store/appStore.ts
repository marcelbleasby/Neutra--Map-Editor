import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { KMLFile } from '../types';

// Types for the store
export interface MapLayer {
  id: string;
  name: string;
  data: GeoJSON.FeatureCollection;
  visible: boolean;
  color?: string;
}

export interface TOCItem {
  id: string;
  name: string;
  children?: TOCItem[];
  visible: boolean;
  layerId?: string;
}

export interface UserPreferences {
  defaultMapStyle: string;
  defaultZoom: number;
  defaultCenter: [number, number];
  theme: 'light' | 'dark';
}

// Novos tipos para arquivos
export interface FileState {
  files: KMLFile[];
  selectedFile: KMLFile | null;
  isLoadingFiles: boolean;
  searchQuery: string;
  currentPage: number;
  totalFiles: number;
}

interface AppState {
  // Map layers
  layers: MapLayer[];
  activeLayers: string[];

  // Table of Contents
  tocItems: TOCItem[];

  // User preferences
  preferences: UserPreferences;

  // UI state
  isLoading: boolean;
  selectedFeatures: GeoJSON.Feature[];

  // Estado dos arquivos
  fileState: FileState;

  // Actions
  addLayer: (layer: MapLayer) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<MapLayer>) => void;

  updateTOC: (items: TOCItem[]) => void;
  toggleTOCItemVisibility: (itemId: string) => void;

  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setLoading: (loading: boolean) => void;
  setSelectedFeatures: (features: GeoJSON.Feature[]) => void;

  // Ações para arquivos
  setFiles: (files: KMLFile[]) => void;
  setSelectedFile: (file: KMLFile | null) => void;
  setLoadingFiles: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setTotalFiles: (total: number) => void;
}

const defaultPreferences: UserPreferences = {
  defaultMapStyle: 'mapbox://styles/mapbox/streets-v11',
  defaultZoom: 10,
  defaultCenter: [-46.6333, -23.5505], // São Paulo
  theme: 'light',
};

const defaultFileState: FileState = {
  files: [],
  selectedFile: null,
  isLoadingFiles: false,
  searchQuery: '',
  currentPage: 1,
  totalFiles: 0,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      layers: [],
      activeLayers: [],
      tocItems: [],
      preferences: defaultPreferences,
      isLoading: false,
      selectedFeatures: [],

      // Estado inicial dos arquivos
      fileState: defaultFileState,

      // Actions
      addLayer: (layer) =>
        set((state) => ({
          layers: [...state.layers, layer],
          activeLayers: layer.visible ? [...state.activeLayers, layer.id] : state.activeLayers,
        })),

      removeLayer: (layerId) =>
        set((state) => ({
          layers: state.layers.filter((layer) => layer.id !== layerId),
          activeLayers: state.activeLayers.filter((id) => id !== layerId),
        })),

      toggleLayerVisibility: (layerId) =>
        set((state) => {
          const layer = state.layers.find((l) => l.id === layerId);
          if (!layer) return state;

          const updatedLayers = state.layers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
          );

          const updatedActiveLayers = layer.visible
            ? state.activeLayers.filter((id) => id !== layerId)
            : [...state.activeLayers, layerId];

          return {
            layers: updatedLayers,
            activeLayers: updatedActiveLayers,
          };
        }),

      updateLayer: (layerId, updates) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === layerId ? { ...layer, ...updates } : layer
          ),
        })),

      updateTOC: (items) => set({ tocItems: items }),

      toggleTOCItemVisibility: (itemId) =>
        set((state) => {
          const toggleVisibility = (items: TOCItem[]): TOCItem[] =>
            items.map((item) => {
              if (item.id === itemId) {
                const newVisibility = !item.visible;
                // If it's linked to a layer, update the layer visibility too
                if (item.layerId) {
                  get().toggleLayerVisibility(item.layerId);
                }
                return { ...item, visible: newVisibility };
              }
              if (item.children) {
                return { ...item, children: toggleVisibility(item.children) };
              }
              return item;
            });

          return { tocItems: toggleVisibility(state.tocItems) };
        }),

      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setSelectedFeatures: (features) => set({ selectedFeatures: features }),

      // Implementações das ações para arquivos
      setFiles: (files) =>
        set((state) => ({
          fileState: { ...state.fileState, files },
        })),

      setSelectedFile: (file) =>
        set((state) => ({
          fileState: { ...state.fileState, selectedFile: file },
        })),

      setLoadingFiles: (loading) =>
        set((state) => ({
          fileState: { ...state.fileState, isLoadingFiles: loading },
        })),

      setSearchQuery: (query) =>
        set((state) => ({
          fileState: { ...state.fileState, searchQuery: query, currentPage: 1 },
        })),

      setCurrentPage: (page) =>
        set((state) => ({
          fileState: { ...state.fileState, currentPage: page },
        })),

      setTotalFiles: (total) =>
        set((state) => ({
          fileState: { ...state.fileState, totalFiles: total },
        })),
    }),
    {
      name: 'neutra-map-editor-store',
    }
  )
);
