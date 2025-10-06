import * as turf from '@turf/turf';

export interface GeometryValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface SnapResult {
  point: [number, number];
  distance: number;
  featureId?: string;
  type: 'vertex' | 'edge' | 'intersection';
}

export interface MeasurementResult {
  length?: number;
  area?: number;
  perimeter?: number;
  unit: string;
  formatted: string;
}

/**
 * Valida uma geometria GeoJSON
 */
export const validateGeometry = (feature: GeoJSON.Feature): GeometryValidation => {
  try {
    if (!feature || !feature.geometry) {
      return { isValid: false, error: 'Geometria não encontrada' };
    }

    // Verificar se a geometria tem coordenadas (excluir GeometryCollection)
    if (feature.geometry.type === 'GeometryCollection') {
      return { isValid: true, warnings: ['GeometryCollection não totalmente suportado'] };
    }

    const geometryWithCoords = feature.geometry as Exclude<GeoJSON.Geometry, GeoJSON.GeometryCollection>;
    if (!geometryWithCoords.coordinates) {
      return { isValid: false, error: 'Coordenadas não encontradas' };
    }

    switch (feature.geometry.type) {
      case 'Point':
        return validatePoint(feature as GeoJSON.Feature<GeoJSON.Point>);
      
      case 'LineString':
        return validateLineString(feature as GeoJSON.Feature<GeoJSON.LineString>);
      
      case 'Polygon':
        return validatePolygon(feature as GeoJSON.Feature<GeoJSON.Polygon>);
      
      case 'MultiPoint':
      case 'MultiLineString':
      case 'MultiPolygon':
        return validateMultiGeometry(feature);
      
      default:
        return { 
          isValid: true, 
          warnings: [`Tipo de geometria '${(feature.geometry as any).type}' não totalmente suportado`] 
        };
    }
  } catch (error) {
    return { 
      isValid: false, 
      error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    };
  }
};

const validatePoint = (feature: GeoJSON.Feature<GeoJSON.Point>): GeometryValidation => {
  const coords = feature.geometry.coordinates;
  
  if (coords.length < 2) {
    return { isValid: false, error: 'Ponto deve ter pelo menos 2 coordenadas (longitude, latitude)' };
  }

  const [lng, lat] = coords;
  
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return { isValid: false, error: 'Coordenadas devem ser números' };
  }

  if (Math.abs(lng) > 180) {
    return { isValid: false, error: 'Longitude inválida (deve estar entre -180 e 180)' };
  }

  if (Math.abs(lat) > 90) {
    return { isValid: false, error: 'Latitude inválida (deve estar entre -90 e 90)' };
  }

  // Verificar se está em uma localização válida (não no oceano para projetos brasileiros)
  const warnings: string[] = [];
  if (lng < -75 || lng > -30 || lat < -35 || lat > 5) {
    warnings.push('Coordenadas fora do território brasileiro');
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
};

const validateLineString = (feature: GeoJSON.Feature<GeoJSON.LineString>): GeometryValidation => {
  const coords = feature.geometry.coordinates;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (coords.length < 2) {
    return { isValid: false, error: 'Linha deve ter pelo menos 2 pontos' };
  }

  // Verificar pontos válidos
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return { isValid: false, error: `Coordenada inválida no ponto ${i + 1}` };
    }
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return { isValid: false, error: `Coordenada fora dos limites no ponto ${i + 1}` };
    }
  }

  // Verificar pontos duplicados consecutivos
  for (let i = 1; i < coords.length; i++) {
    if (coords[i][0] === coords[i-1][0] && coords[i][1] === coords[i-1][1]) {
      warnings.push(`Pontos duplicados consecutivos encontrados (posições ${i} e ${i+1})`);
      suggestions.push('Remover pontos duplicados para otimizar a geometria');
      break;
    }
  }

  // Calcular comprimento e verificar se é muito pequeno
  try {
    const length = turf.length(feature, { units: 'meters' });
    if (length < 0.1) { // Menor que 10cm
      warnings.push('Linha muito pequena (menor que 10cm)');
      suggestions.push('Considere verificar se esta linha é necessária');
    }
  } catch (error) {
    warnings.push('Não foi possível calcular o comprimento da linha');
  }

  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

