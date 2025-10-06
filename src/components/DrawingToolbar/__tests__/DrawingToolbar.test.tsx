import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import { DrawingToolbar } from '../DrawingToolbar';
import { useEditingStore } from '../../../store/editingStore';

// Mock the editing store
jest.mock('../../../store/editingStore', () => ({
  useEditingStore: jest.fn(),
}));

const mockUseEditingStore = useEditingStore as jest.MockedFunction<typeof useEditingStore>;

// Mock MapboxDraw
jest.mock('@mapbox/mapbox-gl-draw', () => ({
  modes: {
    draw_polygon: 'draw_polygon',
    draw_line_string: 'draw_line_string',
    draw_point: 'draw_point',
    direct_select: 'direct_select',
    simple_select: 'simple_select',
  },
}));

const system = createSystem(defaultConfig);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider value={system}>
    {children}
  </ChakraProvider>
);

describe('DrawingToolbar', () => {
  const mockProps = {
    onPolygonClick: jest.fn(),
    onLineClick: jest.fn(),
    onPointClick: jest.fn(),
    onEditClick: jest.fn(),
    onDeleteClick: jest.fn(),
    mode: 'draw_polygon', // or any valid mode value expected by DrawingToolbar
    onModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditingStore.mockReturnValue({
      selectedTool: null,
      hasSelectedFeatures: false,
      setSelectedTool: jest.fn(),
      clearSelection: jest.fn(),
    } as any);
  });

  it('deve renderizar todos os botões da barra de ferramentas', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    // Verifica se todos os botões estão presentes
    expect(screen.getByLabelText('Desenhar Polígono')).toBeInTheDocument();
    expect(screen.getByLabelText('Desenhar Linha')).toBeInTheDocument();
    expect(screen.getByLabelText('Adicionar Ponto')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar Geometria')).toBeInTheDocument();
    expect(screen.getByLabelText('Excluir Seleção')).toBeInTheDocument();
  });

  it('deve chamar onPolygonClick quando o botão de polígono for clicado', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const polygonButton = screen.getByLabelText('Desenhar Polígono');
    fireEvent.click(polygonButton);
    
    expect(mockProps.onPolygonClick).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onLineClick quando o botão de linha for clicado', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const lineButton = screen.getByLabelText('Desenhar Linha');
    fireEvent.click(lineButton);
    
    expect(mockProps.onLineClick).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onPointClick quando o botão de ponto for clicado', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const pointButton = screen.getByLabelText('Adicionar Ponto');
    fireEvent.click(pointButton);
    
    expect(mockProps.onPointClick).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onEditClick quando o botão de edição for clicado', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const editButton = screen.getByLabelText('Editar Geometria');
    fireEvent.click(editButton);
    
    expect(mockProps.onEditClick).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onDeleteClick quando o botão de deletar for clicado', () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const deleteButton = screen.getByLabelText('Excluir Seleção');
    fireEvent.click(deleteButton);
    
    expect(mockProps.onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar o botão de deletar quando não há features selecionadas', () => {
    mockUseEditingStore.mockReturnValue({
      selectedTool: null,
      hasSelectedFeatures: false,
      setSelectedTool: jest.fn(),
      clearSelection: jest.fn(),
    } as any);

    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const deleteButton = screen.getByLabelText('Excluir Seleção');
    expect(deleteButton).toBeDisabled();
  });

  it('deve habilitar o botão de deletar quando há features selecionadas', () => {
    mockUseEditingStore.mockReturnValue({
      selectedTool: null,
      hasSelectedFeatures: true,
      setSelectedTool: jest.fn(),
      clearSelection: jest.fn(),
    } as any);

    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const deleteButton = screen.getByLabelText('Excluir Seleção');
    expect(deleteButton).not.toBeDisabled();
  });

  it('deve aplicar estilo ativo ao botão da ferramenta selecionada', () => {
    mockUseEditingStore.mockReturnValue({
      selectedTool: 'draw_polygon',
      hasSelectedFeatures: false,
      setSelectedTool: jest.fn(),
      clearSelection: jest.fn(),
    } as any);

    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const polygonButton = screen.getByLabelText('Desenhar Polígono');
    expect(polygonButton).toHaveAttribute('data-active', 'true');
  });

  it('deve mostrar tooltips ao fazer hover nos botões', async () => {
    render(
      <TestWrapper>
        <DrawingToolbar {...mockProps} />
      </TestWrapper>
    );

    const polygonButton = screen.getByLabelText('Desenhar Polígono');
    fireEvent.mouseEnter(polygonButton);
    
    await waitFor(() => {
      expect(screen.getByText('Desenhar Polígono')).toBeInTheDocument();
    });
  });
});