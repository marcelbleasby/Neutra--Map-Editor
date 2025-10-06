import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { tokml } from 'tokml';
import { SaveOptions } from '../store/saveStore';

export interface ExportResult {
  success: boolean;
  message: string;
  fileName?: string;
  size?: number;
}

/**
 * Exporta features para arquivo KML
 */
export const exportToKML = async (
  features: GeoJSON.Feature[],
  options: SaveOptions
): Promise<ExportResult> => {
  try {
    // Converter features para FeatureCollection
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter(f => f && f.geometry) // Filtrar features válidas
    };

    if (featureCollection.features.length === 0) {
      return {
        success: false,
        message: 'Nenhuma feature válida para exportar'
      };
    }

    // Preparar propriedades para KML
    const processedFeatures = featureCollection.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        // Garantir que name e description existam para KML
        name: feature.properties?.name || feature.properties?.nome || `Feature ${feature.id}`,
        description: feature.properties?.description || feature.properties?.descricao || '',
        // Preservar metadados se solicitado
        ...(options.preserveMetadata ? feature.properties : {}),
      }
    }));

    const processedCollection = {
      ...featureCollection,
      features: processedFeatures
    };

    // Converter para KML usando tokml
    const kmlString = tokml(processedCollection, {
      documentName: options.fileName || 'Mapa Exportado',
      documentDescription: 'Exportado do AGENT - Neutra+ Map Editor',
      simplestyle: options.includeStyles,
    });

    // Criar blob e fazer download
    const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
    const fileName = ensureExtension(options.fileName, '.kml');
    
    saveAs(blob, fileName);

    return {
      success: true,
      message: 'Arquivo KML exportado com sucesso',
      fileName,
      size: blob.size
    };

  } catch (error) {
    console.error('Erro ao exportar KML:', error);
    return {
      success: false,
      message: `Erro ao exportar KML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
};

/**
 * Exporta features para arquivo KMZ (KML comprimido)
 */
export const exportToKMZ = async (
  features: GeoJSON.Feature[],
  options: SaveOptions
): Promise<ExportResult> => {
  try {
    // Converter features para FeatureCollection
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter(f => f && f.geometry)
    };

    if (featureCollection.features.length === 0) {
      return {
        success: false,
        message: 'Nenhuma feature válida para exportar'
      };
    }

    // Preparar features para KML
    const processedFeatures = featureCollection.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        name: feature.properties?.name || feature.properties?.nome || `Feature ${feature.id}`,
        description: feature.properties?.description || feature.properties?.descricao || '',
        ...(options.preserveMetadata ? feature.properties : {}),
      }
    }));

    const processedCollection = {
      ...featureCollection,
      features: processedFeatures
    };

    // Converter para KML
    const kmlString = tokml(processedCollection, {
      documentName: options.fileName || 'Mapa Exportado',
      documentDescription: 'Exportado do AGENT - Neutra+ Map Editor',
      simplestyle: options.includeStyles,
    });

    // Criar arquivo ZIP
    const zip = new JSZip();
    zip.file('doc.kml', kmlString);

    // Configurar compressão baseada na opção
    const compressionLevel = getCompressionLevel(options.compression);
    
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: compressionLevel
      }
    });

    const fileName = ensureExtension(options.fileName, '.kmz');
    saveAs(zipBlob, fileName);

    return {
      success: true,
      message: 'Arquivo KMZ exportado com sucesso',
      fileName,
      size: zipBlob.size
    };

  } catch (error) {
    console.error('Erro ao exportar KMZ:', error);
    return {
      success: false,
      message: `Erro ao exportar KMZ: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
};

/**
 * Exporta features para arquivo GeoJSON
 */
export const exportToGeoJSON = async (
  features: GeoJSON.Feature[],
  options: SaveOptions
): Promise<ExportResult> => {
  try {
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.filter(f => f && f.geometry)
    };

    if (featureCollection.features.length === 0) {
      return {
        success: false,
        message: 'Nenhuma feature válida para exportar'
      };
    }

    // Processar features se preserveMetadata for false
    if (!options.preserveMetadata) {
      featureCollection.features = featureCollection.features.map(feature => ({
        ...feature,
        properties: {
          name: feature.properties?.name || feature.properties?.nome || `Feature ${feature.id}`,
          description: feature.properties?.description || feature.properties?.descricao || '',
        }
      }));
    }

    const geoJsonString = JSON.stringify(featureCollection, null, 2);
    const blob = new Blob([geoJsonString], { type: 'application/geo+json' });
    const fileName = ensureExtension(options.fileName, '.geojson');
    
    saveAs(blob, fileName);

    return {
      success: true,
      message: 'Arquivo GeoJSON exportado com sucesso',
      fileName,
      size: blob.size
    };

  } catch (error) {
    console.error('Erro ao exportar GeoJSON:', error);
    return {
      success: false,
      message: `Erro ao exportar GeoJSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
};

/**
 * Função principal de exportação que escolhe o formato correto
 */
export const exportFeatures = async (
  features: GeoJSON.Feature[],
  options: SaveOptions
): Promise<ExportResult> => {
  switch (options.format) {
    case 'kml':
      return exportToKML(features, options);
    case 'kmz':
      return exportToKMZ(features, options);
    case 'geojson':
      return exportToGeoJSON(features, options);
    default:
      return {
        success: false,
        message: `Formato '${options.format}' não suportado`
      };
  }
};

/**
 * Salva dados no IndexedDB para auto-save
 */
export const saveToIndexedDB = async (
  data: any,
  key: string = 'autosave'
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('AgentMapEditor', 1);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB');
        resolve(false);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves');
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['saves'], 'readwrite');
        const store = transaction.objectStore('saves');
        
        const saveRequest = store.put({
          data,
          timestamp: Date.now()
        }, key);

        saveRequest.onsuccess = () => resolve(true);
        saveRequest.onerror = () => resolve(false);
      };
    } catch (error) {
      console.error('Erro ao salvar no IndexedDB:', error);
      resolve(false);
    }
  });
};

/**
 * Carrega dados do IndexedDB
 */
export const loadFromIndexedDB = async (
  key: string = 'autosave'
): Promise<any | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('AgentMapEditor', 1);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB');
        resolve(null);
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['saves'], 'readonly');
        const store = transaction.objectStore('saves');
        
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.data : null);
        };

        getRequest.onerror = () => resolve(null);
      };
    } catch (error) {
      console.error('Erro ao carregar do IndexedDB:', error);
      resolve(null);
    }
  });
};

/**
 * Remove dados do IndexedDB
 */
export const removeFromIndexedDB = async (
  key: string = 'autosave'
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('AgentMapEditor', 1);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB');
        resolve(false);
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['saves'], 'readwrite');
        const store = transaction.objectStore('saves');
        
        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => resolve(false);
      };
    } catch (error) {
      console.error('Erro ao remover do IndexedDB:', error);
      resolve(false);
    }
  });
};

// Utilitários auxiliares

/**
 * Garante que o nome do arquivo tenha a extensão correta
 */
const ensureExtension = (fileName: string, extension: string): string => {
  if (!fileName.toLowerCase().endsWith(extension.toLowerCase())) {
    return `${fileName}${extension}`;
  }
  return fileName;
};

/**
 * Converte opção de compressão para nível numérico
 */
const getCompressionLevel = (compression: 'none' | 'fast' | 'best'): number => {
  switch (compression) {
    case 'none':
      return 0;
    case 'fast':
      return 3;
    case 'best':
      return 9;
    default:
      return 6;
  }
};

/**
 * Formata o tamanho do arquivo para exibição
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Valida se as features podem ser exportadas no formato escolhido
 */
export const validateFeaturesForExport = (
  features: GeoJSON.Feature[],
  format: 'kml' | 'kmz' | 'geojson'
): { valid: boolean; message?: string } => {
  if (!features || features.length === 0) {
    return { valid: false, message: 'Nenhuma feature para exportar' };
  }

  const validFeatures = features.filter(f => f && f.geometry);
  if (validFeatures.length === 0) {
    return { valid: false, message: 'Nenhuma feature válida encontrada' };
  }

  // Validações específicas por formato
  switch (format) {
    case 'kml':
    case 'kmz':
      // KML tem algumas limitações com certos tipos de geometria
      const unsupportedTypes = validFeatures.filter(f => 
        f.geometry?.type === 'GeometryCollection'
      );
      if (unsupportedTypes.length > 0) {
        return { 
          valid: true, 
          message: `${unsupportedTypes.length} feature(s) com GeometryCollection podem não ser exportadas corretamente` 
        };
      }
      break;

    case 'geojson':
      // GeoJSON suporta todos os tipos
      break;
  }

  return { valid: true };
};