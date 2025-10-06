import { apiClient } from '../config/api';
import { KMLFile, FileListResponse, FileSearchParams } from '../types/files';

export class FileService {
  private static readonly ENDPOINTS = {
    LIST: '/arquivos/',
    DETAIL: (id: string) => `/arquivos/${id}/`,
    CONTENT: (id: string) => `/arquivos/${id}/content/`,
  };

  static async listFiles(params: FileSearchParams = {}): Promise<FileListResponse> {
    const response = await apiClient.get(this.ENDPOINTS.LIST, { params });
    return response.data;
  }

  static async getFile(id: string): Promise<KMLFile> {
    const response = await apiClient.get(this.ENDPOINTS.DETAIL(id));
    return response.data;
  }

  static async getFileContent(id: string): Promise<string> {
    const response = await apiClient.get(this.ENDPOINTS.CONTENT(id), {
      headers: { Accept: 'application/xml, text/xml, */*' },
    });
    return response.data;
  }

  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  }
}