import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import { MapComponent } from '../MapComponent';

// Mock mapbox-gl
jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    addControl: jest.fn(),
    removeControl: jest.fn(),
    getCanvas: jest.fn(() => ({ style: {} })),
    resize: jest.fn(),
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  ScaleControl: jest.fn(),
}));

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
jest.mock('../../../store/editingStore', () => ({
  useEditingStore: jest.fn(() => ({
    selectedTool: null,
    hasSelectedFeatures: false,
    setSelectedTool: jest.fn(),
    clearSelection: jest.fn(),
  })),
}));

const system = createSystem(defaultConfig);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider value={system}>
    {children}
  </ChakraProvider>
);

describe('MapComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o componente do mapa', () => {
    render(
      <TestWrapper>
        <MapComponent />
      </TestWrapper>
    );

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  it('deve exibir erro quando o token do Mapbox não estiver configurado', () => {
    // Mock environment variable as empty
    const originalEnv = process.env;
    process.env = { ...originalEnv, REACT_APP_MAPBOX_TOKEN: '' };

    render(
      <TestWrapper>
        <MapComponent />
      </TestWrapper>
    );

    expect(screen.getByText(/token de acesso do mapbox é obrigatório/i)).toBeInTheDocument();

    process.env = originalEnv;
  });

  it('deve renderizar o loading inicialmente', () => {
    render(
      <TestWrapper>
        <MapComponent />
      </TestWrapper>
    );

    expect(screen.getByText(/carregando mapa/i)).toBeInTheDocument();
  });
});

describe('MapComponent - Integração com DrawingToolbar', () => {
  it('deve integrar corretamente com a barra de ferramentas', async () => {
    render(
      <TestWrapper>
        <MapComponent />
      </TestWrapper>
    );

    // Aguarda o mapa carregar
    await waitFor(() => {
      expect(screen.queryByText(/carregando mapa/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Verifica se a barra de ferramentas está presente
    const toolbar = screen.getByRole('group');
    expect(toolbar).toBeInTheDocument();
  });
});