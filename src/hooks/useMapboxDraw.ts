import { useEffect, useRef, useCallback, useMemo } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Map } from 'mapbox-gl';
import { useEditingStore } from '../store/editingStore';
import { useSaveStore } from '../store/saveStore';
import { validateGeometry } from '../utils/geometryUtils';

interface DrawConfig {
  displayControlsDefault: boolean;
  controls?: {
    point?: boolean;
    line_string?: boolean;
    polygon?: boolean;
    trash?: boolean;
    combine_features?: boolean;
    uncombine_features?: boolean;
  };
  styles?: any[];
}

export const useMapboxDraw = (map: Map | null) => {
  const drawRef = useRef<MapboxDraw | null>(null);
  
  const {
    mode,
    selectedFeatures,
    addOperation,
    setSelectedFeatures,
    addModifiedFeature,
    setIsEditing
  } = useEditingStore();

  const { setHasUnsavedChanges } = useSaveStore();

  // Estilos para o Mapbox Draw
  const drawStyles = useMemo(() => [
    // Pontos
    {
      'id': 'gl-draw-point-point-stroke-inactive',
      'type': 'circle',
      'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point']],
      'paint': {
        'circle-radius': 5,
        'circle-color': '#fff',
        'circle-stroke-color': '#3b82f6',
        'circle-stroke-width': 2
      }
    },
    {
      'id': 'gl-draw-point-point-stroke-active',
      'type': 'circle',
      'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
      'paint': {
        'circle-radius': 7,
        'circle-color': '#fbbf24',
        'circle-stroke-color': '#f59e0b',
        'circle-stroke-width': 2
      }
    },
    // Linhas
    {
      'id': 'gl-draw-line-inactive',
      'type': 'line',
      'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
      'layout': { 'line-cap': 'round', 'line-join': 'round' },
      'paint': { 'line-color': '#3b82f6', 'line-width': 3 }
    },
    {
      'id': 'gl-draw-line-active',
      'type': 'line',
      'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
      'layout': { 'line-cap': 'round', 'line-join': 'round' },
      'paint': { 'line-color': '#f59e0b', 'line-width': 3 }
    },
    // Polígonos
    {
      'id': 'gl-draw-polygon-fill-inactive',
      'type': 'fill',
      'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
      'paint': { 'fill-color': '#3b82f6', 'fill-opacity': 0.1 }
    },
    {
      'id': 'gl-draw-polygon-fill-active',
      'type': 'fill',
      'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
      'paint': { 'fill-color': '#f59e0b', 'fill-opacity': 0.2 }
    },
    {
      'id': 'gl-draw-polygon-stroke-inactive',
      'type': 'line',
      'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
      'layout': { 'line-cap': 'round', 'line-join': 'round' },
      'paint': { 'line-color': '#3b82f6', 'line-width': 2 }
    },
    {
      'id': 'gl-draw-polygon-stroke-active',
      'type': 'line',
      'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
      'layout': { 'line-cap': 'round', 'line-join': 'round' },
      'paint': { 'line-color': '#f59e0b', 'line-width': 2 }
    }
  ], []);

  // Configuração do Mapbox Draw
  const drawConfig: DrawConfig = useMemo(() => ({
    displayControlsDefault: false,
    controls: {
      point: true,
      line_string: true,
      polygon: true,
      trash: true,
      combine_features: false,
      uncombine_features: false,
    },
    styles: drawStyles,
  }), [drawStyles]);

  // Manipuladores de eventos
  const handleDrawCreate = useCallback((e: any) => {
    const feature = e.features[0];
    
    // Validar geometria
    const validation = validateGeometry(feature);
    if (!validation.isValid) {
      console.warn('Geometria inválida criada:', validation.error);
      return;
    }

    // Adicionar ao histórico
    addOperation({
      type: 'create',
      featureId: feature.id,
      after: feature
    });

    // Marcar como modificado
    addModifiedFeature(feature);
    setHasUnsavedChanges(true);

    console.log('Feature criada:', feature.id);
  }, [addOperation, addModifiedFeature, setHasUnsavedChanges]);

  const handleDrawUpdate = useCallback((e: any) => {
    const feature = e.features[0];
    
    // Validar geometria
    const validation = validateGeometry(feature);
    if (!validation.isValid) {
      console.warn('Geometria inválida após atualização:', validation.error);
      return;
    }

    // Adicionar ao histórico
    addOperation({
      type: 'update',
      featureId: feature.id,
      after: feature
    });

    // Marcar como modificado
    addModifiedFeature(feature);
    setHasUnsavedChanges(true);

    console.log('Feature atualizada:', feature.id);
  }, [addOperation, addModifiedFeature, setHasUnsavedChanges]);

  const handleDrawDelete = useCallback((e: any) => {
    const feature = e.features[0];

    // Adicionar ao histórico
    addOperation({
      type: 'delete',
      featureId: feature.id,
      before: feature
    });

    setHasUnsavedChanges(true);
    console.log('Feature deletada:', feature.id);
  }, [addOperation, setHasUnsavedChanges]);

  // Inicializar/atualizar Mapbox Draw
  useEffect(() => {
    if (!map) return;

    // Criar nova instância do draw
    const draw = new MapboxDraw(drawConfig);
    drawRef.current = draw;

    // Adicionar ao mapa (cast para any para contornar problema de tipos)
    (map as any).addControl(draw, 'top-left');

    // Configurar event listeners
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawDelete);

    return () => {
      if (drawRef.current) {
        map.off('draw.create', handleDrawCreate);
        map.off('draw.update', handleDrawUpdate);
        map.off('draw.delete', handleDrawDelete);
        
        try {
          (map as any).removeControl(drawRef.current);
        } catch (error) {
          console.warn('Erro ao remover controle draw:', error);
        }
        
        drawRef.current = null;
      }
    };
  }, [map, drawConfig, handleDrawCreate, handleDrawUpdate, handleDrawDelete]);

  // Alterar modo do draw baseado no estado
  useEffect(() => {
    if (!drawRef.current) return;

    const draw = drawRef.current;
    let drawMode = 'simple_select';

    switch (mode) {
      case 'point':
        drawMode = 'draw_point';
        break;
      case 'line_string':
        drawMode = 'draw_line_string';
        break;
      case 'polygon':
        drawMode = 'draw_polygon';
        break;
      case 'edit':
        drawMode = 'direct_select';
        break;
      case 'delete':
        drawMode = 'simple_select';
        break;
      default:
        drawMode = 'simple_select';
    }

    try {
      if (draw.getMode() !== drawMode) {
        draw.changeMode(drawMode);
        setIsEditing(drawMode !== 'simple_select');
      }
    } catch (error) {
      console.warn('Erro ao alterar modo do draw:', error);
    }
  }, [mode, setIsEditing]);

  // Atualizar seleção
  useEffect(() => {
    if (!drawRef.current || !selectedFeatures.length) return;

    try {
      const draw = drawRef.current;
      const currentSelection = draw.getSelectedIds();
      
      if (currentSelection.join(',') !== selectedFeatures.join(',')) {
        draw.changeMode('simple_select', { featureIds: selectedFeatures });
      }
    } catch (error) {
      console.warn('Erro ao atualizar seleção:', error);
    }
  }, [selectedFeatures]);

  // Métodos públicos
  const addFeature = useCallback((feature: GeoJSON.Feature) => {
    if (!drawRef.current) return;

    try {
      drawRef.current.add(feature);
      console.log('Feature adicionada:', feature.id);
    } catch (error) {
      console.error('Erro ao adicionar feature:', error);
    }
  }, []);

  const removeFeature = useCallback((featureId: string) => {
    if (!drawRef.current) return;

    try {
      drawRef.current.delete(featureId);
      console.log('Feature removida:', featureId);
    } catch (error) {
      console.error('Erro ao remover feature:', error);
    }
  }, []);

  const getAllFeatures = useCallback((): GeoJSON.Feature[] => {
    if (!drawRef.current) return [];

    try {
      return drawRef.current.getAll().features;
    } catch (error) {
      console.error('Erro ao obter features:', error);
      return [];
    }
  }, []);

  const clearAllFeatures = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.deleteAll();
      setSelectedFeatures([]);
      console.log('Todas as features foram removidas');
    } catch (error) {
      console.error('Erro ao limpar features:', error);
    }
  }, [setSelectedFeatures]);

  return {
    draw: drawRef.current,
    addFeature,
    removeFeature,
    getAllFeatures,
    clearAllFeatures,
    isReady: !!drawRef.current
  };
};