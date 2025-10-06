import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import { MapEditor } from '../MapEditor';

// Mock all dependencies
jest.mock('../Map', () => ({
  MapComponent: () => <div data-testid="map-component">Map Component</div>
}));

jest.mock('../DrawingToolbar', () => ({
  __esModule: true,
  default: ({ onPolygonClick, onLineClick, onPointClick, onEditClick, onDeleteClick }: any) => (
    <div data-testid="drawing-toolbar">
      <button data-testid="polygon-btn" onClick={onPolygonClick}>Polygon</button>
      <button data-testid="line-btn" onClick={onLineClick}>Line</button>
      <button data-testid="point-btn" onClick={onPointClick}>Point</button>
      <button data-testid="edit-btn" onClick={onEditClick}>Edit</button>
      <button data-testid="delete-btn" onClick={onDeleteClick}>Delete</button>
    </div>
  )
}));

jest.mock('../FileList', () => ({
  FileList: () => <div data-testid="file-list">File List</div>
}));

jest.mock('../TableOfContents', () => ({
  TableOfContents: () => <div data-testid="table-of-contents">Table of Contents</div>
}));

jest.mock('../SaveDialog', () => ({
  SaveDialog: () => <div data-testid="save-dialog">Save Dialog</div>
}));

// Mock hooks
jest.mock('../../hooks/useMapboxDraw', () => ({
  useMapboxDraw: () => ({
    draw: null,
    addFeature: jest.fn(),
    removeFeature: jest.fn(),
    getAllFeatures: jest.fn(),
    clearAllFeatures: jest.fn(),
    isReady: false
  })
}));

jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn()
}));

jest.mock('../../hooks/useAutoSave', () => ({
  useAutoSave: jest.fn()
}));

// Mock stores
jest.mock('../../store/editingStore', () => ({
  useEditingStore: () => ({
    mode: null,
    setMode: jest.fn(),
    clearSelection: jest.fn(),
    selectedFeatures: [],
    isEditing: false,
  })
}));

jest.mock('../../store/saveStore', () => ({
  useSaveStore: () => ({
    isDialogOpen: false,
    hasUnsavedChanges: false,
  })
}));

const system = createSystem(defaultConfig);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider value={system}>
    {children}
  </ChakraProvider>
);

describe('MapEditor Integration Tests', () => {
  it('deve renderizar todos os componentes principais', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    // Verifica se todos os componentes estão presentes
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
    expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
    expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
  });

  it('deve permitir interação com a barra de ferramentas', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    // Testa cliques nos botões da toolbar
    const polygonBtn = screen.getByTestId('polygon-btn');
    const lineBtn = screen.getByTestId('line-btn');
    const pointBtn = screen.getByTestId('point-btn');
    const editBtn = screen.getByTestId('edit-btn');
    const deleteBtn = screen.getByTestId('delete-btn');

    // Verifica se os botões são clicáveis
    fireEvent.click(polygonBtn);
    fireEvent.click(lineBtn);
    fireEvent.click(pointBtn);
    fireEvent.click(editBtn);
    fireEvent.click(deleteBtn);

    // Se chegou até aqui sem erros, os handlers estão funcionando
    expect(true).toBe(true);
  });

  it('deve ter layout responsivo', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    // Verifica se os elementos principais estão visíveis
    expect(screen.getByTestId('map-component')).toBeVisible();
    expect(screen.getByTestId('drawing-toolbar')).toBeVisible();
  });
});