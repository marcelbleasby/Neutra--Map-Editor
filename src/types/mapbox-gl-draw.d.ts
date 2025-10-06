declare module '@mapbox/mapbox-gl-draw' {
  import { IControl, Map } from 'mapbox-gl';

  interface DrawOptions {
    displayControlsDefault?: boolean;
    keybindings?: boolean;
    touchEnabled?: boolean;
    boxSelect?: boolean;
    clickBuffer?: number;
    touchBuffer?: number;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    styles?: any[];
    modes?: any;
    defaultMode?: string;
    userProperties?: boolean;
  }

  export default class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition(): string;

    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    get(featureId: string): GeoJSON.Feature;
    getFeatureIdsAt(point: { x: number; y: number }): string[];
    getSelectedIds(): string[];
    getSelected(): GeoJSON.FeatureCollection;
    getAll(): GeoJSON.FeatureCollection;
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
    getMode(): string;
    changeMode(mode: string, modeOptions?: any): this;
    setFeatureProperty(featureId: string, property: string, value: any): this;
  }

  export const modes: any;
}