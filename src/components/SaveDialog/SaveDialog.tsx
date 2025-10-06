import React, { useState } from 'react';
import { useSaveStore } from '../../store/saveStore';
import { exportToKML, exportToKMZ, exportToGeoJSON } from '../../utils/exportUtils';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  features: GeoJSON.Feature[];
}

export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  features,
}) => {
  const { defaultSaveOptions, updateSaveOptions, setSavingInProgress } = useSaveStore();
  
  const [fileName, setFileName] = useState('mapa');
  const [format, setFormat] = useState<'kml' | 'kmz' | 'geojson'>(defaultSaveOptions.format);
  const [includeStyles, setIncludeStyles] = useState(defaultSaveOptions.includeStyles);
  const [preserveMetadata, setPreserveMetadata] = useState(defaultSaveOptions.preserveMetadata);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setSavingInProgress(true);

      const options = {
        format,
        includeStyles,
        fileName,
        compression: 'fast' as const,
        preserveMetadata,
      };

      // Atualizar opções padrão
      updateSaveOptions(options);

      // Exportar de acordo com o formato
      switch (format) {
        case 'kml':
          await exportToKML(features, options);
          break;
        case 'kmz':
          await exportToKMZ(features, options);
          break;
        case 'geojson':
          await exportToGeoJSON(features, options);
          break;
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar o arquivo: ' + (error as Error).message);
    } finally {
      setSavingInProgress(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  };

  const checkboxStyle: React.CSSProperties = {
    marginRight: '8px',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007acc',
    color: 'white',
    borderColor: '#007acc',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>💾 Salvar Mapa</h3>
          <button style={closeButtonStyle} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Nome do arquivo:</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            style={inputStyle}
            placeholder="Digite o nome do arquivo"
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Formato:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'kml' | 'kmz' | 'geojson')}
            style={inputStyle}
          >
            <option value="kml">KML - Google Earth</option>
            <option value="kmz">KMZ - Google Earth Comprimido</option>
            <option value="geojson">GeoJSON - Formato Web</option>
          </select>
        </div>

        <div style={formGroupStyle}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={includeStyles}
              onChange={(e) => setIncludeStyles(e.target.checked)}
              style={checkboxStyle}
            />
            Incluir estilos visuais
          </label>
        </div>

        <div style={formGroupStyle}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={preserveMetadata}
              onChange={(e) => setPreserveMetadata(e.target.checked)}
              style={checkboxStyle}
            />
            Preservar metadados
          </label>
        </div>

        <div style={buttonGroupStyle}>
          <button style={buttonStyle} onClick={onClose}>
            Cancelar
          </button>
          <button 
            style={primaryButtonStyle} 
            onClick={handleSave}
            disabled={!fileName.trim() || features.length === 0}
          >
            Salvar ({features.length} elemento{features.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
};