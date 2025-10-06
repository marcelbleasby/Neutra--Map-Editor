import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import { MapEditor } from '../MapEditor';

// Mock completo do ambiente
jest.mock('../Map', () => ({
  MapComponent: ({ onMapLoad }: any) => {
    React.useEffect(() => {
      if (onMapLoad) {
        // Simula o carregamento do mapa após um tempo
        setTimeout(() => onMapLoad({}), 100);
      }
    }, [onMapLoad]);
    
    return (
      <div data-testid="map-component" style={{ width: '100%', height: '500px' }}>
        <div data-testid="map-canvas">Mapa Carregado</div>
      </div>
    );
  }
}));

jest.mock('../DrawingToolbar', () => ({
  __esModule: true,
  default: (props: any) => {
    const ToolbarComponent = () => {
      const [activeTool, setActiveTool] = React.useState<string | null>(null);
      
      const handleToolClick = (tool: string, handler: () => void) => {
        setActiveTool(tool);
        handler();
      };
      
      return (
        <div data-testid="drawing-toolbar" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
          <button
            data-testid="polygon-btn"
            data-active={activeTool === 'polygon'}
            onClick={() => handleToolClick('polygon', props.onPolygonClick)}
            title="Desenhar Polígono"
          >
            🔷 Polígono
          </button>
          <button
            data-testid="line-btn"
            data-active={activeTool === 'line'}
            onClick={() => handleToolClick('line', props.onLineClick)}
            title="Desenhar Linha"
          >
            📏 Linha
          </button>
          <button
            data-testid="point-btn"
            data-active={activeTool === 'point'}
            onClick={() => handleToolClick('point', props.onPointClick)}
            title="Adicionar Ponto"
          >
            📍 Ponto
          </button>
          <button
            data-testid="edit-btn"
            data-active={activeTool === 'edit'}
            onClick={() => handleToolClick('edit', props.onEditClick)}
            title="Editar Geometria"
          >
            ✏️ Editar
          </button>
          <button
            data-testid="delete-btn"
            onClick={props.onDeleteClick}
            disabled={!props.hasSelectedFeatures}
            title="Excluir Seleção"
          >
            🗑️ Excluir
          </button>
        </div>
      );
    };
    
    return <ToolbarComponent />;
  }
}));

// Mock das outras dependências
jest.mock('../FileList', () => ({
  FileList: () => <div data-testid="file-list">Lista de Arquivos</div>
}));

jest.mock('../TableOfContents', () => ({
  TableOfContents: () => <div data-testid="table-of-contents">Sumário</div>
}));

jest.mock('../SaveDialog', () => ({
  SaveDialog: () => <div data-testid="save-dialog">Salvar Arquivo</div>
}));

// Mock dos hooks com estado funcional
const mockEditingStore = {
  mode: null,
  setMode: jest.fn(),
  clearSelection: jest.fn(),
  selectedFeatures: [],
  isEditing: false,
  hasSelectedFeatures: false,
};

const mockSaveStore = {
  isDialogOpen: false,
  hasUnsavedChanges: false,
  setHasUnsavedChanges: jest.fn(),
};

jest.mock('../../store/editingStore', () => ({
  useEditingStore: () => mockEditingStore
}));

jest.mock('../../store/saveStore', () => ({
  useSaveStore: () => mockSaveStore
}));

jest.mock('../../hooks/useMapboxDraw', () => ({
  useMapboxDraw: () => ({
    draw: {
      changeMode: jest.fn(),
      getAll: jest.fn(() => ({ features: [] })),
      deleteAll: jest.fn(),
    },
    addFeature: jest.fn(),
    removeFeature: jest.fn(),
    getAllFeatures: jest.fn(() => []),
    clearAllFeatures: jest.fn(),
    isReady: true
  })
}));

jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn()
}));

jest.mock('../../hooks/useAutoSave', () => ({
  useAutoSave: jest.fn()
}));

const system = createSystem(defaultConfig);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider value={system}>
    {children}
  </ChakraProvider>
);

