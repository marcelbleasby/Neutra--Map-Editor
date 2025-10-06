import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Text,
  Flex,
  IconButton,
  HStack,
  VStack,
  Badge,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiLayers,
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiZap,
} from 'react-icons/fi';
import { Icon } from '../common';
import { LoadingIndicator } from './LoadingIndicator';
import { useLayerLoadingStore } from '../../store/layerLoadingStore';
import { useAppStore, MapLayer } from '../../store/appStore';
import { LayerStatus } from '../../types/layerLoading';

interface LazyTOCProps {
  onLayerToggle: (layerId: string) => void;
  onSimplifyLayer: (layerId: string) => void;
}

export const LazyTOC: React.FC<LazyTOCProps> = ({
  onLayerToggle,
  onSimplifyLayer
}) => {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  
  // App store (layers tradicionais)
  const { layers } = useAppStore();
  
  // Layer loading store
  const {
    layerMetadata,
    getLayerStatus,
    getLoadingProgress,
    getLayerError,
    loadLayerMetadata,
    loadLayer,
    unloadLayer,
    retryLoadLayer,
    memoryUsage,
    config,
  } = useLayerLoadingStore();

  // Carregar metadados para todas as camadas na inicialização
  useEffect(() => {
    layers.forEach((layer) => {
      const status = getLayerStatus(layer.id);
      if (status === LayerStatus.UNLOADED) {
        loadLayerMetadata(layer.id);
      }
    });
  }, [layers, getLayerStatus, loadLayerMetadata]);

  const toggleLayerExpansion = (layerId: string) => {
    setExpandedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  const handleLoadLayer = useCallback(async (layerId: string) => {
    await loadLayer(layerId);
  }, [loadLayer]);

  const handleUnloadLayer = useCallback((layerId: string) => {
    unloadLayer(layerId);
  }, [unloadLayer]);

  const handleRetryLayer = useCallback(async (layerId: string) => {
    await retryLoadLayer(layerId);
  }, [retryLoadLayer]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderLayerActions = (layer: MapLayer) => {
    const status = getLayerStatus(layer.id);
    
    return (
      <HStack gap={1} onClick={(e) => e.stopPropagation()}>
        {/* Botão de carregamento/descarregamento */}
        {status === LayerStatus.UNLOADED || status === LayerStatus.METADATA_LOADED ? (
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => handleLoadLayer(layer.id)}
            aria-label="Carregar camada"
            title="Carregar camada"
          >
            <Icon as={FiDownload} />
          </IconButton>
        ) : status === LayerStatus.LOADED ? (
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => handleUnloadLayer(layer.id)}
            aria-label="Descarregar camada"
            title="Descarregar camada"
          >
            <Icon as={FiTrash2} />
          </IconButton>
        ) : null}

        {/* Botão de retry para erros */}
        {status === LayerStatus.ERROR && (
          <IconButton
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => handleRetryLayer(layer.id)}
            aria-label="Tentar novamente"
            title="Tentar novamente"
          >
            <Icon as={FiRefreshCw} />
          </IconButton>
        )}

        {/* Botão de simplificação (apenas para camadas carregadas) */}
        {status === LayerStatus.LOADED && (
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => onSimplifyLayer(layer.id)}
            aria-label="Simplificar geometria"
            title="Simplificar geometria"
          >
            <Icon as={FiZap} />
          </IconButton>
        )}

        {/* Botão de visibilidade */}
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => onLayerToggle(layer.id)}
          aria-label={layer.visible ? "Ocultar" : "Mostrar"}
          title={layer.visible ? "Ocultar camada" : "Mostrar camada"}
          color={layer.visible ? "green.500" : "gray.400"}
        >
          <Icon as={layer.visible ? FiEye : FiEyeOff} />
        </IconButton>
      </HStack>
    );
  };

  const renderLayerMetadata = (layerId: string) => {
    const metadata = layerMetadata.get(layerId);
    const status = getLayerStatus(layerId);
    
    if (!metadata || status === LayerStatus.LOADING_METADATA) {
      return null;
    }

    return (
      <Box mt={2} p={2} bg="gray.50" borderRadius="md" fontSize="xs">
        <HStack justify="space-between" mb={1}>
          <Text color="gray.600">Tipo:</Text>
          <Badge size="sm" colorScheme="blue">{metadata.type}</Badge>
        </HStack>
        <HStack justify="space-between" mb={1}>
          <Text color="gray.600">Features:</Text>
          <Text fontWeight="medium">{formatNumber(metadata.featureCount)}</Text>
        </HStack>
        <HStack justify="space-between" mb={1}>
          <Text color="gray.600">Tamanho:</Text>
          <Text fontWeight="medium">{formatBytes(metadata.fileSize)}</Text>
        </HStack>
        {metadata.chunkCount && metadata.chunkCount > 1 && (
          <HStack justify="space-between">
            <Text color="gray.600">Chunks:</Text>
            <Text fontWeight="medium">{metadata.chunkCount}</Text>
          </HStack>
        )}
      </Box>
    );
  };

  const renderLayer = (layer: MapLayer) => {
    const isExpanded = expandedLayers.has(layer.id);
    const status = getLayerStatus(layer.id);
    const progress = getLoadingProgress(layer.id);
    const error = getLayerError(layer.id);
    
    return (
      <Box key={layer.id} borderWidth="1px" borderRadius="md" p={3} mb={2} bg="white">
        {/* Header da camada */}
        <Flex align="center" justify="space-between">
          <Flex align="center" flex={1} cursor="pointer" onClick={() => toggleLayerExpansion(layer.id)}>
            <Icon 
              as={isExpanded ? FiChevronDown : FiChevronRight}
              mr={2}
            />
            <Icon as={FiLayers} mr={2} color={layer.visible ? 'green.500' : 'gray.400'} />
            <VStack align="start" gap={0} flex={1}>
              <Text fontSize="md" fontWeight="medium" lineClamp={1}>
                {layer.name}
              </Text>
              <LoadingIndicator
                layerId={layer.id}
                status={status}
                progress={progress}
                error={error}
                onRetry={() => handleRetryLayer(layer.id)}
                compact
              />
            </VStack>
          </Flex>
          
          {renderLayerActions(layer)}
        </Flex>

        {/* Conteúdo expandido */}
        {isExpanded && (
          <Box mt={3} pl={6}>
            {/* Indicador de loading detalhado */}
            <LoadingIndicator
              layerId={layer.id}
              status={status}
              progress={progress}
              error={error}
              onRetry={() => handleRetryLayer(layer.id)}
            />
            
            {/* Metadados da camada */}
            {renderLayerMetadata(layer.id)}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box h="full" overflowY="auto" p={2}>
      {/* Header com informações de memória */}
      <VStack align="stretch" gap={4} mb={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="bold">
            Camadas da Rede (Lazy Loading)
          </Text>
          <Badge colorScheme={memoryUsage > config.maxMemoryUsage * 0.8 ? 'red' : 'green'}>
            {formatBytes(memoryUsage)} / {formatBytes(config.maxMemoryUsage)}
          </Badge>
        </Flex>
      </VStack>
      
      {layers.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Icon as={FiLayers} w={12} h={12} color="gray.300" />
          <Text color="gray.500" mt={4}>
            Nenhuma camada disponível
          </Text>
          <Text fontSize="sm" color="gray.400" mt={2}>
            Importe um arquivo KML para visualizar as camadas
          </Text>
        </Box>
      ) : (
        <Box>
          {layers.map(renderLayer)}
        </Box>
      )}
    </Box>
  );
};