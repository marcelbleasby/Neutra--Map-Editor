import { useCallback, useEffect, useMemo } from 'react';
import { useLayerLoadingStore } from '../store/layerLoadingStore';
import { useAppStore } from '../store/appStore';
import { LayerStatus, BBox } from '../types/layerLoading';

/**
 * Hook personalizado para gerenciar lazy loading de camadas
 * Facilita o uso das funcionalidades de carregamento sob demanda
 */
export const useLayerLoading = () => {
  const {
    layerStatuses,
    cachedLayers,
    memoryUsage,
    config,
    layerMetadata,
    loadLayerMetadata,
    loadLayer,
    unloadLayer,
    clearCache,
    preloadVisibleLayers,
    retryLoadLayer,
    getLayerStatus,
    getLoadingProgress,
    getLayerError,
    getCachedLayer,
  } = useLayerLoadingStore();

  const { layers } = useAppStore();

  // Auto-carregar metadados para novas camadas
  useEffect(() => {
    layers.forEach((layer) => {
      const status = getLayerStatus(layer.id);
      if (status === LayerStatus.UNLOADED) {
        loadLayerMetadata(layer.id);
      }
    });
  }, [layers, getLayerStatus, loadLayerMetadata]);

  // Carregar camada com tratamento de erro
  const loadLayerSafely = useCallback(async (layerId: string, bounds?: BBox) => {
    try {
      await loadLayer(layerId, bounds);
      return { success: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }, [loadLayer]);

  // Descarregar camada com confirmação se necessário
  const unloadLayerSafely = useCallback((layerId: string, force: boolean = false) => {
    const cached = getCachedLayer(layerId);
    if (!cached || force) {
      unloadLayer(layerId);
      return { success: true };
    }
    
    // Pode adicionar lógica de confirmação aqui
    const confirmUnload = window.confirm(
      `Descarregar camada? Isso liberará ${formatBytes(cached.memorySize)} de memória.`
    );
    
    if (confirmUnload) {
      unloadLayer(layerId);
      return { success: true };
    }
    
    return { success: false };
  }, [getCachedLayer, unloadLayer]);

  // Retry com limite de tentativas
  const retryLayer = useCallback(async (layerId: string) => {
    const error = getLayerError(layerId);
    if (!error || error.retryCount >= config.retryAttempts) {
      return { success: false, error: 'Limite de tentativas excedido' };
    }
    
    try {
      await retryLoadLayer(layerId);
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no retry';
      return { success: false, error: errorMessage };
    }
  }, [getLayerError, config.retryAttempts, retryLoadLayer]);

  // Pré-carregar camadas baseado em viewport
  const preloadForViewport = useCallback(async (bounds: BBox) => {
    try {
      await preloadVisibleLayers(bounds);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro no preload' 
      };
    }
  }, [preloadVisibleLayers]);

  // Estatísticas de uso
  const stats = useMemo(() => {
    const loadedLayers = Array.from(layerStatuses.entries())
      .filter(([_, status]) => status === LayerStatus.LOADED).length;
    
    const loadingLayers = Array.from(layerStatuses.entries())
      .filter(([_, status]) => status === LayerStatus.LOADING).length;
    
    const errorLayers = Array.from(layerStatuses.entries())
      .filter(([_, status]) => status === LayerStatus.ERROR).length;
    
    const totalLayers = layers.length;
    const cachedLayersCount = cachedLayers.size;
    const memoryPercentage = (memoryUsage / config.maxMemoryUsage) * 100;
    
    return {
      totalLayers,
      loadedLayers,
      loadingLayers,
      errorLayers,
      cachedLayersCount,
      memoryUsage,
      maxMemoryUsage: config.maxMemoryUsage,
      memoryPercentage,
      isMemoryWarning: memoryPercentage > 80,
      isMemoryCritical: memoryPercentage > 95,
    };
  }, [layerStatuses, layers.length, cachedLayers.size, memoryUsage, config.maxMemoryUsage]);

  // Verificar se uma camada está pronta para ser usada
  const isLayerReady = useCallback((layerId: string): boolean => {
    const status = getLayerStatus(layerId);
    return status === LayerStatus.LOADED;
  }, [getLayerStatus]);

  // Verificar se uma camada está carregando
  const isLayerLoading = useCallback((layerId: string): boolean => {
    const status = getLayerStatus(layerId);
    return status === LayerStatus.LOADING || status === LayerStatus.LOADING_METADATA;
  }, [getLayerStatus]);

  // Obter progresso de carregamento
  const getLayerProgress = useCallback((layerId: string) => {
    const progress = getLoadingProgress(layerId);
    if (!progress) return null;
    
    return {
      ...progress,
      percentage: (progress.loaded / progress.total) * 100,
      isComplete: progress.loaded >= progress.total,
    };
  }, [getLoadingProgress]);

  // Limpar cache com opções
  const clearCacheWithOptions = useCallback((options?: {
    olderThan?: number; // milliseconds
    keepLayers?: string[];
    force?: boolean;
  }) => {
    if (!options?.force) {
      const confirmClear = window.confirm(
        `Limpar cache? Isso liberará ${formatBytes(memoryUsage)} de memória.`
      );
      if (!confirmClear) return { success: false };
    }
    
    // TODO: Implementar lógica de limpeza seletiva baseada nas opções
    clearCache();
    return { success: true };
  }, [memoryUsage, clearCache]);

  return {
    // Estados
    stats,
    
    // Funções principais
    loadLayerSafely,
    unloadLayerSafely,
    retryLayer,
    preloadForViewport,
    clearCacheWithOptions,
    
    // Verificações
    isLayerReady,
    isLayerLoading,
    getLayerProgress,
    
    // Acesso direto aos stores (para casos avançados)
    getLayerStatus,
    getLayerError,
    getCachedLayer,
    layerMetadata,
  };
};

// Função helper para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}