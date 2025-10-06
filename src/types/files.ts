export interface KMLFile {
  id: string;
  nome: string;
  tipo: 'KML' | 'KMZ';
  dataCreacao: string;
  ultimaModificacao: string;
  tamanho: number;
  descricao?: string;
  url: string;
}

export interface FileListResponse {
  results: KMLFile[];
  count: number;
  next?: string;
  previous?: string;
}

export interface FileSearchParams {
  search?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
}