const validatePolygon = (feature: GeoJSON.Feature<GeoJSON.Polygon>): GeometryValidation => {
  const coords = feature.geometry.coordinates;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (coords.length === 0) {
    return { isValid: false, error: 'Polígono não pode estar vazio' };
  }

  const exteriorRing = coords[0];
  
  if (exteriorRing.length < 4) {
    return { isValid: false, error: 'Polígono deve ter pelo menos 4 pontos (incluindo fechamento)' };
  }

  // Verificar se o primeiro e último ponto são iguais (fechamento)
  const firstPoint = exteriorRing[0];
  const lastPoint = exteriorRing[exteriorRing.length - 1];
  
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    return { isValid: false, error: 'Polígono deve ser fechado (primeiro e último ponto iguais)' };
  }

  // Verificar coordenadas válidas
  for (let i = 0; i < exteriorRing.length; i++) {
    const [lng, lat] = exteriorRing[i];
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return { isValid: false, error: `Coordenada inválida no ponto ${i + 1}` };
    }
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return { isValid: false, error: `Coordenada fora dos limites no ponto ${i + 1}` };
    }
  }

  // Verificar auto-interseção usando Turf.js
  try {
    const kinks = turf.kinks(feature);
    if (kinks.features.length > 0) {
      return { 
        isValid: false, 
        error: 'Polígono contém auto-interseções',
        suggestions: ['Use a ferramenta de simplificação para corrigir auto-interseções']
      };
    }
  } catch (error) {
    warnings.push('Não foi possível verificar auto-interseções');
  }

  // Verificar área
  try {
    const area = turf.area(feature);
    if (area < 1) { // Menor que 1m²
      warnings.push('Polígono muito pequeno (área menor que 1m²)');
      suggestions.push('Verifique se este polígono é necessário');
    }
  } catch (error) {
    warnings.push('Não foi possível calcular a área do polígono');
  }

  // Verificar anéis internos (holes)
  if (coords.length > 1) {
    for (let i = 1; i < coords.length; i++) {
      const hole = coords[i];
      if (hole.length < 4) {
        return { isValid: false, error: `Anel interno ${i} deve ter pelo menos 4 pontos` };
      }
      
      // Verificar fechamento do hole
      const holeFirst = hole[0];
      const holeLast = hole[hole.length - 1];
      if (holeFirst[0] !== holeLast[0] || holeFirst[1] !== holeLast[1]) {
        return { isValid: false, error: `Anel interno ${i} deve ser fechado` };
      }
    }
  }

  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

const validateMultiGeometry = (feature: GeoJSON.Feature): GeometryValidation => {
  // Validação básica para multi-geometrias
  // Implementação simplificada - pode ser expandida conforme necessário
  return { 
    isValid: true, 
    warnings: ['Multi-geometrias têm validação limitada'] 
  };
};

/**
 * Encontra pontos de snap próximos a um ponto alvo
 */
export const findSnapPoints = (
  features: GeoJSON.Feature[], 
  targetPoint: [number, number], 
  tolerance: number = 0.0001
): SnapResult[] => {
  const results: SnapResult[] = [];
  const targetTurfPoint = turf.point(targetPoint);

  features.forEach(feature => {
    if (!feature.geometry) return;

    try {
      switch (feature.geometry.type) {
        case 'Point':
          const point = feature.geometry.coordinates as [number, number];
          const distance = turf.distance(targetTurfPoint, turf.point(point), { units: 'meters' });
          
          if (distance <= tolerance * 111000) { // Converter para metros
            results.push({
              point,
              distance,
              featureId: feature.id as string,
              type: 'vertex'
            });
          }
          break;

        case 'LineString':
          const lineCoords = feature.geometry.coordinates as [number, number][];
          
          // Verificar vértices
          lineCoords.forEach(coord => {
            const distance = turf.distance(targetTurfPoint, turf.point(coord), { units: 'meters' });
            if (distance <= tolerance * 111000) {
              results.push({
                point: coord,
                distance,
                featureId: feature.id as string,
                type: 'vertex'
              });
            }
          });

          // Verificar ponto mais próximo na linha
          const line = turf.lineString(lineCoords);
          const nearestPointOnLine = turf.nearestPointOnLine(line, targetTurfPoint);
          const edgeDistance = turf.distance(targetTurfPoint, nearestPointOnLine, { units: 'meters' });
          
          if (edgeDistance <= tolerance * 111000) {
            results.push({
              point: nearestPointOnLine.geometry.coordinates as [number, number],
              distance: edgeDistance,
              featureId: feature.id as string,
              type: 'edge'
            });
          }
          break;

        case 'Polygon':
          const ringCoords = feature.geometry.coordinates[0] as [number, number][];
          
          // Verificar vértices do polígono
          ringCoords.forEach(coord => {
            const distance = turf.distance(targetTurfPoint, turf.point(coord), { units: 'meters' });
            if (distance <= tolerance * 111000) {
              results.push({
                point: coord,
                distance,
                featureId: feature.id as string,
                type: 'vertex'
              });
            }
          });
          break;
      }
    } catch (error) {
      console.warn('Erro ao calcular snap para feature:', feature.id, error);
    }
  });

  // Ordenar por distância e retornar os mais próximos
  return results
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5); // Máximo 5 pontos de snap
};

