import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Tipos para operações de edição
export interface EditOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  featureId: string;
  before?: GeoJSON.Feature;
  after?: GeoJSON.Feature;
  timestamp: number;
  layerId?: string;
}

export interface EditingState {
  // Estado atual da edição
  mode: 'select' | 'point' | 'line_string' | 'polygon' | 'edit' | 'delete';
  selectedFeatures: string[];
  isEditing: boolean;
  snapEnabled: boolean;
  snapTolerance: number;
  
  // Histórico de operações
  history: EditOperation[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Features modificadas (não salvas)
  modifiedFeatures: Map<string, GeoJSON.Feature>;
  hasUnsavedChanges: boolean;
  
  // Auto-save
  lastAutoSave: Date | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
}

export interface EditingActions {
  // Controle de modo
  setMode: (mode: EditingState['mode']) => void;
  setIsEditing: (isEditing: boolean) => void;
  
  // Seleção
  setSelectedFeatures: (features: string[]) => void;
  addSelectedFeature: (featureId: string) => void;
  removeSelectedFeature: (featureId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Snap
  toggleSnap: () => void;
  setSnapTolerance: (tolerance: number) => void;
  
  // Histórico
  addOperation: (operation: Omit<EditOperation, 'id' | 'timestamp'>) => void;
  undo: () => EditOperation | null;
  redo: () => EditOperation | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Features modificadas
  addModifiedFeature: (feature: GeoJSON.Feature) => void;
  removeModifiedFeature: (featureId: string) => void;
  getModifiedFeature: (featureId: string) => GeoJSON.Feature | undefined;
  clearModifiedFeatures: () => void;
  
  // Auto-save
  setLastAutoSave: (date: Date) => void;
  toggleAutoSave: () => void;
  setAutoSaveInterval: (interval: number) => void;
  
  // Reset
  reset: () => void;
}

const initialState: EditingState = {
  mode: 'select',
  selectedFeatures: [],
  isEditing: false,
  snapEnabled: true,
  snapTolerance: 0.0001,
  
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  
  modifiedFeatures: new Map(),
  hasUnsavedChanges: false,
  
  lastAutoSave: null,
  autoSaveEnabled: true,
  autoSaveInterval: 300000, // 5 minutos
};

export const useEditingStore = create<EditingState & EditingActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Controle de modo
      setMode: (mode) => 
        set({ mode }, false, 'editing/setMode'),
      
      setIsEditing: (isEditing) => 
        set({ isEditing }, false, 'editing/setIsEditing'),

      // Seleção
      setSelectedFeatures: (features) => 
        set({ selectedFeatures: features }, false, 'editing/setSelectedFeatures'),
      
      addSelectedFeature: (featureId) =>
        set((state) => ({
          selectedFeatures: [...state.selectedFeatures, featureId],
        }), false, 'editing/addSelectedFeature'),
      
      removeSelectedFeature: (featureId) =>
        set((state) => ({
          selectedFeatures: state.selectedFeatures.filter(id => id !== featureId),
        }), false, 'editing/removeSelectedFeature'),
      
      clearSelection: () => 
        set({ selectedFeatures: [] }, false, 'editing/clearSelection'),
      
      selectAll: () => {
        // Esta função será implementada quando tivermos acesso às features
        // Por ora, apenas limpa a seleção
        set({ selectedFeatures: [] }, false, 'editing/selectAll');
      },

      // Snap
      toggleSnap: () =>
        set((state) => ({ 
          snapEnabled: !state.snapEnabled 
        }), false, 'editing/toggleSnap'),
      
      setSnapTolerance: (tolerance) =>
        set({ snapTolerance: tolerance }, false, 'editing/setSnapTolerance'),

      // Histórico
      addOperation: (operation) => {
        const state = get();
        const newOperation: EditOperation = {
          ...operation,
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        // Remove operações futuras se estamos no meio do histórico
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newOperation);

        // Limita o tamanho do histórico
        if (newHistory.length > state.maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          hasUnsavedChanges: true,
        }, false, 'editing/addOperation');
      },

      undo: () => {
        const state = get();
        if (!state.canUndo()) return null;

        const operation = state.history[state.historyIndex];
        set({
          historyIndex: state.historyIndex - 1,
        }, false, 'editing/undo');

        return operation;
      },

      redo: () => {
        const state = get();
        if (!state.canRedo()) return null;

        const operation = state.history[state.historyIndex + 1];
        set({
          historyIndex: state.historyIndex + 1,
        }, false, 'editing/redo');

        return operation;
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex >= 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      clearHistory: () =>
        set({
          history: [],
          historyIndex: -1,
          hasUnsavedChanges: false,
        }, false, 'editing/clearHistory'),

      // Features modificadas
      addModifiedFeature: (feature) => {
        const state = get();
        const newModifiedFeatures = new Map(state.modifiedFeatures);
        newModifiedFeatures.set(feature.id as string, feature);
        
        set({
          modifiedFeatures: newModifiedFeatures,
          hasUnsavedChanges: true,
        }, false, 'editing/addModifiedFeature');
      },

      removeModifiedFeature: (featureId) => {
        const state = get();
        const newModifiedFeatures = new Map(state.modifiedFeatures);
        newModifiedFeatures.delete(featureId);
        
        set({
          modifiedFeatures: newModifiedFeatures,
          hasUnsavedChanges: newModifiedFeatures.size > 0,
        }, false, 'editing/removeModifiedFeature');
      },

      getModifiedFeature: (featureId) => {
        const state = get();
        return state.modifiedFeatures.get(featureId);
      },

      clearModifiedFeatures: () =>
        set({
          modifiedFeatures: new Map(),
          hasUnsavedChanges: false,
        }, false, 'editing/clearModifiedFeatures'),

      // Auto-save
      setLastAutoSave: (date) =>
        set({ lastAutoSave: date }, false, 'editing/setLastAutoSave'),

      toggleAutoSave: () =>
        set((state) => ({
          autoSaveEnabled: !state.autoSaveEnabled,
        }), false, 'editing/toggleAutoSave'),

      setAutoSaveInterval: (interval) =>
        set({ autoSaveInterval: interval }, false, 'editing/setAutoSaveInterval'),

      // Reset
      reset: () =>
        set({
          ...initialState,
          modifiedFeatures: new Map(),
        }, false, 'editing/reset'),
    }),
    { name: 'editing-store' }
  )
);