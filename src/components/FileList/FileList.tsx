import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { FiFile, FiSearch, FiFolder, FiCalendar, FiHardDrive } from 'react-icons/fi';
import { Icon } from '../common';
import { useAppStore } from '../../store/appStore';
import { FileService } from '../../services/fileService';
import { KMLFile } from '../../types/files';

interface FileListProps {
  onFileSelect: (file: KMLFile) => void;
}

export const FileList: React.FC<FileListProps> = ({ onFileSelect }) => {
  const {
    fileState,
    setFiles,
    setLoadingFiles,
    setSearchQuery,
    setTotalFiles,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (page = 1, search = '') => {
    try {
      setLoadingFiles(true);
      setError(null);
      
      const response = await FileService.listFiles({
        page,
        search,
        pageSize: 10,
        ordering: '-ultimaModificacao',
      });

      setFiles(response.results);
      setTotalFiles(response.count);
    } catch (err) {
      setError('Erro ao carregar arquivos. Tente novamente.');
      console.error('Erro ao carregar arquivos:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [setFiles, setLoadingFiles, setTotalFiles]);

  useEffect(() => {
    loadFiles(fileState.currentPage, fileState.searchQuery);
  }, [loadFiles, fileState.currentPage, fileState.searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const getFileIcon = (tipo: string) => {
    return tipo === 'KMZ' ? FiFolder : FiFile;
  };

  const getFileTypeColor = (tipo: string) => {
    return tipo === 'KMZ' ? 'orange' : 'blue';
  };

  if (fileState.isLoadingFiles && fileState.files.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" color="brand.500" />
        <Text mt={4} color="gray.600">
          Carregando arquivos...
        </Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      {/* Cabeçalho */}
      <Box mb={4}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={2}>
          Arquivos KML/KMZ
        </Text>
        <Text color="gray.600">
          Selecione um arquivo para visualizar no mapa
        </Text>
      </Box>

      {/* Campo de busca */}
      <Box mb={4} position="relative">
        <Icon 
          as={FiSearch} 
          position="absolute" 
          left={3} 
          top="50%" 
          transform="translateY(-50%)"
          color="gray.400" 
          zIndex={2}
        />
        <Input
          placeholder="Buscar arquivos..."
          value={fileState.searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          bg="white"
          pl={10}
        />
      </Box>

      {/* Lista de arquivos */}
      {error ? (
        <Box 
          bg="red.50" 
          border="1px" 
          borderColor="red.200" 
          borderRadius="md" 
          p={4}
          color="red.600"
        >
          <strong>Erro:</strong> {error}
        </Box>
      ) : fileState.files.length === 0 ? (
        <Box 
          bg="gray.50" 
          border="1px" 
          borderColor="gray.200" 
          borderRadius="md" 
          p={8}
          textAlign="center"
        >
          <Icon as={FiFile} boxSize="12" color="gray.400" mb={4} />
          <Text fontSize="lg" color="gray.600" mb={2}>
            {fileState.searchQuery ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo disponível'}
          </Text>
          <Text color="gray.500">
            {fileState.searchQuery
              ? 'Tente uma busca diferente'
              : 'Aguarde o upload de arquivos KML/KMZ'}
          </Text>
        </Box>
      ) : (
        <Box>
          {fileState.files.map((file) => (
            <Box
              key={file.id} 
              cursor="pointer" 
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
              mb={3}
              _hover={{ shadow: 'md', borderColor: 'brand.300' }}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" flex={1} gap={3}>
                  <Icon
                    as={getFileIcon(file.tipo)}
                    boxSize="6"
                    color={`${getFileTypeColor(file.tipo)}.500`}
                  />
                  <Box flex={1}>
                    <Flex align="center" gap={2} mb={1}>
                      <Text fontWeight="semibold" color="gray.800">
                        {file.nome}
                      </Text>
                      <Box
                        bg={`${getFileTypeColor(file.tipo)}.100`}
                        color={`${getFileTypeColor(file.tipo)}.800`}
                        px={2}
                        py={1}
                        borderRadius="sm"
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {file.tipo}
                      </Box>
                    </Flex>
                    <Flex gap={4} fontSize="sm" color="gray.600" mb={1}>
                      <Flex align="center" gap={1}>
                        <Icon as={FiCalendar} boxSize="3" />
                        <Text>
                          Modificado: {FileService.formatDate(file.ultimaModificacao)}
                        </Text>
                      </Flex>
                      <Flex align="center" gap={1}>
                        <Icon as={FiHardDrive} boxSize="3" />
                        <Text>{FileService.formatFileSize(file.tamanho)}</Text>
                      </Flex>
                    </Flex>
                    {file.descricao && (
                      <Text 
                        fontSize="sm" 
                        color="gray.500" 
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                      >
                        {file.descricao}
                      </Text>
                    )}
                  </Box>
                </Flex>
                <Button
                  colorScheme="brand"
                  size="sm"
                  onClick={() => onFileSelect(file)}
                >
                  Abrir
                </Button>
              </Flex>
            </Box>
          ))}
        </Box>
      )}

      {/* Loading overlay para atualizações */}
      {fileState.isLoadingFiles && fileState.files.length > 0 && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="lg" color="brand.500" />
        </Box>
      )}
    </Box>
  );
};