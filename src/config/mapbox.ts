// Mapbox configuration
export const MAPBOX_CONFIG = {
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFyY2VsYmxlYXNieSIsImEiOiJjbGZ4Yjh2cWMwMDk1M2xvOHBkanUydWNuIn0.YaIu30Sfy4cCjiwhP3oMCA',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-46.6333, -23.5505], // São Paulo coordinates as default
  zoom: 10,
};

// Map editor settings
export const MAP_EDITOR_CONFIG = {
  drawControls: {
    point: true,
    lineString: true,
    polygon: true,
    trash: true,
  },
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['kml', 'kmz', 'geojson'],
};
