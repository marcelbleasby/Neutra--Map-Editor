import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Tipos para salvamento
export interface SaveOptions {
  format: 'kml' | 'kmz' | 'geojson';
  includeStyles: boolean;
  fileName: string;
  compression: 'none' | 'fast' | 'best';
  preserveMetadata: boolean;
}

export interface SaveState {
  // Estado do salvamento
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  lastAutoSave: Date | null;
  savingInProgress: boolean;
  
  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // em milissegundos
  
  // Configurações de exportação
  defaultSaveOptions: SaveOptions;
  
  // Cache de dados para recuperação
  localCache: {
    features: GeoJSON.Feature[];
    timestamp: number;
  } | null;
  
  // Sessão anterior
  hasRecoverableSession: boolean;
  recoveryData: any | null;
}

export interface SaveActions {
  // Controle de estado
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  setLastAutoSave: (date: Date | null) => void;
  setSavingInProgress: (inProgress: boolean) => void;
  
  // Auto-save
  toggleAutoSave: () => void;
  setAutoSaveInterval: (interval: number) => void;
  
  // Configurações
  updateSaveOptions: (options: Partial<SaveOptions>) => void;
  
  // Cache local
  saveToLocalCache: (features: GeoJSON.Feature[]) => void;
  loadFromLocalCache: () => GeoJSON.Feature[] | null;
  clearLocalCache: () => void;
  
  // Recuperação de sessão
  saveRecoveryData: (data: any) => void;
  loadRecoveryData: () => any | null;
  clearRecoveryData: () => void;
  setHasRecoverableSession: (hasSession: boolean) => void;
  
  // Utilitários
  markAsSaved: () => void;
  reset: () => void;
}

const defaultSaveOptions: SaveOptions = {
  format: 'kml',
  includeStyles: true,
  fileName: `mapa_${new Date().toISOString().split('T')[0]}`,
  compression: 'fast',
  preserveMetadata: true,
};

const initialState: SaveState = {
  hasUnsavedChanges: false,
  lastSaved: null,
  lastAutoSave: null,
  savingInProgress: false,
  
  autoSaveEnabled: true,
  autoSaveInterval: 300000, // 5 minutos
  
  defaultSaveOptions,
  
  localCache: null,
  
  hasRecoverableSession: false,
  recoveryData: null,
};

// Chaves para localStorage
const STORAGE_KEYS = {
  CACHE: 'agent_map_cache',
  RECOVERY: 'agent_recovery_data',
  OPTIONS: 'agent_save_options',
};

export const useSaveStore = create<SaveState & SaveActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Controle de estado
      setHasUnsavedChanges: (hasChanges) =>
        set({ hasUnsavedChanges: hasChanges }, false, 'save/setHasUnsavedChanges'),

      setLastSaved: (date) =>
        set({ lastSaved: date }, false, 'save/setLastSaved'),

      setLastAutoSave: (date) =>
        set({ lastAutoSave: date }, false, 'save/setLastAutoSave'),

      setSavingInProgress: (inProgress) =>
        set({ savingInProgress: inProgress }, false, 'save/setSavingInProgress'),

      // Auto-save
      toggleAutoSave: () =>
        set((state) => ({
          autoSaveEnabled: !state.autoSaveEnabled,
        }), false, 'save/toggleAutoSave'),

      setAutoSaveInterval: (interval) =>
        set({ autoSaveInterval: interval }, false, 'save/setAutoSaveInterval'),

      // Configurações
      updateSaveOptions: (options) => {
        const state = get();
        const newOptions = { ...state.defaultSaveOptions, ...options };
        
        // Salvar no localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(newOptions));
        } catch (error) {
          console.warn('Não foi possível salvar opções no localStorage:', error);
        }
        
        set({
          defaultSaveOptions: newOptions,
        }, false, 'save/updateSaveOptions');
      },

      // Cache local
      saveToLocalCache: (features) => {
        const cacheData = {
          features,
          timestamp: Date.now(),
        };

        try {
          localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cacheData));
          set({
            localCache: cacheData,
          }, false, 'save/saveToLocalCache');
        } catch (error) {
          console.error('Erro ao salvar cache local:', error);
        }
      },

      loadFromLocalCache: () => {
        try {
          const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
          if (cached) {
            const cacheData = JSON.parse(cached);
            set({ localCache: cacheData }, false, 'save/loadFromLocalCache');
            return cacheData.features;
          }
        } catch (error) {
          console.error('Erro ao carregar cache local:', error);
        }
        return null;
      },

      clearLocalCache: () => {
        try {
          localStorage.removeItem(STORAGE_KEYS.CACHE);
          set({ localCache: null }, false, 'save/clearLocalCache');
        } catch (error) {
          console.error('Erro ao limpar cache local:', error);
        }
      },

      // Recuperação de sessão
      saveRecoveryData: (data) => {
        try {
          localStorage.setItem(STORAGE_KEYS.RECOVERY, JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
          set({
            recoveryData: data,
            hasRecoverableSession: true,
          }, false, 'save/saveRecoveryData');
        } catch (error) {
          console.error('Erro ao salvar dados de recuperação:', error);
        }
      },

      loadRecoveryData: () => {
        try {
          const recovery = localStorage.getItem(STORAGE_KEYS.RECOVERY);
          if (recovery) {
            const recoveryData = JSON.parse(recovery);
            const isRecent = Date.now() - recoveryData.timestamp < 24 * 60 * 60 * 1000; // 24 horas
            
            if (isRecent) {
              set({
                recoveryData: recoveryData.data,
                hasRecoverableSession: true,
              }, false, 'save/loadRecoveryData');
              return recoveryData.data;
            } else {
              // Remove dados antigos
              localStorage.removeItem(STORAGE_KEYS.RECOVERY);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar dados de recuperação:', error);
        }
        return null;
      },

      clearRecoveryData: () => {
        try {
          localStorage.removeItem(STORAGE_KEYS.RECOVERY);
          set({
            recoveryData: null,
            hasRecoverableSession: false,
          }, false, 'save/clearRecoveryData');
        } catch (error) {
          console.error('Erro ao limpar dados de recuperação:', error);
        }
      },

      setHasRecoverableSession: (hasSession) =>
        set({ hasRecoverableSession: hasSession }, false, 'save/setHasRecoverableSession'),

      // Utilitários
      markAsSaved: () => {
        const now = new Date();
        set({
          hasUnsavedChanges: false,
          lastSaved: now,
        }, false, 'save/markAsSaved');
      },

      reset: () =>
        set({
          ...initialState,
        }, false, 'save/reset'),
    }),
    { name: 'save-store' }
  )
);

// Hook para carregar configurações salvas na inicialização
export const loadSavedOptions = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.OPTIONS);
    if (saved) {
      const options = JSON.parse(saved);
      useSaveStore.getState().updateSaveOptions(options);
    }
  } catch (error) {
    console.warn('Erro ao carregar opções salvas:', error);
  }
};