/**
 * Simplifica uma geometria removendo pontos desnecessários
 */
export const simplifyGeometry = (
  feature: GeoJSON.Feature, 
  tolerance: number = 0.0001,
  preserveTopology: boolean = true
): GeoJSON.Feature => {
  try {
    return turf.simplify(feature, { tolerance, mutate: false });
  } catch (error) {
    console.warn('Erro ao simplificar geometria:', error);
    return feature; // Retornar original se não conseguir simplificar
  }
};

/**
 * Cria um buffer ao redor de uma geometria
 */
export const bufferGeometry = (
  feature: GeoJSON.Feature, 
  distance: number, 
  units: turf.Units = 'meters'
): GeoJSON.Feature | null => {
  try {
    const result = turf.buffer(feature, distance, { units });
    return result || null;
  } catch (error) {
    console.warn('Erro ao criar buffer:', error);
    return null;
  }
};

/**
 * Mede uma geometria (comprimento, área, perímetro)
 */
export const measureGeometry = (feature: GeoJSON.Feature): MeasurementResult => {
  try {
    switch (feature.geometry?.type) {
      case 'Point':
        return {
          unit: 'N/A',
          formatted: 'Ponto - sem medição'
        };

      case 'LineString':
        const length = turf.length(feature, { units: 'meters' });
        return {
          length,
          unit: 'metros',
          formatted: formatDistance(length)
        };

      case 'Polygon':
        const area = turf.area(feature);
        const perimeter = turf.length(turf.polygonToLine(feature as any), { units: 'meters' });
        
        return {
          area,
          perimeter,
          unit: 'm² / metros',
          formatted: `${formatArea(area)} / ${formatDistance(perimeter)}`
        };

      default:
        return {
          unit: 'N/A',
          formatted: 'Tipo de geometria não suportado'
        };
    }
  } catch (error) {
    return {
      unit: 'Erro',
      formatted: 'Erro no cálculo'
    };
  }
};

/**
 * Formata distância para exibição
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  } else if (meters < 1000) {
    return `${meters.toFixed(2)} m`;
  } else {
    return `${(meters / 1000).toFixed(2)} km`;
  }
};

/**
 * Formata área para exibição
 */
export const formatArea = (squareMeters: number): string => {
  if (squareMeters < 1) {
    return `${Math.round(squareMeters * 10000)} cm²`;
  } else if (squareMeters < 10000) {
    return `${squareMeters.toFixed(2)} m²`;
  } else {
    return `${(squareMeters / 10000).toFixed(2)} ha`;
  }
};

/**
 * Verifica se um ponto está dentro de um polígono
 */
export const pointInPolygon = (
  point: [number, number], 
  polygon: GeoJSON.Feature<GeoJSON.Polygon>
): boolean => {
  try {
    return turf.booleanPointInPolygon(turf.point(point), polygon);
  } catch (error) {
    return false;
  }
};

/**
 * Calcula a interseção entre duas geometrias
 */
export const intersectGeometries = (
  feature1: GeoJSON.Feature,
  feature2: GeoJSON.Feature
): GeoJSON.Feature | null => {
  try {
    // Verificar se as geometrias são compatíveis para interseção
    if (feature1.geometry?.type === 'Point' || feature2.geometry?.type === 'Point') {
      return null; // Pontos não têm interseção
    }

    // Cast para tipos suportados pelo turf.intersect
    const intersection = turf.intersect(feature1 as any, feature2 as any);
    return intersection;
  } catch (error) {
    console.warn('Erro ao calcular interseção:', error);
    return null;
  }
};

/**
 * Aplica offset a coordenadas (para duplicação de elementos)
 */
export const offsetCoordinates = (coords: any, offset: number = 0.0001): any => {
  if (Array.isArray(coords)) {
    if (typeof coords[0] === 'number') {
      // É um ponto [lng, lat]
      return [coords[0] + offset, coords[1] + offset];
    } else {
      // É um array de coordenadas
      return coords.map((coord: any) => offsetCoordinates(coord, offset));
    }
  }
  return coords;
};