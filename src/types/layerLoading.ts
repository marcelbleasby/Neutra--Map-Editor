export interface LayerMetadata {
  id: string;
  name: string;
  type: 'KML' | 'GeoJSON' | 'Shapefile';
  fileSize: number;
  featureCount: number;
  bounds: BBox;
  geometryTypes: string[];
  lastModified: Date;
  chunkCount?: number;
  estimatedMemorySize: number;
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface CachedLayer {
  layerId: string;
  data: GeoJSON.Feature[];
  loadedChunks: Set<number>;
  lastAccessed: Date;
  memorySize: number;
  bounds: BBox;
}

export interface LoadingProgress {
  layerId: string;
  loaded: number;
  total: number;
  status: 'loading' | 'completed' | 'error' | 'cancelled';
  message?: string;
}

export interface LayerLoadingConfig {
  chunkSize: number; // bytes
  viewportBuffer: number; // percentage
  cacheTimeout: number; // milliseconds
  maxMemoryUsage: number; // bytes
  maxConcurrentLoads: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export enum LayerStatus {
  UNLOADED = 'unloaded',
  LOADING_METADATA = 'loading-metadata', 
  METADATA_LOADED = 'metadata-loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  UNLOADING = 'unloading'
}

export interface LayerError {
  layerId: string;
  message: string;
  code: string;
  timestamp: Date;
  retryCount: number;
}