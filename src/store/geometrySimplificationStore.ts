import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import * as turf from '@turf/turf';
import { useAppStore } from './appStore';

interface GeometrySimplificationState {
  // Estado da simplificação
  isSimplifying: boolean;
  selectedLayerId: string | null;
  tolerance: number;
  previewMode: boolean;
  
  // Dados originais e simplificados
  originalGeometries: Map<string, GeoJSON.Feature[]>;
  simplifiedGeometries: Map<string, GeoJSON.Feature[]>;
  simplificationStats: SimplificationStats | null;
  
  // Configurações
  minTolerance: number;
  maxTolerance: number;
  defaultTolerance: number;
  
  // Ações
  setSelectedLayer: (layerId: string | null) => void;
  setTolerance: (tolerance: number) => void;
  startPreview: () => Promise<void>;
  applySimplification: () => Promise<void>;
  revertToOriginal: () => void;
  resetSimplification: () => void;
}

interface SimplificationStats {
  originalVertices: number;
  simplifiedVertices: number;
  reductionPercentage: number;
  processTime: number;
  layerId: string;
  layerName: string;
}

export const useGeometrySimplificationStore = create<GeometrySimplificationState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Estado inicial
      isSimplifying: false,
      selectedLayerId: null,
      tolerance: 0.001, // em graus (aproximadamente 100m no equador)
      previewMode: false,
      
      originalGeometries: new Map(),
      simplifiedGeometries: new Map(),
      simplificationStats: null,
      
      // Configurações baseadas no Mapbox
      minTolerance: 0.0001, // ~10m
      maxTolerance: 0.01,   // ~1km
      defaultTolerance: 0.001, // ~100m
      
      setSelectedLayer: (layerId) => {
        const state = get();
        
        // Reset se mudou de camada
        if (state.selectedLayerId !== layerId) {
          set({
            selectedLayerId: layerId,
            previewMode: false,
            simplificationStats: null
          });
        }
      },
      
      setTolerance: (tolerance) => {
        set({ tolerance });
        
        // Se estiver em modo preview, recalcular automaticamente
        if (get().previewMode) {
          get().startPreview();
        }
      },
      
      startPreview: async () => {
        const { selectedLayerId, tolerance, originalGeometries } = get();
        
        if (!selectedLayerId) {
          console.warn('Nenhuma camada selecionada para simplificação');
          return;
        }
        
        set({ isSimplifying: true, previewMode: true });
        
        try {
          const appStore = useAppStore.getState();
          const layer = appStore.layers.find(l => l.id === selectedLayerId);
          
          if (!layer) {
            throw new Error(`Camada ${selectedLayerId} não encontrada`);
          }
          
          // Armazenar geometrias originais se ainda não armazenadas
          if (!originalGeometries.has(selectedLayerId)) {
            set(state => ({
              originalGeometries: new Map(state.originalGeometries.set(selectedLayerId, [...layer.data.features]))
            }));
          }
          
          const startTime = performance.now();
          const originalFeatures = originalGeometries.get(selectedLayerId) || layer.data.features;
          
          // Aplicar simplificação usando Turf.js com algoritmo Douglas-Peucker
          const simplifiedFeatures = originalFeatures.map(feature => {
            if (!feature.geometry || feature.geometry.type === 'Point') {
              return feature; // Pontos não podem ser simplificados
            }
            
            try {
              return turf.simplify(feature, {
                tolerance,
                highQuality: true, // Usa Douglas-Peucker
                mutate: false
              });
            } catch (error) {
              console.warn(`Erro ao simplificar feature ${feature.id}:`, error);
              return feature; // Retorna original em caso de erro
            }
          });
          
          const endTime = performance.now();
          const processTime = endTime - startTime;
          
          // Calcular estatísticas
          const originalVertices = countTotalVertices(originalFeatures);
          const simplifiedVertices = countTotalVertices(simplifiedFeatures);
          const reductionPercentage = originalVertices > 0 
            ? ((originalVertices - simplifiedVertices) / originalVertices) * 100 
            : 0;
          
          const stats: SimplificationStats = {
            originalVertices,
            simplifiedVertices,
            reductionPercentage,
            processTime,
            layerId: selectedLayerId,
            layerName: layer.name
          };
          
          set(state => ({
            simplifiedGeometries: new Map(state.simplifiedGeometries.set(selectedLayerId, simplifiedFeatures)),
            simplificationStats: stats,
            isSimplifying: false
          }));
          
        } catch (error) {
          console.error('Erro na simplificação:', error);
          set({ isSimplifying: false, previewMode: false });
          throw error;
        }
      },
      
      applySimplification: async () => {
        const { selectedLayerId, simplifiedGeometries } = get();
        
        if (!selectedLayerId || !simplifiedGeometries.has(selectedLayerId)) {
          throw new Error('Nenhuma simplificação para aplicar');
        }
        
        const appStore = useAppStore.getState();
        const simplifiedFeatures = simplifiedGeometries.get(selectedLayerId)!;
        
        // Atualizar a camada no store principal
        appStore.updateLayer(selectedLayerId, {
          data: {
            type: 'FeatureCollection',
            features: simplifiedFeatures
          }
        });
        
        set({
          previewMode: false,
          simplificationStats: null
        });
      },
      
      revertToOriginal: () => {
        const { selectedLayerId, originalGeometries } = get();
        
        if (!selectedLayerId || !originalGeometries.has(selectedLayerId)) {
          return;
        }
        
        const appStore = useAppStore.getState();
        const originalFeatures = originalGeometries.get(selectedLayerId)!;
        
        // Restaurar geometrias originais
        appStore.updateLayer(selectedLayerId, {
          data: {
            type: 'FeatureCollection',
            features: originalFeatures
          }
        });
        
        const updatedSimplifiedGeometries = new Map(get().simplifiedGeometries);
        updatedSimplifiedGeometries.delete(selectedLayerId);
        
        set({
          previewMode: false,
          simplificationStats: null,
          simplifiedGeometries: updatedSimplifiedGeometries
        });
      },
      
      resetSimplification: () => {
        const { selectedLayerId } = get();
        
        if (selectedLayerId) {
          get().revertToOriginal();
        }
        
        set({
          selectedLayerId: null,
          tolerance: get().defaultTolerance,
          previewMode: false,
          originalGeometries: new Map(),
          simplifiedGeometries: new Map(),
          simplificationStats: null,
          isSimplifying: false
        });
      }
    })),
    { name: 'geometry-simplification-store' }
  )
);

// Função auxiliar para contar vértices
function countTotalVertices(features: GeoJSON.Feature[]): number {
  return features.reduce((total, feature) => {
    if (!feature.geometry) return total;
    
    return total + countFeatureVertices(feature);
  }, 0);
}

function countFeatureVertices(feature: GeoJSON.Feature): number {
  const { geometry } = feature;
  
  if (!geometry) return 0;
  
  switch (geometry.type) {
    case 'Point':
      return 1;
    case 'LineString':
      return geometry.coordinates.length;
    case 'Polygon':
      return geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
    case 'MultiPoint':
      return geometry.coordinates.length;
    case 'MultiLineString':
      return geometry.coordinates.reduce((sum, line) => sum + line.length, 0);
    case 'MultiPolygon':
      return geometry.coordinates.reduce((sum, polygon) => 
        sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0), 0);
    default:
      return 0;
  }
}