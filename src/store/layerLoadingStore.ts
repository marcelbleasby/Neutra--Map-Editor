import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
  LayerMetadata, 
  CachedLayer, 
  LoadingProgress, 
  LayerLoadingConfig, 
  LayerStatus, 
  LayerError,
  BBox 
} from '../types/layerLoading';

interface LayerLoadingState {
  // Estados de carregamento
  layerStatuses: Map<string, LayerStatus>;
  loadingProgress: Map<string, LoadingProgress>;
  layerErrors: Map<string, LayerError>;
  
  // Cache management
  cachedLayers: Map<string, CachedLayer>;
  memoryUsage: number;
  
  // Configurações
  config: LayerLoadingConfig;
  
  // Metadados
  layerMetadata: Map<string, LayerMetadata>;
  
  // Estados de UI
  isMemoryPanelOpen: boolean;
  
  // Ações principais
  loadLayerMetadata: (fileId: string) => Promise<void>;
  loadLayer: (layerId: string, bounds?: BBox) => Promise<void>;
  unloadLayer: (layerId: string) => void;
  clearCache: () => void;
  preloadVisibleLayers: (bounds: BBox) => Promise<void>;
  
  // Gerenciamento de cache
  evictLeastRecentlyUsed: () => void;
  updateMemoryUsage: () => void;
  getCachedLayer: (layerId: string) => CachedLayer | null;
  
  // Configuração
  updateConfig: (config: Partial<LayerLoadingConfig>) => void;
  
  // UI helpers
  getLayerStatus: (layerId: string) => LayerStatus;
  getLoadingProgress: (layerId: string) => LoadingProgress | null;
  getLayerError: (layerId: string) => LayerError | null;
  setMemoryPanelOpen: (open: boolean) => void;
  
  // Retry e error handling
  retryLoadLayer: (layerId: string) => Promise<void>;
  clearLayerError: (layerId: string) => void;
}

const defaultConfig: LayerLoadingConfig = {
  chunkSize: 512 * 1024, // 512KB
  viewportBuffer: 20, // 20%
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB
  maxConcurrentLoads: 3,
  retryAttempts: 3,
  retryDelay: 1000 // 1 segundo
};

