import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_CONFIG } from '../../config/mapbox';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
  height?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({ height = '100%', onMapLoad }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Log environment variables for debugging
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      MAPBOX_TOKEN_EXISTS: !!process.env.REACT_APP_MAPBOX_TOKEN,
      TOKEN_LENGTH: process.env.REACT_APP_MAPBOX_TOKEN?.length || 0,
      CONFIG_TOKEN: MAPBOX_CONFIG.accessToken,
    });

    // Check if Mapbox token is provided
    if (!MAPBOX_CONFIG.accessToken || MAPBOX_CONFIG.accessToken.trim() === '') {
      const errorMsg = `Mapbox access token is required. 
        Current token: "${MAPBOX_CONFIG.accessToken}"
        Please add REACT_APP_MAPBOX_TOKEN to your .env file.
        Expected format: REACT_APP_MAPBOX_TOKEN=pk.eyJ1...`;
      
      console.error(errorMsg);
      setMapError(errorMsg);
      return;
    }

    // Initialize map
    try {
      mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_CONFIG.style,
        center: MAPBOX_CONFIG.center as [number, number],
        zoom: MAPBOX_CONFIG.zoom,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Call onMapLoad callback when map is loaded
      map.current.on('load', () => {
        if (map.current && onMapLoad) {
          onMapLoad(map.current);
        }
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Erro ao carregar o mapa. Verifique sua conexão e token do Mapbox.');
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Erro ao inicializar o mapa.');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onMapLoad]);

  if (mapError) {
    return (
      <Box h={height} p={4}>
        <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} color="red.600">
          <strong>Erro no Mapa:</strong> {mapError}
        </Box>
      </Box>
    );
  }

  return <Box ref={mapContainer} h={height} w="100%" position="relative" bg="gray.100" />;
};