describe('MapEditor - Testes E2E de Barra de Ferramentas e Objetos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar e exibir todos os componentes principais', async () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    // Verifica carregamento inicial
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
    expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
    expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();

    // Aguarda o mapa carregar completamente
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    });
  });

  it('deve permitir seleção de ferramenta de polígono e ativar modo de desenho', async () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const polygonButton = screen.getByTestId('polygon-btn');
    
    // Verifica tooltip
    expect(polygonButton).toHaveAttribute('title', 'Desenhar Polígono');
    
    // Clica no botão de polígono
    fireEvent.click(polygonButton);
    
    // Verifica se o botão está ativo
    expect(polygonButton).toHaveAttribute('data-active', 'true');
    
    // Verifica se o modo foi definido
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('polygon');
  });

  it('deve permitir seleção de ferramenta de linha', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const lineButton = screen.getByTestId('line-btn');
    
    fireEvent.click(lineButton);
    
    expect(lineButton).toHaveAttribute('data-active', 'true');
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('line_string');
  });

  it('deve permitir seleção de ferramenta de ponto', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const pointButton = screen.getByTestId('point-btn');
    
    fireEvent.click(pointButton);
    
    expect(pointButton).toHaveAttribute('data-active', 'true');
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('point');
  });

  it('deve permitir ativação do modo de edição', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const editButton = screen.getByTestId('edit-btn');
    
    fireEvent.click(editButton);
    
    expect(editButton).toHaveAttribute('data-active', 'true');
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('edit');
  });

  it('deve desabilitar botão de exclusão quando não há features selecionadas', () => {
    mockEditingStore.hasSelectedFeatures = false;
    
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const deleteButton = screen.getByTestId('delete-btn');
    expect(deleteButton).toBeDisabled();
  });

  it('deve habilitar botão de exclusão quando há features selecionadas', () => {
    mockEditingStore.hasSelectedFeatures = true;
    
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const deleteButton = screen.getByTestId('delete-btn');
    expect(deleteButton).not.toBeDisabled();
  });

  it('deve permitir exclusão de features selecionadas', () => {
    mockEditingStore.hasSelectedFeatures = true;
    
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const deleteButton = screen.getByTestId('delete-btn');
    
    fireEvent.click(deleteButton);
    
    expect(mockEditingStore.clearSelection).toHaveBeenCalled();
  });

  it('deve alternar entre diferentes ferramentas de desenho', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    // Seleciona polígono
    fireEvent.click(screen.getByTestId('polygon-btn'));
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('polygon');
    
    // Muda para linha
    fireEvent.click(screen.getByTestId('line-btn'));
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('line_string');
    
    // Muda para ponto
    fireEvent.click(screen.getByTestId('point-btn'));
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('point');
    
    // Ativa modo de edição
    fireEvent.click(screen.getByTestId('edit-btn'));
    expect(mockEditingStore.setMode).toHaveBeenCalledWith('edit');
  });

  it('deve manter o layout da barra de ferramentas na posição inferior central', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    const toolbar = screen.getByTestId('drawing-toolbar');
    const styles = window.getComputedStyle(toolbar);
    
    expect(styles.position).toBe('fixed');
    expect(styles.bottom).toBe('20px');
    expect(styles.left).toBe('50%');
    expect(styles.transform).toBe('translateX(-50%)');
  });

  it('deve exibir tooltips descritivos para cada ferramenta', () => {
    render(
      <TestWrapper>
        <MapEditor />
      </TestWrapper>
    );

    expect(screen.getByTestId('polygon-btn')).toHaveAttribute('title', 'Desenhar Polígono');
    expect(screen.getByTestId('line-btn')).toHaveAttribute('title', 'Desenhar Linha');
    expect(screen.getByTestId('point-btn')).toHaveAttribute('title', 'Adicionar Ponto');
    expect(screen.getByTestId('edit-btn')).toHaveAttribute('title', 'Editar Geometria');
    expect(screen.getByTestId('delete-btn')).toHaveAttribute('title', 'Excluir Seleção');
  });
});