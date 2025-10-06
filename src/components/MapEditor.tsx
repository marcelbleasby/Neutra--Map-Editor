import React, { useRef, useState } from 'react';
import { Map } from 'mapbox-gl';
import { useEditingStore } from '../store/editingStore';
import { useSaveStore } from '../store/saveStore';
import { useMapboxDraw } from '../hooks/useMapboxDraw';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAutoSave } from '../hooks/useAutoSave';
import { useLayerLoading } from '../hooks/useLayerLoading';
import { DrawingToolbar } from './DrawingToolbar/DrawingToolbar';
import { SaveDialog } from './SaveDialog/SaveDialog';
import { MapComponent } from './Map';
import { LoadingIndicator } from './LayerLoading/LoadingIndicator';
import { MemoryUsagePanel } from './LayerLoading/MemoryUsagePanel';
import { LayerStatus } from '../types/layerLoading';

export const MapEditor: React.FC = () => {
  const mapRef = useRef<Map | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  const {
    mode,
    setMode,
    selectedFeatures,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useEditingStore();

  const { hasUnsavedChanges } = useSaveStore();

  const {
    stats,
    preloadForViewport
  } = useLayerLoading();

  // Configurar hooks
  const { 
    getAllFeatures, 
    isReady 
  } = useMapboxDraw(mapRef.current);
  
  useKeyboardShortcuts();
  
  // Obter features atuais para auto-save
  const currentFeatures = getAllFeatures();
  
  useAutoSave({
    features: currentFeatures,
    isEnabled: true,
    interval: 300000, // 5 minutos
  });

  // Manipuladores de eventos
  const handleModeChange = (newMode: string) => {
    setMode(newMode as any);
  };

  const handleSave = () => {
    if (!isReady) {
      console.warn('Mapbox Draw não está pronto ainda');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  // Manipulador para quando o mapa for carregado
  const handleMapLoad = (map: Map) => {
    mapRef.current = map;
    console.log('Mapa carregado e referência salva');
    
    // Precarregar camadas visíveis no viewport inicial
    const bounds = map.getBounds();
    if (bounds) {
      const viewport = {
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
      };
      preloadForViewport(viewport);
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100vh',
  };

  const statusBarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 999,
    fontSize: '12px',
    display: 'flex',
    gap: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  };

  const statusItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <div style={containerStyle}>
      {/* Mapa principal */}
      <MapComponent onMapLoad={handleMapLoad} />

      {/* Indicador de carregamento de camadas */}
      {stats.loadingLayers > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
        }}>
          <LoadingIndicator 
            layerId="global" 
            status={stats.loadingLayers > 0 ? LayerStatus.LOADING : LayerStatus.LOADED} 
          />
        </div>
      )}

      {/* Painel de uso de memória */}
      {showMemoryPanel && (
        <div style={{
          position: 'absolute',
          top: '80px', // Movido para baixo para não sobrepor a barra de status
          left: '20px',
          zIndex: 1000,
          width: '300px',
        }}>
          <MemoryUsagePanel 
            isOpen={showMemoryPanel}
            onClose={() => setShowMemoryPanel(false)} 
          />
        </div>
      )}

      {/* Barra de ferramentas de desenho */}
      <DrawingToolbar
        mode={mode}
        onModeChange={handleModeChange}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
      />

      {/* Dialog de salvamento */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        features={currentFeatures}
      />

      {/* Barra de status */}
      <div style={statusBarStyle}>
        <div style={statusItemStyle}>
          <span>Modo: {mode}</span>
        </div>
        
        <div style={statusItemStyle}>
          <span>Elementos: {currentFeatures.length}</span>
        </div>
        
        <div style={statusItemStyle}>
          <span>Selecionados: {selectedFeatures.length}</span>
        </div>

        {/* Informações de memória */}
        <div 
          style={{ 
            ...statusItemStyle, 
            color: stats.isMemoryWarning ? '#f59e0b' : stats.isMemoryCritical ? '#ef4444' : 'inherit',
            cursor: 'pointer'
          }}
          onClick={() => setShowMemoryPanel(!showMemoryPanel)}
          title="Clique para ver detalhes do uso de memória"
        >
          <span>
            Memória: {Math.round(stats.memoryPercentage)}% 
            ({stats.cachedLayersCount} camadas)
          </span>
        </div>
        
        {hasUnsavedChanges && (
          <div style={{ ...statusItemStyle, color: '#f59e0b' }}>
            <span>● Alterações não salvas</span>
          </div>
        )}

        {stats.loadingLayers > 0 && (
          <div style={{ ...statusItemStyle, color: '#3b82f6' }}>
            <span>↻ Carregando {stats.loadingLayers} camada(s)</span>
          </div>
        )}
      </div>
    </div>
  );
};