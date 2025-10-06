declare module 'tokml' {
  interface KMLOptions {
    documentName?: string;
    documentDescription?: string;
    simplestyle?: boolean;
  }

  export function tokml(
    geojson: GeoJSON.FeatureCollection | GeoJSON.Feature, 
    options?: KMLOptions
  ): string;
}