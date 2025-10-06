import axios from 'axios';
import JSZip from 'jszip';
import { tokml } from 'tokml';
import { saveAs } from 'file-saver';
import { ExportConfig, ExportResult, NetworkLinkConfig } from '../types/export';

class ExportService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'https://hom-api.neutramais.com';
  }

  async exportProject(config: ExportConfig): Promise<ExportResult> {
    const { mode, refreshInterval, projectId, projectName } = config;
    
    try {
      // Buscar dados do projeto da API
      const projectData = await this.fetchProjectData(projectId);

      switch (mode) {
        case 'static':
          return this.exportStaticKML(projectData, projectName);
        
        case 'networked':
          return this.exportNetworkedKML(projectData, projectName, refreshInterval!);
        
        case 'compressed':
          return this.exportCompressedKMZ(projectData, projectName);
        
        default:
          throw new Error('Modo de exportação inválido');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw new Error('Falha na exportação do projeto');
    }
  }

  private async fetchProjectData(projectId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/projects/${projectId}/`);
      return response.data;
    } catch (error) {
      // Se não houver API, usar dados de exemplo
      console.warn('API não disponível, usando dados de exemplo');
      return this.getMockProjectData(projectId);
    }
  }

  private getMockProjectData(projectId: string): any {
    return {
      id: projectId,
      name: 'Projeto Exemplo',
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Poste 1',
              type: 'poste',
              description: 'Poste de fibra óptica'
            },
            geometry: {
              type: 'Point',
              coordinates: [-46.6333, -23.5505]
            }
          }
        ]
      }
    };
  }

  private async exportStaticKML(projectData: any, projectName: string): Promise<ExportResult> {
    // Converter GeoJSON para KML usando tokml
    const kmlContent = this.generateKMLContent(projectData, projectName);
    
    return {
      data: kmlContent,
      filename: `${this.sanitizeFilename(projectName)}_static.kml`,
      contentType: 'application/vnd.google-earth.kml+xml',
    };
  }

  private async exportNetworkedKML(
    projectData: any, 
    projectName: string, 
    refreshInterval: number
  ): Promise<ExportResult> {
    const networkLinkConfig: NetworkLinkConfig = {
      refreshMode: 'onInterval',
      refreshInterval,
      viewRefreshMode: 'onRequest'
    };

    const networkLinkKML = this.generateNetworkLinkKML(
      projectData,
      projectName,
      networkLinkConfig
    );

    return {
      data: networkLinkKML,
      filename: `${this.sanitizeFilename(projectName)}_networked.kml`,
      contentType: 'application/vnd.google-earth.kml+xml',
      url: `${this.apiUrl}/api/projects/${projectData.id}/kml/live/`,
    };
  }

  private async exportCompressedKMZ(projectData: any, projectName: string): Promise<ExportResult> {
    const zip = new JSZip();
    
    // Criar KML principal
    const kmlContent = this.generateKMLContent(projectData, projectName);
    zip.file('doc.kml', kmlContent);
    
    // Adicionar recursos adicionais se necessário (ícones, imagens, etc.)
    // TODO: Implementar adição de recursos adicionais
    
    const kmzData = await zip.generateAsync({ type: 'arraybuffer' });
    
    return {
      data: kmzData,
      filename: `${this.sanitizeFilename(projectName)}_compressed.kmz`,
      contentType: 'application/vnd.google-earth.kmz',
    };
  }

  private generateKMLContent(projectData: any, projectName: string): string {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(projectName)}</name>
    <description>Exportado do Neutra+ Map Editor em ${new Date().toLocaleString('pt-BR')}</description>
    <open>1</open>`;

    const kmlFooter = `
  </Document>
</kml>`;

    // Converter GeoJSON para KML usando tokml
    let kmlBody = '';
    if (projectData.geojson && projectData.geojson.features) {
      try {
        kmlBody = tokml(projectData.geojson);
        // Remover tags kml wrapper do tokml e usar apenas o conteúdo interno
        kmlBody = kmlBody.replace(/<\?xml[^>]*>/, '')
                         .replace(/<kml[^>]*>/, '')
                         .replace(/<\/kml>/, '')
                         .replace(/<Document[^>]*>/, '')
                         .replace(/<\/Document>/, '');
      } catch (error) {
        console.error('Erro ao converter GeoJSON para KML:', error);
        kmlBody = '<Placemark><name>Erro na conversão</name><description>Não foi possível converter os dados</description></Placemark>';
      }
    }

    return kmlHeader + kmlBody + kmlFooter;
  }

  private generateNetworkLinkKML(
    projectData: any,
    projectName: string,
    config: NetworkLinkConfig
  ): string {
    const refreshIntervalMinutes = Math.floor(config.refreshInterval / 60);
    const timeUnit = refreshIntervalMinutes >= 60 ? 
      `${Math.floor(refreshIntervalMinutes / 60)} hora(s)` : 
      `${refreshIntervalMinutes} minuto(s)`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(projectName)} - Auto Update</name>
    <description>Dados atualizados automaticamente a cada ${timeUnit}.
Exportado do Neutra+ Map Editor em ${new Date().toLocaleString('pt-BR')}</description>
    <open>1</open>
    
    <NetworkLink>
      <name>Dados da Rede - ${this.escapeXml(projectName)}</name>
      <description>Camadas da rede com atualização automática</description>
      <open>1</open>
      <Link>
        <href>${this.apiUrl}/api/projects/${projectData.id}/kml/live/</href>
        <refreshMode>${config.refreshMode}</refreshMode>
        <refreshInterval>${config.refreshInterval}</refreshInterval>
        ${config.viewRefreshMode ? `<viewRefreshMode>${config.viewRefreshMode}</viewRefreshMode>` : ''}
      </Link>
    </NetworkLink>
  </Document>
</kml>`;
  }

  generateNetworkLinkPreview(
    projectId: string,
    projectName: string,
    refreshInterval: number
  ): string {
    const config: NetworkLinkConfig = {
      refreshMode: 'onInterval',
      refreshInterval,
    };

    return this.generateNetworkLinkKML(
      { id: projectId, name: projectName },
      projectName,
      config
    );
  }

  downloadFile(result: ExportResult): void {
    const blob = typeof result.data === 'string' 
      ? new Blob([result.data], { type: result.contentType })
      : new Blob([result.data], { type: result.contentType });
    saveAs(blob, result.filename);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const exportService = new ExportService();