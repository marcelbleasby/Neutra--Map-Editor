import React from 'react';
import {
  Box,
  Flex,
  Button,
} from '@chakra-ui/react';
import { Icon } from '../common';
import {
  FiMousePointer,
  FiMapPin,
  FiMinus,
  FiSquare,
  FiEdit2,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
  FiSave,
} from 'react-icons/fi';

interface DrawingToolbarProps {
  mode: string;
  onModeChange: (mode: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  mode,
  onModeChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
}) => {
  return (
    <Box
      position="fixed"
      bottom="20px"
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
      bg="white"
      borderRadius="xl"
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.15)"
      border="1px solid"
      borderColor="gray.200"
      p={3}
      backdropFilter="blur(10px)"
    >
      <Flex align="center" gap={1}>
        {/* Ferramentas de Desenho */}
        <Button
          size="md"
          variant={mode === 'select' ? 'solid' : 'ghost'}
          colorScheme={mode === 'select' ? 'blue' : 'gray'}
          onClick={() => onModeChange('select')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Selecionar"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiMousePointer} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant={mode === 'point' ? 'solid' : 'ghost'}
          colorScheme={mode === 'point' ? 'blue' : 'gray'}
          onClick={() => onModeChange('point')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Criar Ponto"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiMapPin} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant={mode === 'line_string' ? 'solid' : 'ghost'}
          colorScheme={mode === 'line_string' ? 'blue' : 'gray'}
          onClick={() => onModeChange('line_string')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Criar Linha"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiMinus} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant={mode === 'polygon' ? 'solid' : 'ghost'}
          colorScheme={mode === 'polygon' ? 'blue' : 'gray'}
          onClick={() => onModeChange('polygon')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Criar Polígono"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiSquare} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant={mode === 'edit' ? 'solid' : 'ghost'}
          colorScheme={mode === 'edit' ? 'blue' : 'gray'}
          onClick={() => onModeChange('edit')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Editar Elemento"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiEdit2} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant={mode === 'delete' ? 'solid' : 'ghost'}
          colorScheme={mode === 'delete' ? 'blue' : 'gray'}
          onClick={() => onModeChange('delete')}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Deletar Elemento"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiTrash2} boxSize="18px" />
        </Button>

        {/* Divisor */}
        <Box
          w="1px"
          h="8"
          bg="gray.300"
          mx={2}
        />

        {/* Ações */}
        <Button
          size="md"
          variant="ghost"
          colorScheme="gray"
          onClick={onUndo}
          disabled={!canUndo}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Desfazer"
          transition="all 0.2s"
          _hover={{
            transform: !canUndo ? 'none' : 'translateY(-2px)',
            boxShadow: !canUndo ? 'none' : 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          opacity={!canUndo ? 0.5 : 1}
        >
          <Icon as={FiRotateCcw} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant="ghost"
          colorScheme="gray"
          onClick={onRedo}
          disabled={!canRedo}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Refazer"
          transition="all 0.2s"
          _hover={{
            transform: !canRedo ? 'none' : 'translateY(-2px)',
            boxShadow: !canRedo ? 'none' : 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          opacity={!canRedo ? 0.5 : 1}
        >
          <Icon as={FiRotateCw} boxSize="18px" />
        </Button>

        <Button
          size="md"
          variant="ghost"
          colorScheme="teal"
          onClick={onSave}
          borderRadius="lg"
          minW="auto"
          px={3}
          py={2}
          title="Salvar"
          transition="all 0.2s"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          <Icon as={FiSave} boxSize="18px" />
        </Button>
      </Flex>
    </Box>
  );
};