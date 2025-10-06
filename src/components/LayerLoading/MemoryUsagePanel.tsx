import React from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiTrash2,
  FiRefreshCw,
  FiHardDrive,
  FiClock,
  FiLayers,
} from 'react-icons/fi';
import { Icon } from '../common';
import { useLayerLoadingStore } from '../../store/layerLoadingStore';
import { LayerStatus } from '../../types/layerLoading';

const MotionBox = motion(Box);

interface MemoryUsagePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryUsagePanel: React.FC<MemoryUsagePanelProps> = ({
  isOpen,
  onClose
}) => {
  const {
    cachedLayers,
    memoryUsage,
    config,
    layerMetadata,
    getLayerStatus,
    unloadLayer,
    clearCache,
    updateConfig
  } = useLayerLoadingStore();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const memoryPercentage = (memoryUsage / config.maxMemoryUsage) * 100;
  const cachedLayersArray = Array.from(cachedLayers.values()).sort(
    (a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime()
  );

  const handleUnloadLayer = (layerId: string) => {
    unloadLayer(layerId);
  };

  const handleClearCache = () => {
    clearCache();
  };

  const handleUpdateMemoryLimit = (newLimit: number) => {
    updateConfig({ maxMemoryUsage: newLimit * 1024 * 1024 }); // Convert MB to bytes
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionBox
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'tween', duration: 0.3 }}
          position="fixed"
          top={4}
          right={4}
          bottom={4}
          w="400px"
          bg="white"
          borderRadius="lg"
          boxShadow="2xl"
          borderWidth="1px"
          borderColor="gray.200"
          zIndex={1000}
          overflowY="auto"
        >
          {/* Header */}
          <Flex align="center" justify="space-between" p={4} borderBottomWidth="1px">
            <HStack>
              <Icon as={FiHardDrive} color="blue.500" />
              <Text fontSize="lg" fontWeight="bold">
                Uso de Memória
              </Text>
            </HStack>
            <IconButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Fechar"
            >
              <Icon as={FiX} />
            </IconButton>
          </Flex>

          <VStack gap={4} p={4} align="stretch">
            {/* Memory Overview */}
            <Box p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" color="gray.600" mb={2}>
                Memória Utilizada
              </Text>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xl" fontWeight="bold">
                  {formatBytes(memoryUsage)}
                </Text>
                <Text color="gray.500">
                  / {formatBytes(config.maxMemoryUsage)}
                </Text>
              </HStack>
              
              {/* Memory Bar */}
              <Box bg="gray.200" borderRadius="full" h={3} overflow="hidden">
                <Box
                  bg={memoryPercentage > 80 ? 'red.500' : memoryPercentage > 60 ? 'yellow.500' : 'green.500'}
                  h="100%"
                  w={`${Math.min(memoryPercentage, 100)}%`}
                  borderRadius="full"
                  transition="all 0.3s ease"
                />
              </Box>
              
              <HStack justify="space-between" mt={2}>
                <Text fontSize="xs" color="gray.500">
                  {Math.round(memoryPercentage)}% utilizado
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {cachedLayersArray.length} camadas
                </Text>
              </HStack>
            </Box>

            {/* Memory Controls */}
            <HStack gap={2}>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={handleClearCache}
                flex={1}
              >
                <Icon as={FiTrash2} mr={2} />
                Limpar Cache
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={() => window.location.reload()}
                flex={1}
              >
                <Icon as={FiRefreshCw} mr={2} />
                Recarregar
              </Button>
            </HStack>

            {/* Memory Settings */}
            <Box p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
              <Text fontSize="sm" fontWeight="medium" mb={2} color="blue.700">
                Configurações
              </Text>
              <VStack gap={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="xs" color="blue.600">Limite de memória:</Text>
                  <HStack gap={1}>
                    {[100, 200, 500, 1000].map((mb) => (
                      <Button
                        key={mb}
                        size="xs"
                        variant={config.maxMemoryUsage === mb * 1024 * 1024 ? 'solid' : 'outline'}
                        colorScheme="blue"
                        onClick={() => handleUpdateMemoryLimit(mb)}
                      >
                        {mb}MB
                      </Button>
                    ))}
                  </HStack>
                </HStack>
              </VStack>
            </Box>

            {/* Cached Layers List */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.700">
                Camadas em Cache ({cachedLayersArray.length})
              </Text>
              
              {cachedLayersArray.length === 0 ? (
                <Box textAlign="center" py={6} color="gray.500">
                  <Icon as={FiLayers} w={8} h={8} mb={2} />
                  <Text fontSize="sm">Nenhuma camada em cache</Text>
                </Box>
              ) : (
                <VStack gap={2} align="stretch">
                  {cachedLayersArray.map((cached) => {
                    const metadata = layerMetadata.get(cached.layerId);
                    const status = getLayerStatus(cached.layerId);
                    
                    return (
                      <Box
                        key={cached.layerId}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        bg="white"
                      >
                        <Flex align="center" justify="space-between" mb={2}>
                          <VStack align="start" gap={0} flex={1}>
                            <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                              {metadata?.name || cached.layerId}
                            </Text>
                            <HStack>
                              <Badge
                                size="sm"
                                colorScheme={status === LayerStatus.LOADED ? 'green' : 'gray'}
                              >
                                {status}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {formatBytes(cached.memorySize)}
                              </Text>
                            </HStack>
                          </VStack>
                          
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleUnloadLayer(cached.layerId)}
                            aria-label="Descarregar"
                          >
                            <Icon as={FiTrash2} />
                          </IconButton>
                        </Flex>
                        
                        <HStack justify="space-between" fontSize="xs" color="gray.500">
                          <HStack>
                            <Icon as={FiClock} />
                            <Text>Último acesso: {formatTimeAgo(cached.lastAccessed)}</Text>
                          </HStack>
                          <Text>
                            {cached.loadedChunks.size} chunks
                          </Text>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </Box>
          </VStack>
        </MotionBox>
      )}
    </AnimatePresence>
  );
};