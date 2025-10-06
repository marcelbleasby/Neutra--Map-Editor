import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlay, 
  FiRotateCcw, 
  FiCheck, 
  FiX, 
  FiInfo,
  FiZap
} from 'react-icons/fi';
import { Icon } from '../common';
import { useGeometrySimplificationStore } from '../../store/geometrySimplificationStore';
import { useAppStore } from '../../store/appStore';

interface SimplificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimplificationPanel: React.FC<SimplificationPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const {
    isSimplifying,
    selectedLayerId,
    tolerance,
    previewMode,
    simplificationStats,
    minTolerance,
    maxTolerance,
    setTolerance,
    startPreview,
    applySimplification,
    revertToOriginal,
    resetSimplification
  } = useGeometrySimplificationStore();
  
  const { layers } = useAppStore();
  
  // Obter dados da camada selecionada
  const selectedLayer = selectedLayerId ? layers.find(l => l.id === selectedLayerId) : null;
  
  // Converter tolerância para exibição em metros
  const toleranceInMeters = Math.round(tolerance * 111320); // Conversão aproximada para metros
  
  const handleToleranceChange = useCallback((value: number) => {
    setTolerance(value);
  }, [setTolerance]);
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  const handleStartPreview = useCallback(async () => {
    try {
      await startPreview();
      showToast('Preview gerado com sucesso!');
    } catch (error) {
      showToast('Erro ao gerar preview');
    }
  }, [startPreview]);
  
  const handleApplySimplification = useCallback(async () => {
    try {
      await applySimplification();
      showToast('Simplificação aplicada com sucesso!');
    } catch (error) {
      showToast('Erro ao aplicar simplificação');
    }
  }, [applySimplification]);
  
  const handleRevert = useCallback(() => {
    revertToOriginal();
    showToast('Geometrias originais restauradas');
  }, [revertToOriginal]);
  
  const handleClose = useCallback(() => {
    resetSimplification();
    onClose();
  }, [resetSimplification, onClose]);
  
  // Cleanup ao fechar
  useEffect(() => {
    if (!isOpen) {
      resetSimplification();
    }
  }, [isOpen, resetSimplification]);
  
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ duration: 0.3, type: 'spring' }}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 1000,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}
    >
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="xl"
        minW="380px"
        maxW="420px"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack gap={4} align="stretch">
          {/* Toast Message */}
          {toastMessage && (
            <Box
              bg="blue.500"
              color="white"
              p={2}
              borderRadius="md"
              textAlign="center"
              fontSize="sm"
            >
              {toastMessage}
            </Box>
          )}
          
          {/* Header */}
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiZap} color="blue.500" />
              <Text fontSize="lg" fontWeight="bold" color="gray.700">
                Simplificação de Geometrias
              </Text>
            </HStack>
            <IconButton
              aria-label="Fechar"
              onClick={handleClose}
              size="sm"
              variant="ghost"
            >
              <Icon as={FiX} />
            </IconButton>
          </HStack>
          
          <Box h="1px" bg="gray.200" />
          
          {/* Informações da camada */}
          {selectedLayer && (
            <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
              <HStack justify="space-between">
                <VStack align="start" gap={1}>
                  <Text fontSize="sm" fontWeight="medium" color="blue.700">
                    {selectedLayer.name}
                  </Text>
                  <HStack>
                    <Badge size="sm" colorScheme="blue">
                      {selectedLayer.data.features.length} features
                    </Badge>
                    <Badge size="sm" colorScheme="gray">
                      {selectedLayer.data.features[0]?.geometry?.type || 'Mixed'}
                    </Badge>
                  </HStack>
                </VStack>
                <IconButton
                  aria-label="Info"
                  size="sm"
                  variant="ghost"
                  colorScheme="blue"
                >
                  <Icon as={FiInfo} />
                </IconButton>
              </HStack>
            </Box>
          )}
          
          {!selectedLayer && (
            <Box p={3} bg="yellow.50" borderRadius="md" border="1px solid" borderColor="yellow.200">
              <HStack>
                <Box color="yellow.500">⚠️</Box>
                <Text fontSize="sm" color="yellow.700">
                  Selecione uma camada no TOC para iniciar a simplificação.
                </Text>
              </HStack>
            </Box>
          )}
          
          {selectedLayer && (
            <>
              {/* Controle de Tolerância */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Tolerância
                  </Text>
                  <Badge colorScheme="green">
                    ~{toleranceInMeters}m
                  </Badge>
                </HStack>
                
                <Box>
                  <input
                    type="range"
                    value={tolerance}
                    onChange={(e) => handleToleranceChange(Number(e.target.value))}
                    min={minTolerance}
                    max={maxTolerance}
                    step={0.0001}
                    style={{ 
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      background: '#E2E8F0',
                      outline: 'none'
                    }}
                  />
                </Box>
                
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.500">
                    Mais detalhes (~{Math.round(minTolerance * 111320)}m)
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Menos detalhes (~{Math.round(maxTolerance * 111320)}m)
                  </Text>
                </HStack>
              </Box>
              
              <Box h="1px" bg="gray.200" />
              
              {/* Estatísticas */}
              <AnimatePresence>
                {simplificationStats && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                      <VStack gap={3}>
                        <Box textAlign="center">
                          <Text fontSize="xs" color="green.600">Redução de Vértices</Text>
                          <Text fontSize="2xl" fontWeight="bold" color="green.700">
                            {simplificationStats.reductionPercentage.toFixed(1)}%
                          </Text>
                          <Text fontSize="xs" color="green.600">
                            {simplificationStats.originalVertices.toLocaleString()} → {simplificationStats.simplifiedVertices.toLocaleString()}
                          </Text>
                        </Box>
                        
                        <HStack gap={4} width="100%">
                          <Box textAlign="center" flex={1}>
                            <Text fontSize="xs" color="gray.600">Tempo</Text>
                            <Text fontSize="md" fontWeight="medium" color="gray.700">
                              {simplificationStats.processTime.toFixed(0)}ms
                            </Text>
                          </Box>
                          
                          <Box textAlign="center" flex={1}>
                            <Text fontSize="xs" color="gray.600">Features</Text>
                            <Text fontSize="md" fontWeight="medium" color="gray.700">
                              {selectedLayer.data.features.length}
                            </Text>
                          </Box>
                        </HStack>
                      </VStack>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Indicador de Progresso */}
              {isSimplifying && (
                <Box>
                  <Text fontSize="sm" mb={2} color="blue.600">
                    Processando geometrias...
                  </Text>
                  <Box 
                    bg="blue.200" 
                    height="6px" 
                    borderRadius="3px"
                    position="relative"
                  >
                    <Box
                      bg="blue.500"
                      height="100%"
                      borderRadius="3px"
                      width={`${((tolerance - minTolerance) / (maxTolerance - minTolerance)) * 100}%`}
                    />
                  </Box>
                </Box>
              )}
              
              <Box h="1px" bg="gray.200" />
              
              {/* Botões de Ação */}
              <VStack gap={3}>
                {!previewMode ? (
                  <Button
                    colorScheme="blue"
                    onClick={handleStartPreview}
                    disabled={!selectedLayer || isSimplifying}
                    width="100%"
                    size="md"
                  >
                    <Icon as={FiPlay} mr={2} />
                    {isSimplifying ? 'Gerando preview...' : 'Gerar Preview'}
                  </Button>
                ) : (
                  <HStack width="100%" gap={2}>
                    <Button
                      colorScheme="green"
                      onClick={handleApplySimplification}
                      flex={1}
                      size="md"
                    >
                      <Icon as={FiCheck} mr={2} />
                      Aplicar
                    </Button>
                    
                    <Button
                      variant="outline"
                      colorScheme="orange"
                      onClick={handleRevert}
                      flex={1}
                      size="md"
                    >
                      <Icon as={FiRotateCcw} mr={2} />
                      Reverter
                    </Button>
                  </HStack>
                )}
              </VStack>
              
              {/* Informações adicionais */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  💡 A simplificação usa o algoritmo Douglas-Peucker do Turf.js para reduzir vértices mantendo a forma geral das geometrias.
                </Text>
              </Box>
            </>
          )}
        </VStack>
      </Box>
    </motion.div>
  );
};