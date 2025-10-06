import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  Flex,
  IconButton,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiLayers,
  FiCircle,
  FiMapPin,
  FiBox,
  FiZap,
  FiSquare,
} from 'react-icons/fi';
import { Icon } from '../common';
import { NetworkLayer, LayerGroup, LayerElement } from '../../types/layers';
import { LazyTOC } from '../LayerLoading/LazyTOC';

interface TableOfContentsProps {
  layers: NetworkLayer[];
  onLayerToggle: (layerId: string) => void;
  onGroupToggle: (layerId: string, groupId: string) => void;
  onElementToggle: (layerId: string, groupId: string, elementId: string) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  layers,
  onLayerToggle,
  onGroupToggle,
  onElementToggle,
}) => {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const getElementIcon = (tipo: LayerElement['tipo']) => {
    switch (tipo) {
      case 'poste':
        return FiMapPin;
      case 'caixa':
        return FiBox;
      case 'fibra':
      case 'cabo':
        return FiZap;
      case 'equipamento':
        return FiSquare;
      default:
        return FiCircle;
    }
  };

  const renderElement = (element: LayerElement, layerId: string, groupId: string) => {
    const ElementIcon = getElementIcon(element.tipo);
    
    return (
      <Box key={element.id} ml={8} my={1}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onElementToggle(layerId, groupId, element.id)}
          color={element.visivel ? 'teal.500' : 'gray.500'}
          fontWeight={element.visivel ? 'semibold' : 'normal'}
          justifyContent="flex-start"
          w="full"
          h="auto"
          py={1}
          px={2}
        >
          <Icon as={ElementIcon} mr={2} />
          <Text fontSize="xs" lineClamp={1}>
            {element.nome}
          </Text>
        </Button>
      </Box>
    );
  };

  const renderGroup = (group: LayerGroup, layerId: string) => {
    const groupKey = `${layerId}-${group.id}`;
    const isExpanded = expandedGroups.has(groupKey);
    
    // Count visible elements in this group
    const totalElements = group.elementos.length;
    const visibleElements = group.elementos.filter(el => el.visivel).length;
    
    return (
      <Box key={group.id} ml={4}>
        <Flex
          align="center"
          cursor="pointer"
          onClick={() => toggleGroupExpansion(groupKey)}
          py={1}
          px={2}
          borderRadius="md"
          _hover={{ bg: 'gray.50' }}
        >
          <Icon 
            as={isExpanded ? FiChevronDown : FiChevronRight}
            mr={2}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onGroupToggle(layerId, group.id);
            }}
            color={group.visivel ? 'blue.500' : 'gray.500'}
            fontWeight={group.visivel ? 'semibold' : 'normal'}
            justifyContent="flex-start"
            flex={1}
            h="auto"
            py={1}
            px={2}
          >
            <Icon as={FiLayers} mr={2} />
            <Flex align="center" justify="space-between" w="full">
              <Text fontSize="sm" lineClamp={1}>
                {group.nome}
              </Text>
              <Text fontSize="xs" color="gray.500" ml={2}>
                {visibleElements}/{totalElements}
              </Text>
            </Flex>
          </Button>
        </Flex>

        {isExpanded && (
          <Box ml={2}>
            {group.elementos.map((element) =>
              renderElement(element, layerId, group.id)
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderLayer = (layer: NetworkLayer) => {
    const isExpanded = expandedLayers.has(layer.id);
    
    // Count visible groups and elements
    const totalGroups = layer.grupos.length;
    const visibleGroups = layer.grupos.filter(group => group.visivel).length;
    const totalElements = layer.grupos.reduce((sum, group) => sum + group.elementos.length, 0);
    
    return (
      <Box key={layer.id} borderWidth="1px" borderRadius="md" p={3} mb={2} bg="white">
        <Flex
          align="center"
          cursor="pointer"
          onClick={() => toggleLayerExpansion(layer.id)}
          mb={isExpanded ? 2 : 0}
        >
          <Icon 
            as={isExpanded ? FiChevronDown : FiChevronRight}
            mr={2}
          />
          <Button
            variant="ghost"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              onLayerToggle(layer.id);
            }}
            color={layer.visivel ? 'green.500' : 'gray.500'}
            fontWeight={layer.visivel ? 'bold' : 'normal'}
            justifyContent="flex-start"
            flex={1}
            h="auto"
            py={2}
            px={3}
          >
            <Icon as={FiLayers} mr={2} />
            <Flex align="center" justify="space-between" w="full">
              <Text fontSize="md" lineClamp={1}>
                {layer.nome}
              </Text>
              <Flex align="center" gap={2} ml={4}>
                <Text fontSize="xs" color="gray.500">
                  {visibleGroups}/{totalGroups} grupos
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {totalElements} elementos
                </Text>
              </Flex>
            </Flex>
          </Button>
          
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open geometry simplification panel
              console.log('Abrir simplificação para camada:', layer.nome);
            }}
            aria-label="Simplificar geometria"
            title="Simplificar geometria"
          >
            <Icon as={FiZap} />
          </IconButton>
        </Flex>

        {isExpanded && (
          <Box pl={4}>
            {layer.grupos.map((group) => renderGroup(group, layer.id))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box h="full" overflowY="auto" p={2}>
      <Text fontSize="lg" fontWeight="bold" mb={4} px={2}>
        Camadas da Rede
      </Text>
      
      {layers.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Icon as={FiLayers} boxSize="48px" color="gray.300" />
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

      {/* Seção de Lazy Loading */}
      <Box mt={6} borderTop="1px" borderColor="gray.200" pt={4}>
        <Text fontSize="md" fontWeight="semibold" mb={3} px={2}>
          Gerenciamento de Camadas
        </Text>
        <LazyTOC 
          onLayerToggle={onLayerToggle}
          onSimplifyLayer={(layerId) => {
            console.log('Simplificando camada:', layerId);
            // TODO: Implementar simplificação via store
          }}
        />
      </Box>
    </Box>
  );
};