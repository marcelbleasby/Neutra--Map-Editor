import { useEffect, useCallback, useRef } from 'react';
import { useSaveStore } from '../store/saveStore';
import { useEditingStore } from '../store/editingStore';

interface UseAutoSaveOptions {
  features: GeoJSON.Feature[];
  isEnabled?: boolean;
  interval?: number; // em milissegundos
  onAutoSave?: (success: boolean, error?: string) => void;
}

interface AutoSaveData {
  features: GeoJSON.Feature[];
  timestamp: number;
  version: string;
  sessionId: string;
}

export const useAutoSave = ({
  features,
  isEnabled = true,
  interval = 300000, // 5 minutos por padrão
  onAutoSave
}: UseAutoSaveOptions) => {
  const {
    autoSaveEnabled,
    lastAutoSave,
    setLastAutoSave,
    savingInProgress,
    saveRecoveryData,
    loadRecoveryData,
    clearRecoveryData
  } = useSaveStore();
  
  const {
    hasUnsavedChanges,
    autoSaveInterval
  } = useEditingStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Salvar dados no IndexedDB
  const saveToIndexedDB = useCallback(async (data: AutoSaveData): Promise<boolean> => {
    try {
      const db = await openAutoSaveDB();
      const transaction = db.transaction(['autosave'], 'readwrite');
      const store = transaction.objectStore('autosave');
      
      return new Promise((resolve) => {
        const request = store.put(data, 'current');
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Erro ao salvar auto-save:', error);
      return false;
    }
  }, []);

  // Carregar dados do IndexedDB
  const loadFromIndexedDB = useCallback(async (): Promise<AutoSaveData | null> => {
    try {
      const db = await openAutoSaveDB();
      const transaction = db.transaction(['autosave'], 'readonly');
      const store = transaction.objectStore('autosave');
      
      return new Promise((resolve) => {
        const request = store.get('current');
        request.onsuccess = () => {
          const result = request.result as AutoSaveData | undefined;
          resolve(result || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Erro ao carregar auto-save:', error);
      return null;
    }
  }, []);

  // Abrir/criar banco IndexedDB
  const openAutoSaveDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MapEditorAutoSave', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('autosave')) {
          db.createObjectStore('autosave');
        }
      };
    });
  };

  // Executar auto-save
  const performAutoSave = useCallback(async () => {
    if (!isEnabled || !autoSaveEnabled || savingInProgress || !hasUnsavedChanges) {
      return;
    }

    if (features.length === 0) {
      return;
    }

    try {
      const autoSaveData: AutoSaveData = {
        features: [...features],
        timestamp: Date.now(),
        version: '1.0.0',
        sessionId: sessionIdRef.current
      };

      // Salvar no IndexedDB
      const indexedDBSuccess = await saveToIndexedDB(autoSaveData);
      
      // Salvar também no recovery data do store
      saveRecoveryData(autoSaveData);
      
      if (indexedDBSuccess) {
        const now = new Date();
        setLastAutoSave(now);
        
        console.log(`Auto-save realizado: ${features.length} features salvas às ${now.toLocaleTimeString()}`);
        onAutoSave?.(true);
      } else {
        onAutoSave?.(false, 'Erro ao salvar no IndexedDB');
      }
    } catch (error) {
      console.error('Erro durante auto-save:', error);
      onAutoSave?.(false, error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, [
    isEnabled,
    autoSaveEnabled,
    savingInProgress,
    hasUnsavedChanges,
    features,
    saveToIndexedDB,
    saveRecoveryData,
    setLastAutoSave,
    onAutoSave
  ]);

  // Recuperar dados de auto-save
  const recoverAutoSave = useCallback(async (): Promise<AutoSaveData | null> => {
    try {
      // Primeiro tentar IndexedDB
      let data = await loadFromIndexedDB();
      
      // Se não encontrar, tentar recovery data do store
      if (!data) {
        const recoveryData = loadRecoveryData();
        if (recoveryData && recoveryData.features) {
          data = recoveryData as AutoSaveData;
        }
      }
      
      if (data && data.features.length > 0) {
        // Verificar se os dados não são muito antigos (24 horas)
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        const age = Date.now() - data.timestamp;
        
        if (age > maxAge) {
          console.log('Dados de auto-save muito antigos, ignorando');
          // Limpar dados antigos
          try {
            const db = await openAutoSaveDB();
            const transaction = db.transaction(['autosave'], 'readwrite');
            const store = transaction.objectStore('autosave');
            store.delete('current');
            clearRecoveryData();
          } catch (error) {
            console.error('Erro ao limpar dados antigos:', error);
          }
          return null;
        }
        
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao recuperar auto-save:', error);
      return null;
    }
  }, [loadFromIndexedDB, loadRecoveryData, clearRecoveryData]);

  // Limpar dados de auto-save
  const clearAutoSave = useCallback(async (): Promise<boolean> => {
    try {
      // Limpar IndexedDB
      const db = await openAutoSaveDB();
      const transaction = db.transaction(['autosave'], 'readwrite');
      const store = transaction.objectStore('autosave');
      
      const indexedDBSuccess = await new Promise<boolean>((resolve) => {
        const request = store.delete('current');
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
      
      // Limpar recovery data
      clearRecoveryData();
      
      return indexedDBSuccess;
    } catch (error) {
      console.error('Erro ao limpar auto-save:', error);
      return false;
    }
  }, [clearRecoveryData]);

  // Configurar intervalo de auto-save
  useEffect(() => {
    if (!isEnabled || !autoSaveEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const effectiveInterval = interval || autoSaveInterval;
    
    intervalRef.current = setInterval(performAutoSave, effectiveInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, autoSaveEnabled, interval, autoSaveInterval, performAutoSave]);

  // Auto-save imediato quando há mudanças importantes
  useEffect(() => {
    if (!isEnabled || !autoSaveEnabled || !hasUnsavedChanges) {
      return;
    }

    // Delay para evitar muitos auto-saves
    const delayedAutoSave = setTimeout(performAutoSave, 5000);
    
    return () => clearTimeout(delayedAutoSave);
  }, [hasUnsavedChanges, isEnabled, autoSaveEnabled, performAutoSave]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calcular próximo auto-save
  const getNextAutoSaveTime = useCallback((): Date | null => {
    if (!isEnabled || !autoSaveEnabled || !lastAutoSave) {
      return null;
    }
    
    const effectiveInterval = interval || autoSaveInterval;
    return new Date(lastAutoSave.getTime() + effectiveInterval);
  }, [isEnabled, autoSaveEnabled, lastAutoSave, interval, autoSaveInterval]);

  // Tempo até próximo auto-save
  const getTimeUntilNextAutoSave = useCallback((): number => {
    const nextTime = getNextAutoSaveTime();
    if (!nextTime) return 0;
    
    return Math.max(0, nextTime.getTime() - Date.now());
  }, [getNextAutoSaveTime]);

  // Status do auto-save
  const getAutoSaveStatus = useCallback(() => {
    return {
      enabled: isEnabled && autoSaveEnabled,
      lastSave: lastAutoSave,
      nextSave: getNextAutoSaveTime(),
      timeUntilNext: getTimeUntilNextAutoSave(),
      hasUnsavedChanges,
      sessionId: sessionIdRef.current
    };
  }, [
    isEnabled,
    autoSaveEnabled,
    lastAutoSave,
    getNextAutoSaveTime,
    getTimeUntilNextAutoSave,
    hasUnsavedChanges
  ]);

  return {
    performAutoSave,
    recoverAutoSave,
    clearAutoSave,
    getAutoSaveStatus,
    isAutoSaveEnabled: isEnabled && autoSaveEnabled
  };
};