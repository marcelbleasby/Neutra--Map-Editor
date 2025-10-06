import { create } from 'zustand';
import { ExportHistoryItem } from '../types/export';

interface ExportState {
  isExporting: boolean;
  exportProgress: number;
  exportHistory: ExportHistoryItem[];
  currentExportId?: string;
}

interface ExportActions {
  setExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setCurrentExportId: (id?: string) => void;
  addToHistory: (item: Omit<ExportHistoryItem, 'id' | 'exportedAt'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getHistoryByMode: (mode: string) => ExportHistoryItem[];
}

export const useExportStore = create<ExportState & ExportActions>((set, get) => ({
  // Estado inicial
  isExporting: false,
  exportProgress: 0,
  exportHistory: [],
  currentExportId: undefined,

  // Actions
  setExporting: (isExporting) => set({ isExporting }),
  
  setExportProgress: (exportProgress) => set({ exportProgress }),
  
  setCurrentExportId: (currentExportId) => set({ currentExportId }),
  
  addToHistory: (item) => set((state) => ({
    exportHistory: [
      {
        ...item,
        id: crypto.randomUUID(),
        exportedAt: new Date(),
      },
      ...state.exportHistory.slice(0, 19), // Manter apenas os 20 mais recentes
    ],
  })),
  
  removeFromHistory: (id) => set((state) => ({
    exportHistory: state.exportHistory.filter(item => item.id !== id),
  })),
  
  clearHistory: () => set({ exportHistory: [] }),
  
  getHistoryByMode: (mode) => {
    const state = get();
    return state.exportHistory.filter(item => item.mode === mode);
  },
}));