export const useLayerLoadingStore = create<LayerLoadingState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Estado inicial
      layerStatuses: new Map(),
      loadingProgress: new Map(),
      layerErrors: new Map(),
      cachedLayers: new Map(),
      memoryUsage: 0,
      config: defaultConfig,
      layerMetadata: new Map(),
      isMemoryPanelOpen: false,
      
      // Implementação dos métodos principais
      loadLayerMetadata: async (fileId: string) => {
        const state = get();
        
        // Marcar como carregando metadados
        const newStatuses = new Map(state.layerStatuses);
        newStatuses.set(fileId, LayerStatus.LOADING_METADATA);
        set({ layerStatuses: newStatuses });
        
        try {
          // TODO: Implementar chamada à API para metadados
          // const metadata = await fetchLayerMetadata(fileId);
          
          // Mock de metadados para desenvolvimento
          const mockMetadata: LayerMetadata = {
            id: fileId,
            name: `Camada ${fileId}`,
            type: 'KML',
            fileSize: 1024 * 1024, // 1MB
            featureCount: 1000,
            bounds: {
              minLng: -46.8,
              minLat: -23.7,
              maxLng: -46.6,
              maxLat: -23.5
            },
            geometryTypes: ['Point', 'LineString'],
            lastModified: new Date(),
            chunkCount: 4,
            estimatedMemorySize: 2 * 1024 * 1024 // 2MB estimado
          };
          
          // Atualizar metadados e status
          const newMetadata = new Map(state.layerMetadata);
          newMetadata.set(fileId, mockMetadata);
          
          const updatedStatuses = new Map(state.layerStatuses);
          updatedStatuses.set(fileId, LayerStatus.METADATA_LOADED);
          
          set({ 
            layerMetadata: newMetadata,
            layerStatuses: updatedStatuses 
          });
          
        } catch (error) {
          // Marcar como erro
          const errorStatuses = new Map(state.layerStatuses);
          errorStatuses.set(fileId, LayerStatus.ERROR);
          
          const newErrors = new Map(state.layerErrors);
          newErrors.set(fileId, {
            layerId: fileId,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            code: 'METADATA_LOAD_ERROR',
            timestamp: new Date(),
            retryCount: 0
          });
          
          set({ 
            layerStatuses: errorStatuses,
            layerErrors: newErrors 
          });
        }
      },
      
      loadLayer: async (layerId: string, bounds?: BBox) => {
        const state = get();
        const metadata = state.layerMetadata.get(layerId);
        
        if (!metadata) {
          console.warn(`Metadados não encontrados para camada ${layerId}`);
          return;
        }
        
        // Verificar se já está em cache
        const cached = state.cachedLayers.get(layerId);
        if (cached) {
          // Atualizar último acesso
          cached.lastAccessed = new Date();
          const updatedCache = new Map(state.cachedLayers);
          updatedCache.set(layerId, cached);
          set({ cachedLayers: updatedCache });
          return;
        }
        
        // Verificar limite de memória
        if (state.memoryUsage + metadata.estimatedMemorySize > state.config.maxMemoryUsage) {
          get().evictLeastRecentlyUsed();
        }
        
        // Marcar como carregando
        const newStatuses = new Map(state.layerStatuses);
        newStatuses.set(layerId, LayerStatus.LOADING);
        
        const newProgress = new Map(state.loadingProgress);
        newProgress.set(layerId, {
          layerId,
          loaded: 0,
          total: metadata.chunkCount || 1,
          status: 'loading'
        });
        
        set({ 
          layerStatuses: newStatuses,
          loadingProgress: newProgress 
        });
        
        try {
          // TODO: Implementar carregamento real de chunks
          // const features = await loadLayerChunks(layerId, bounds);
          
          // Mock de dados para desenvolvimento
          const mockFeatures: GeoJSON.Feature[] = Array.from({ length: 100 }, (_, i) => ({
            type: 'Feature',
            properties: { id: i, name: `Feature ${i}` },
            geometry: {
              type: 'Point',
              coordinates: [
                -46.7 + (Math.random() - 0.5) * 0.2,
                -23.6 + (Math.random() - 0.5) * 0.2
              ]
            }
          }));
          
          // Simular progresso de carregamento
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Adicionar ao cache
          const cachedLayer: CachedLayer = {
            layerId,
            data: mockFeatures,
            loadedChunks: new Set([0]), // Mock: chunk 0 carregado
            lastAccessed: new Date(),
            memorySize: metadata.estimatedMemorySize,
            bounds: metadata.bounds
          };
          
          const updatedCache = new Map(state.cachedLayers);
          updatedCache.set(layerId, cachedLayer);
          
          const finalStatuses = new Map(state.layerStatuses);
          finalStatuses.set(layerId, LayerStatus.LOADED);
          
          const finalProgress = new Map(state.loadingProgress);
          finalProgress.set(layerId, {
            layerId,
            loaded: metadata.chunkCount || 1,
            total: metadata.chunkCount || 1,
            status: 'completed'
          });
          
          set({ 
            cachedLayers: updatedCache,
            layerStatuses: finalStatuses,
            loadingProgress: finalProgress
          });
          
          // Atualizar uso de memória
          get().updateMemoryUsage();
          
        } catch (error) {
          const errorStatuses = new Map(state.layerStatuses);
          errorStatuses.set(layerId, LayerStatus.ERROR);
          
          const newErrors = new Map(state.layerErrors);
          newErrors.set(layerId, {
            layerId,
            message: error instanceof Error ? error.message : 'Erro ao carregar camada',
            code: 'LAYER_LOAD_ERROR',
            timestamp: new Date(),
            retryCount: 0
          });
          
          set({ 
            layerStatuses: errorStatuses,
            layerErrors: newErrors 
          });
        }
      },
      
      unloadLayer: (layerId: string) => {
        const state = get();
        
        // Remover do cache
        const updatedCache = new Map(state.cachedLayers);
        updatedCache.delete(layerId);
        
        // Atualizar status
        const updatedStatuses = new Map(state.layerStatuses);
        updatedStatuses.set(layerId, LayerStatus.UNLOADED);
        
        // Limpar progresso
        const updatedProgress = new Map(state.loadingProgress);
        updatedProgress.delete(layerId);
        
        set({
          cachedLayers: updatedCache,
          layerStatuses: updatedStatuses,
          loadingProgress: updatedProgress
        });
        
        // Atualizar uso de memória
        get().updateMemoryUsage();
      },
      
      clearCache: () => {
        set({
          cachedLayers: new Map(),
          memoryUsage: 0,
          layerStatuses: new Map(),
          loadingProgress: new Map()
        });
      },
      
      preloadVisibleLayers: async (bounds: BBox) => {
        const state = get();
        
        // Identificar camadas que intersectam com o viewport
        const visibleLayers: string[] = [];
        
        state.layerMetadata.forEach((metadata, layerId) => {
          if (boundsIntersect(metadata.bounds, bounds)) {
            const status = state.layerStatuses.get(layerId);
            if (!status || status === LayerStatus.UNLOADED || status === LayerStatus.METADATA_LOADED) {
              visibleLayers.push(layerId);
            }
          }
        });
        
        // Carregar camadas visíveis (limitado por maxConcurrentLoads)
        const loadPromises = visibleLayers
          .slice(0, state.config.maxConcurrentLoads)
          .map(layerId => get().loadLayer(layerId, bounds));
        
        await Promise.all(loadPromises);
      },
      
      evictLeastRecentlyUsed: () => {
        const state = get();
        const cached = Array.from(state.cachedLayers.values())
          .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
        
        if (cached.length > 0) {
          const lru = cached[0];
          get().unloadLayer(lru.layerId);
        }
      },
      
      updateMemoryUsage: () => {
        const state = get();
        const totalMemory = Array.from(state.cachedLayers.values())
          .reduce((sum, cached) => sum + cached.memorySize, 0);
        
        set({ memoryUsage: totalMemory });
      },
      
      getCachedLayer: (layerId: string) => {
        const state = get();
        return state.cachedLayers.get(layerId) || null;
      },
      
      updateConfig: (newConfig: Partial<LayerLoadingConfig>) => {
        const state = get();
        set({ 
          config: { ...state.config, ...newConfig } 
        });
      },
      
      // UI helpers
      getLayerStatus: (layerId: string) => {
        const state = get();
        return state.layerStatuses.get(layerId) || LayerStatus.UNLOADED;
      },
      
      getLoadingProgress: (layerId: string) => {
        const state = get();
        return state.loadingProgress.get(layerId) || null;
      },
      
      getLayerError: (layerId: string) => {
        const state = get();
        return state.layerErrors.get(layerId) || null;
      },
      
      setMemoryPanelOpen: (open: boolean) => {
        set({ isMemoryPanelOpen: open });
      },
      
      retryLoadLayer: async (layerId: string) => {
        const state = get();
        const error = state.layerErrors.get(layerId);
        
        if (error && error.retryCount < state.config.retryAttempts) {
          // Incrementar contador de retry
          const updatedErrors = new Map(state.layerErrors);
          updatedErrors.set(layerId, { ...error, retryCount: error.retryCount + 1 });
          set({ layerErrors: updatedErrors });
          
          // Aguardar delay de retry
          await new Promise(resolve => setTimeout(resolve, state.config.retryDelay));
          
          // Tentar carregar novamente
          await get().loadLayer(layerId);
        }
      },
      
      clearLayerError: (layerId: string) => {
        const state = get();
        const updatedErrors = new Map(state.layerErrors);
        updatedErrors.delete(layerId);
        set({ layerErrors: updatedErrors });
      }
    })),
    { name: 'layer-loading-store' }
  )
);

// Função auxiliar para verificar interseção de bounds
function boundsIntersect(bounds1: BBox, bounds2: BBox): boolean {
  return !(bounds1.maxLng < bounds2.minLng || 
           bounds1.minLng > bounds2.maxLng || 
           bounds1.maxLat < bounds2.minLat || 
           bounds1.minLat > bounds2.maxLat);
}