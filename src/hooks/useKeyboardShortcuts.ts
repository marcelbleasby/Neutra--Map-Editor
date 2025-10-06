import { useEffect, useCallback } from 'react';
import { useEditingStore } from '../store/editingStore';
import mapboxgl from 'mapbox-gl';

interface UseKeyboardShortcutsOptions {
  map?: mapboxgl.Map | null;
  isEnabled?: boolean;
}

export const useKeyboardShortcuts = ({ map, isEnabled = true }: UseKeyboardShortcutsOptions = {}) => {
  const { 
    canUndo, 
    canRedo, 
    undo, 
    redo, 
    selectedFeatures,
    clearSelection,
    mode,
    setMode,
    snapEnabled,
    toggleSnap,
    snapTolerance,
    setSnapTolerance
  } = useEditingStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Verificar se está focado em input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const isCtrlOrCmd = ctrlKey || metaKey;

    // Atalhos principais
    switch (key) {
      // Undo/Redo
      case 'z':
      case 'Z':
        if (isCtrlOrCmd) {
          event.preventDefault();
          if (shiftKey || (key === 'Z' && !shiftKey)) {
            if (canRedo()) {
              redo();
            }
          } else {
            if (canUndo()) {
              undo();
            }
          }
        }
        break;

      case 'y':
      case 'Y':
        if (isCtrlOrCmd) {
          event.preventDefault();
          if (canRedo()) {
            redo();
          }
        }
        break;

      // Deletar features selecionadas
      case 'Delete':
      case 'Backspace':
        if (selectedFeatures.length > 0) {
          event.preventDefault();
          // Note: A lógica de deletar será implementada no componente que usa este hook
          // pois precisa acessar as features do Mapbox Draw
          const deleteEvent = new CustomEvent('deleteSelectedFeatures', {
            detail: { featureIds: selectedFeatures }
          });
          document.dispatchEvent(deleteEvent);
        }
        break;

      // Escape - cancelar seleção/modo
      case 'Escape':
        event.preventDefault();
        if (selectedFeatures.length > 0) {
          clearSelection();
        } else if (mode !== 'select') {
          setMode('select');
        }
        break;

      // Alternar snap
      case 's':
      case 'S':
        if (!isCtrlOrCmd && !shiftKey && !altKey) {
          event.preventDefault();
          toggleSnap();
        }
        break;

      // Modos de desenho
      case 'p':
      case 'P':
        if (!isCtrlOrCmd) {
          event.preventDefault();
          setMode(mode === 'point' ? 'select' : 'point');
        }
        break;

      case 'l':
      case 'L':
        if (!isCtrlOrCmd) {
          event.preventDefault();
          setMode(mode === 'line_string' ? 'select' : 'line_string');
        }
        break;

      case 'o':
      case 'O':
        if (!isCtrlOrCmd) {
          event.preventDefault();
          setMode(mode === 'polygon' ? 'select' : 'polygon');
        }
        break;

      // Modo de seleção
      case 'v':
      case 'V':
        if (!isCtrlOrCmd) {
          event.preventDefault();
          setMode('select');
        }
        break;

      // Ajustar tolerância do snap
      case '+':
      case '=':
        if (snapEnabled) {
          event.preventDefault();
          const newTolerance = Math.min(snapTolerance + 0.00005, 0.001);
          setSnapTolerance(newTolerance);
        }
        break;

      case '-':
      case '_':
        if (snapEnabled) {
          event.preventDefault();
          const newTolerance = Math.max(snapTolerance - 0.00005, 0.00001);
          setSnapTolerance(newTolerance);
        }
        break;

      // Pan do mapa
      case 'ArrowUp':
        if (map && altKey) {
          event.preventDefault();
          const center = map.getCenter();
          map.panTo([center.lng, center.lat + 0.01]);
        }
        break;

      case 'ArrowDown':
        if (map && altKey) {
          event.preventDefault();
          const center = map.getCenter();
          map.panTo([center.lng, center.lat - 0.01]);
        }
        break;

      case 'ArrowLeft':
        if (map && altKey) {
          event.preventDefault();
          const center = map.getCenter();
          map.panTo([center.lng - 0.01, center.lat]);
        }
        break;

      case 'ArrowRight':
        if (map && altKey) {
          event.preventDefault();
          const center = map.getCenter();
          map.panTo([center.lng + 0.01, center.lat]);
        }
        break;

      // Zoom
      case '0':
        if (isCtrlOrCmd && map) {
          event.preventDefault();
          map.fitBounds([[-180, -85], [180, 85]], { padding: 50 });
        }
        break;
    }
  }, [
    isEnabled,
    canUndo,
    canRedo,
    undo,
    redo,
    selectedFeatures,
    clearSelection,
    mode,
    setMode,
    snapEnabled,
    toggleSnap,
    snapTolerance,
    setSnapTolerance,
    map
  ]);

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isEnabled]);

  // Retornar informações sobre atalhos disponíveis
  const shortcuts = {
    editing: {
      'Ctrl+Z / Cmd+Z': 'Desfazer',
      'Ctrl+Y / Cmd+Y / Ctrl+Shift+Z': 'Refazer',
      'Delete / Backspace': 'Deletar elementos selecionados',
      'Escape': 'Cancelar seleção/modo',
    },
    drawing: {
      'P': 'Modo ponto',
      'L': 'Modo linha',
      'O': 'Modo polígono',
      'V': 'Modo seleção',
    },
    snap: {
      'S': 'Alternar snap',
      '+': 'Aumentar tolerância do snap',
      '-': 'Diminuir tolerância do snap',
    },
    navigation: {
      'Alt + Setas': 'Mover mapa',
      'Ctrl+0 / Cmd+0': 'Ajustar zoom ao mundo',
    }
  };

  return { shortcuts };
};