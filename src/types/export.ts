export type ExportMode = 'static' | 'networked' | 'compressed';

export interface ExportConfig {
  mode: ExportMode;
  refreshInterval?: number;
  projectId: string;
  projectName: string;
}

export interface ExportResult {
  data: string | ArrayBuffer;
  filename: string;
  contentType: string;
  url?: string;
}

export interface ExportHistoryItem {
  id: string;
  filename: string;
  mode: ExportMode;
  exportedAt: Date;
  fileSize: number;
  downloadUrl?: string;
}

export interface NetworkLinkConfig {
  refreshMode: 'onInterval' | 'onExpire' | 'onChange';
  refreshInterval: number; // em segundos
  viewRefreshMode?: 'never' | 'onStop' | 'onRequest';
}

export const REFRESH_INTERVALS = [
  { value: 60, label: '1 minuto' },
  { value: 300, label: '5 minutos' },
  { value: 600, label: '10 minutos' },
  { value: 1800, label: '30 minutos' },
  { value: 3600, label: '1 hora' },
  { value: 21600, label: '6 horas' },
  { value: 86400, label: '24 horas' },
] as const;