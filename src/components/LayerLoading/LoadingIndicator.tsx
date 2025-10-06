import React from 'react';
import { Box, Text, HStack, Badge, Spinner } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Icon } from '../common';
import { FiAlertCircle, FiCheckCircle, FiClock, FiDownloadCloud } from 'react-icons/fi';
import { LayerStatus, LoadingProgress, LayerError } from '../../types/layerLoading';

interface LoadingIndicatorProps {
  layerId: string;
  status: LayerStatus;
  progress?: LoadingProgress | null;
  error?: LayerError | null;
  onRetry?: () => void;
  compact?: boolean;
}

const MotionBox = motion(Box);

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  layerId,
  status,
  progress,
  error,
  onRetry,
  compact = false
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case LayerStatus.UNLOADED:
        return {
          icon: FiClock,
          color: 'gray.400',
          bgColor: 'gray.50',
          text: 'Não carregado',
          badge: null
        };
        
      case LayerStatus.LOADING_METADATA:
        return {
          icon: FiDownloadCloud,
          color: 'blue.500',
          bgColor: 'blue.50',
          text: 'Carregando informações...',
          badge: 'Metadados'
        };
        
      case LayerStatus.METADATA_LOADED:
        return {
          icon: FiCheckCircle,
          color: 'green.400',
          bgColor: 'green.50',
          text: 'Pronto para carregar',
          badge: 'Pronto'
        };
        
      case LayerStatus.LOADING:
        return {
          icon: FiDownloadCloud,
          color: 'blue.500',
          bgColor: 'blue.50',
          text: 'Carregando dados...',
          badge: 'Carregando'
        };
        
      case LayerStatus.LOADED:
        return {
          icon: FiCheckCircle,
          color: 'green.500',
          bgColor: 'green.50',
          text: 'Carregado',
          badge: 'Carregado'
        };
        
      case LayerStatus.ERROR:
        return {
          icon: FiAlertCircle,
          color: 'red.500',
          bgColor: 'red.50',
          text: error?.message || 'Erro no carregamento',
          badge: 'Erro'
        };
        
      default:
        return {
          icon: FiClock,
          color: 'gray.400',
          bgColor: 'gray.50',
          text: 'Status desconhecido',
          badge: null
        };
    }
  };

  const statusConfig = getStatusConfig();
  const isLoading = status === LayerStatus.LOADING || status === LayerStatus.LOADING_METADATA;
  const progressPercentage = progress ? (progress.loaded / progress.total) * 100 : 0;

  if (compact) {
    return (
      <HStack gap={2}>
        {isLoading ? (
          <Spinner size="xs" color={statusConfig.color} />
        ) : (
          <Icon as={statusConfig.icon} color={statusConfig.color} w={3} h={3} />
        )}
        {statusConfig.badge && (
          <Badge
            size="sm"
            colorScheme={
              status === LayerStatus.ERROR ? 'red' :
              status === LayerStatus.LOADED ? 'green' :
              status === LayerStatus.LOADING ? 'blue' : 'gray'
            }
          >
            {statusConfig.badge}
          </Badge>
        )}
      </HStack>
    );
  }

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      p={3}
      borderRadius="md"
      borderWidth="1px"
      borderColor={statusConfig.color}
      bg={statusConfig.bgColor}
      position="relative"
      overflow="hidden"
    >
      <HStack justify="space-between" mb={2}>
        <HStack>
          {isLoading ? (
            <Spinner size="sm" color={statusConfig.color} />
          ) : (
            <Icon as={statusConfig.icon} color={statusConfig.color} w={4} h={4} />
          )}
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            {statusConfig.text}
          </Text>
        </HStack>
        
        {statusConfig.badge && (
          <Badge
            colorScheme={
              status === LayerStatus.ERROR ? 'red' :
              status === LayerStatus.LOADED ? 'green' :
              status === LayerStatus.LOADING ? 'blue' : 'gray'
            }
          >
            {statusConfig.badge}
          </Badge>
        )}
      </HStack>

      {/* Progress Bar */}
      {progress && status === LayerStatus.LOADING && (
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.600">
              Progresso: {progress.loaded}/{progress.total} chunks
            </Text>
            <Text fontSize="xs" color="gray.600">
              {Math.round(progressPercentage)}%
            </Text>
          </HStack>
          {/* Custom Progress Bar */}
          <Box position="relative" bg="gray.100" borderRadius="full" h={2} overflow="hidden">
            <Box
              bg="blue.500"
              h="100%"
              borderRadius="full"
              w={`${progressPercentage}%`}
              transition="width 0.3s ease"
            />
          </Box>
        </Box>
      )}

      {/* Error Details */}
      {status === LayerStatus.ERROR && error && (
        <Box mt={2}>
          <Text fontSize="xs" color="gray.600" mb={1}>
            Código: {error.code}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {error.timestamp.toLocaleString()}
          </Text>
          {error.retryCount > 0 && (
            <Text fontSize="xs" color="orange.600" mt={1}>
              Tentativas: {error.retryCount}
            </Text>
          )}
          {onRetry && (
            <Box
              as="button"
              mt={2}
              px={2}
              py={1}
              borderRadius="sm"
              bg="red.100"
              color="red.700"
              fontSize="xs"
              fontWeight="medium"
              _hover={{ bg: 'red.200' }}
              onClick={onRetry}
            >
              Tentar novamente
            </Box>
          )}
        </Box>
      )}

      {/* Loading Animation */}
      {isLoading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)"
          animation="shimmer 2s infinite"
          pointerEvents="none"
        />
      )}
    </MotionBox>
  );
};