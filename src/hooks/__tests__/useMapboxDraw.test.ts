import { renderHook, act } from '@testing-library/react';
import { useMapboxDraw } from '../useMapboxDraw';
import { useEditingStore } from '../../store/editingStore';

// Mock mapbox-gl-draw
jest.mock('@mapbox/mapbox-gl-draw', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    set: jest.fn(),
    get: jest.fn(() => ({ features: [] })),
    getAll: jest.fn(() => ({ features: [] })),
    getSelected: jest.fn(() => ({ features: [] })),
    getSelectedIds: jest.fn(() => []),
    changeMode: jest.fn(),
    modes: {
      draw_polygon: 'draw_polygon',
      draw_line_string: 'draw_line_string',
      draw_point: 'draw_point',
      direct_select: 'direct_select',
      simple_select: 'simple_select',
    },
  }));
});

// Mock the editing store
jest.mock('../../store/editingStore', () => ({
  useEditingStore: jest.fn(),
}));

const mockUseEditingStore = useEditingStore as jest.MockedFunction<typeof useEditingStore>;

describe('useMapboxDraw', () => {
  const mockMap = {
    on: jest.fn(),
    off: jest.fn(),
    addControl: jest.fn(),
    removeControl: jest.fn(),
  } as any;

  const mockEditingStore = {
    selectedTool: null,
    hasSelectedFeatures: false,
    setSelectedTool: jest.fn(),
    clearSelection: jest.fn(),
    addFeature: jest.fn(),
    updateFeature: jest.fn(),
    deleteFeature: jest.fn(),
    setSelectedFeatures: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditingStore.mockReturnValue(mockEditingStore as any);
  });

  it('deve inicializar o MapboxDraw quando o mapa for fornecido', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    
    expect(result.current.draw).toBeDefined();
  });

  it('deve retornar null quando o mapa não for fornecido', () => {
    const { result } = renderHook(() => useMapboxDraw(null));
    
    expect(result.current.draw).toBeNull();
  });

  it('deve fornecer métodos para gerenciar features', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    
    expect(result.current.addFeature).toBeDefined();
    expect(result.current.removeFeature).toBeDefined();
    expect(result.current.getAllFeatures).toBeDefined();
    expect(result.current.clearAllFeatures).toBeDefined();
  });

  it('deve adicionar feature quando addFeature for chamado', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    const mockFeature = {
      id: 'test-feature',
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {}
    } as any;
    
    act(() => {
      result.current.addFeature(mockFeature);
    });
    
    // Verifica se o método add do MapboxDraw foi chamado (através do mock)
    expect(result.current.draw?.add).toHaveBeenCalledWith(mockFeature);
  });

  it('deve remover feature quando removeFeature for chamado', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    const featureId = 'test-feature-id';
    
    act(() => {
      result.current.removeFeature(featureId);
    });
    
    // Verifica se o método delete do MapboxDraw foi chamado (através do mock)
    expect(result.current.draw?.delete).toHaveBeenCalledWith(featureId);
  });

  it('deve obter todas as features quando getAllFeatures for chamado', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    
    act(() => {
      result.current.getAllFeatures();
    });
    
    // Verifica se o método getAll do MapboxDraw foi chamado (através do mock)
    expect(result.current.draw?.getAll).toHaveBeenCalled();
  });

  it('deve limpar todas as features quando clearAllFeatures for chamado', () => {
    const { result } = renderHook(() => useMapboxDraw(mockMap));
    
    act(() => {
      result.current.clearAllFeatures();
    });
    
    // Verifica se o método deleteAll do MapboxDraw foi chamado (através do mock)
    expect(result.current.draw?.deleteAll).toHaveBeenCalled();
  });
});