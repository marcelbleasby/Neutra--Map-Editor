import React, { useState, useCallback } from 'react';
import {
  Button,
  Text,
  Code,
  Box,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportMode, REFRESH_INTERVALS } from '../../types/export';
import { exportService } from '../../services/exportService';
import { useExportStore } from '../../store/exportStore';

// Simple toast replacement
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${type}: ${message}`);
  // You can implement a proper toast here later
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [exportMode, setExportMode] = useState<ExportMode>('static');
  const [refreshInterval, setRefreshInterval] = useState<number>(3600);
  const [showPreview, setShowPreview] = useState(false);
  const {
    isExporting,
    exportProgress,
    setExporting,
    setExportProgress,
    addToHistory,
  } = useExportStore();

  const handleExport = useCallback(async () => {
    if (!projectId || !projectName) {
      showToast('ID do projeto ou nome não informado.', 'error');
      return;
    }
    try {
      setExporting(true);
      setExportProgress(0);
      const exportConfig = {
        mode: exportMode,
        refreshInterval: exportMode === 'networked' ? refreshInterval : undefined,
        projectId,
        projectName,
      };
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 20, 90);
        setExportProgress(progress);
      }, 200);
      const result = await exportService.exportProject(exportConfig);
      clearInterval(progressInterval);
      setExportProgress(100);
      exportService.downloadFile(result);
      const fileSizeKB = typeof result.data === 'string'
        ? Math.ceil(result.data.length / 1024)
        : Math.ceil(result.data.byteLength / 1024);
      addToHistory({
        filename: result.filename,
        mode: exportMode,
        fileSize: fileSizeKB,
        downloadUrl: result.url,
      });
      showToast(`Arquivo ${result.filename} exportado com sucesso!`, 'success');
      setTimeout(() => {
        onClose();
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Erro na exportação:', error);
      showToast('Não foi possível exportar o arquivo. Tente novamente.', 'error');
      setExportProgress(0);
    } finally {
      setExporting(false);
    }
  }, [exportMode, refreshInterval, projectId, projectName, setExporting, setExportProgress, addToHistory, onClose]);

  const generateNetworkLinkPreview = useCallback(() => {
    if (exportMode !== 'networked') return '';
    return exportService.generateNetworkLinkPreview(
      projectId,
      projectName,
      refreshInterval
    );
  }, [projectId, projectName, refreshInterval, exportMode]);

  const getExportModeDescription = (mode: ExportMode): string => {
    switch (mode) {
      case 'static':
        return 'Arquivo com dados fixos que não se atualiza automaticamente.';
      case 'networked':
        return 'Arquivo que se conecta à API para buscar dados atualizados automaticamente.';
      case 'compressed':
        return 'Arquivo comprimido (KMZ) com todos os dados e recursos embutidos.';
      default:
        return '';
    }
  };

  const resetAndClose = () => {
    setExportMode('static');
    setRefreshInterval(3600);
    setShowPreview(false);
    setExportProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="blackAlpha.600"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex="1000"
      onClick={(e) => e.target === e.currentTarget && !isExporting && resetAndClose()}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        maxW="600px"
        w="90vw"
        maxH="90vh"
        overflow="hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          p={6}
          borderBottom="1px solid"
          borderColor="gray.200"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text fontSize="lg" fontWeight="bold">
            Exportar Projeto: {projectName}
          </Text>
          {!isExporting && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetAndClose}
            >
              ✕
            </Button>
          )}
        </Box>
        <Box p={6} maxH="calc(90vh - 160px)" overflowY="auto">
          {isExporting ? (
            <Box>
              <Box mb={4} p={4} bg="blue.50" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Exportando arquivo...</Text>
                <Text fontSize="sm">Por favor, aguarde enquanto o arquivo é gerado.</Text>
              </Box>
              <Box mb={4} bg="gray.200" borderRadius="md" h="8px">
                <Box 
                  bg="blue.500" 
                  h="100%" 
                  borderRadius="md" 
                  width={`${exportProgress}%`}
                  transition="width 0.3s"
                />
              </Box>
              <Text textAlign="center" fontSize="sm" color="gray.600">
                {exportProgress}% concluído
              </Text>
            </Box>
          ) : (
            <Box>
              <Box mb={6}>
                <Text fontWeight="bold" mb={4}>Modo de Exportação</Text>
                <Box>
                  <label style={{ display: 'block', marginBottom: '16px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="exportMode"
                      value="static"
                      checked={exportMode === 'static'}
                      onChange={(e) => {
                        setExportMode(e.target.value as ExportMode);
                        setShowPreview(false);
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <Box as="span">
                      <Text fontWeight="medium" display="inline">KML Estático</Text>
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        {getExportModeDescription('static')}
                      </Text>
                    </Box>
                  </label>
                  <label style={{ display: 'block', marginBottom: '16px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="exportMode"
                      value="networked"
                      checked={exportMode === 'networked'}
                      onChange={(e) => {
                        setExportMode(e.target.value as ExportMode);
                        setShowPreview(false);
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <Box as="span">
                      <Text fontWeight="medium" display="inline">KML com Auto-Atualização (NetworkLink)</Text>
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        {getExportModeDescription('networked')}
                      </Text>
                    </Box>
                  </label>
                  <label style={{ display: 'block', marginBottom: '16px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="exportMode"
                      value="compressed"
                      checked={exportMode === 'compressed'}
                      onChange={(e) => {
                        setExportMode(e.target.value as ExportMode);
                        setShowPreview(false);
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <Box as="span">
                      <Text fontWeight="medium" display="inline">KMZ Compactado</Text>
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        {getExportModeDescription('compressed')}
                      </Text>
                    </Box>
                  </label>
                </Box>
              </Box>
              <AnimatePresence>
                {exportMode === 'networked' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Box>
                      <hr style={{ margin: '16px 0' }} />
                      <Box mb={4}>
                        <Text fontWeight="medium" mb={2}>Intervalo de Atualização</Text>
                        <select
                          value={String(refreshInterval)}
                          onChange={(e) => {
                            setRefreshInterval(Number(e.target.value));
                            setShowPreview(false);
                          }}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                          {REFRESH_INTERVALS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Box>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        mb={4}
                      >
                        {showPreview ? 'Ocultar Preview' : 'Visualizar Preview do XML'}
                      </Button>
                      <AnimatePresence>
                        {showPreview && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <Box mb={4}>
                              <Text fontWeight="medium" mb={2}>
                                Preview do NetworkLink:
                              </Text>
                              <Code
                                display="block"
                                whiteSpace="pre"
                                fontSize="xs"
                                p={3}
                                bg="gray.50"
                                borderRadius="md"
                                maxH="200px"
                                overflowY="auto"
                                border="1px solid"
                                borderColor="gray.200"
                              >
                                {generateNetworkLinkPreview()}
                              </Code>
                            </Box>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Box p={3} bg="blue.50" borderRadius="md" fontSize="sm">
                        <Text>
                          O arquivo NetworkLink se conectará à API em {process.env.REACT_APP_API_URL || 'https://hom-api.neutramais.com'}
                          e se atualizará automaticamente no Google Earth.
                        </Text>
                      </Box>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          )}
        </Box>
        <Box
          p={6}
          borderTop="1px solid"
          borderColor="gray.200"
          display="flex"
          justifyContent="flex-end"
          gap={3}
        >
          <Button
            variant="ghost"
            onClick={resetAndClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleExport}
            loading={isExporting}
            disabled={!projectId || !projectName}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
