export interface LayerElement {
  id: string;
  nome: string;
  tipo: 'poste' | 'caixa' | 'fibra' | 'cabo' | 'equipamento';
  geometria: GeoJSON.Geometry;
  propriedades: Record<string, any>;
  visivel: boolean;
  cor?: string;
}

export interface LayerGroup {
  id: string;
  nome: string;
  elementos: LayerElement[];
  visivel: boolean;
  expandido: boolean;
  icone?: string;
}

export interface NetworkLayer {
  id: string;
  nome: string;
  grupos: LayerGroup[];
  visivel: boolean;
  ordem: number;
}