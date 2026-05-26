import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';
import { Media } from '../models';

export class PDFService {
  static async deleteInspectionPDF(inspectionId: string) {
    try {
      const pdfFilename = `vistoria_${inspectionId}.pdf`;
      const existing: any = await Media.findOne({ filename: pdfFilename }).lean();
      if (existing) {
        await Media.deleteOne({ _id: existing._id });
        console.log(`Deleted cached PDF for inspection ${inspectionId}`);
      }
    } catch (err) {
      console.error('Error deleting cached PDF:', err);
    }
  }

  private static async resolveToBase64(photoUrl: string): Promise<string> {
    const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if (!photoUrl) return placeholder;

    const mediaMatch = photoUrl.match(/\/api\/media\/([a-zA-Z0-9_-]+)/);
    if (mediaMatch) {
      try {
        const media: any = await Media.findById(mediaMatch[1]).lean();
        if (media) {
          const base64 = Buffer.from(media.data).toString('base64');
          return `data:${media.mimeType};base64,${base64}`;
        }
      } catch (err) {
        console.warn(`Failed to read media ${mediaMatch[1]} from DB:`, err);
      }
      return placeholder;
    }

    // Legacy: try to fetch via HTTP (for old data that still has full URLs)
    if (photoUrl.startsWith('http')) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(photoUrl, {
          responseType: 'arraybuffer',
          timeout: 5000,
        });
        const buffer = Buffer.from(response.data, 'binary');
        const contentType = response.headers['content-type'] || 'image/jpeg';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (error: any) {
        console.warn(`Failed to fetch remote image: ${photoUrl}. Error: ${error.message}`);
        return placeholder;
      }
    }

    return placeholder;
  }

  static async generateInspectionPDF(inspection: any, branding: any) {
    const pdfFilename = `vistoria_${inspection.id}.pdf`;

    const existingPdf: any = await Media.findOne({ filename: pdfFilename }).lean();
    if (existingPdf) {
      console.log(`PDF already exists for inspection ${inspection.id}, returning cached.`);
      return `/api/media/${existingPdf._id}`;
    }

    // 2. Collect all image URLs and pre-fetch to Base64 in parallel
    const urlsToFetch: string[] = [];
    if (branding?.logoUrl) urlsToFetch.push(branding.logoUrl);
    
    if (inspection.rooms) {
      inspection.rooms.forEach((room: any) => {
        if (room.photos) {
          room.photos.forEach((p: any) => {
            if (p.url) urlsToFetch.push(p.url);
          });
        }
        if (room.items) {
          room.items.forEach((item: any) => {
            if (item.photos) {
              item.photos.forEach((p: any) => {
                if (p.url) urlsToFetch.push(p.url);
              });
            }
          });
        }
      });
    }

    const uniqueUrls = Array.from(new Set(urlsToFetch));
    const urlMap: Record<string, string> = {};

    await Promise.all(
      uniqueUrls.map(async (url) => {
        urlMap[url] = await PDFService.resolveToBase64(url);
      })
    );

    const uniqueUserDataDir = path.join(os.tmpdir(), `puppeteer_profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const browser = await puppeteer.launch({
      headless: true,
      userDataDir: uniqueUserDataDir,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();
      
      const landlord = JSON.parse(inspection.landlordData || '{}');
      const tenant = JSON.parse(inspection.tenantData || '{}');
      const inspector = JSON.parse(inspection.inspectorData || '{}');

      const getFullPhotoUrl = (photoUrl: string) => {
        return urlMap[photoUrl] || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      };

      // Simple HTML template for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${branding?.primaryColor || '#6D28D9'}; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-height: 60px; }
            .company-info { text-align: right; font-size: 10px; color: #666; }
            .title { text-align: center; margin-bottom: 40px; }
            .title h1 { margin: 0; font-size: 24px; color: #000; text-transform: uppercase; letter-spacing: 2px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 14px; font-weight: bold; background: #f4f4f4; padding: 8px 12px; border-left: 4px solid ${branding?.primaryColor || '#6D28D9'}; margin-bottom: 15px; text-transform: uppercase; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-size: 12px; color: #222; }
            .room-card { margin-bottom: 20px; page-break-inside: avoid; }
            .room-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .item-list { list-style: none; padding: 0; }
            .item-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f9f9f9; align-items: flex-start; }
            .item-status { font-size: 8px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-right: 12px; min-width: 40px; text-align: center; margin-top: 4px; }
            .status-BOM { background: #d1fae5; color: #065f46; }
            .status-REG { background: #fef3c7; color: #92400e; }
            .status-RUIM { background: #fee2e2; color: #991b1b; }
            .item-desc { font-size: 11px; flex: 1; }
            .photo-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
            .photo-item { width: 160px; height: 160px; overflow: hidden; border-radius: 8px; border: 1px solid #ddd; background: #f9f9f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .item-detail { margin-left: 55px; margin-bottom: 15px; }
            .item-obs { font-size: 9px; color: #666; font-style: italic; background: #fafafa; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; border-left: 2px solid #eee; }
            .item-video { font-size: 8px; color: ${branding?.primaryColor || '#6D28D9'}; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-bottom: 5px; }
            .signatures { margin-top: 60px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
            .sig-box { text-align: center; border-top: 1px solid #333; padding-top: 10px; font-size: 10px; }
            .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${branding?.logoUrl ? getFullPhotoUrl(branding.logoUrl) : ''}" class="logo" alt="Logo">
            <div class="company-info">
              <strong>${branding?.name || 'SLX Imobiliária'}</strong><br>
              CRECI: ${branding?.config?.creci || '---'}<br>
              ${branding?.config?.address || ''}
            </div>
          </div>

          <div class="title">
            <h1>Termo de Vistoria de Imóvel</h1>
            <p style="font-size: 12px; color: #666;">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="section">
            <div class="section-title">Dados do Imóvel</div>
            <div class="grid">
              <div class="info-item">
                <div class="info-label">Endereço</div>
                <div class="info-value">${inspection.propertyAddress}${inspection.propertyNumber ? `, ${inspection.propertyNumber}` : ''}</div>
                ${inspection.cep ? `<div class="info-value" style="font-size: 10px; color: #666;">CEP: ${inspection.cep}</div>` : ''}
              </div>
              <div class="info-item">
                <div class="info-label">Tipo</div>
                <div class="info-value">${inspection.propertyType || 'Residencial'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Partes Envolvidas</div>
            <div class="grid">
              <div class="info-item">
                <div class="info-label">Locador</div>
                <div class="info-value"><strong>${landlord.name || '---'}</strong></div>
                <div class="info-value" style="font-size: 10px; color: #666;">CPF: ${landlord.cpf || '---'} | RG: ${landlord.rg || '---'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Locatário</div>
                <div class="info-value"><strong>${tenant.name || '---'}</strong></div>
                <div class="info-value" style="font-size: 10px; color: #666;">CPF: ${tenant.cpf || '---'} | RG: ${tenant.rg || '---'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Detalhamento da Vistoria</div>
            ${inspection.rooms.map((room: any) => `
              <div class="room-card">
                <div class="room-name">${room.name}</div>
                <div class="item-list">
                  ${room.items.map((item: any) => `
                    <div class="item-row">
                      <span class="item-status status-${item.status}">${item.status}</span>
                      <span class="item-desc"><strong>${item.description}</strong></span>
                    </div>
                    <div class="item-detail">
                      ${item.observations ? `<div class="item-obs">${item.observations}</div>` : ''}
                      ${item.videoUrl ? `<div class="item-video">🎥 Link: ${item.videoUrl}</div>` : ''}
                      ${item.videos?.map((v: any) => `<div class="item-video">🎥 Vídeo: ${v.url}</div>`).join('')}
                      ${item.photos?.length > 0 ? `
                        <div class="photo-grid">
                          ${item.photos.map((photo: any) => `
                            <div class="photo-item">
                              <img src="${getFullPhotoUrl(photo.url)}" class="photo-img" onerror="this.style.display='none'">
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
                ${room.photos?.length > 0 ? `
                  <div class="photo-grid">
                    ${room.photos.map((photo: any) => `
                      <div class="photo-item">
                        <img src="${getFullPhotoUrl(photo.url)}" class="photo-img" onerror="this.style.display='none'">
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="signatures">
            <div class="sig-box">
              LOCADOR: ${landlord.name || '---'}<br>
              CPF: ${landlord.cpf || '---'}
            </div>
            <div class="sig-box">
              LOCATÁRIO: ${tenant.name || '---'}<br>
              CPF: ${tenant.cpf || '---'}
            </div>
            <div class="sig-box">
              VISTORIADOR: ${inspector.name || inspection.user?.name || '---'}<br>
              CRECI: ${inspector.creci || inspection.user?.creci || '---'}
            </div>
            <div class="sig-box">
              TESTEMUNHA<br>
              CPF: __________________
            </div>
          </div>

          <div class="footer">
            Este laudo é parte integrante do contrato de locação. ${branding?.name} - Todos os direitos reservados.
          </div>
        </body>
        </html>
      `;

      try {
        await page.setContent(htmlContent, { 
          waitUntil: 'load',
          timeout: 4000
        });
      } catch (e: any) {
        if (e.name === 'TimeoutError' || e.message?.includes('timeout')) {
          console.warn('PDFService.generateInspectionPDF warning: Navigation/load timeout reached. Generating PDF with partially loaded assets.');
        } else {
          throw e;
        }
      }
      
      // Generate the PDF as a buffer (no disk writes)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await browser.close();

      const media: any = await Media.create({
        filename: pdfFilename,
        mimeType: 'application/pdf',
        data: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
      });

      return `/api/media/${media._id}`;
    } catch (error) {
      console.error('PDFService.generateInspectionPDF error:', error);
      await browser.close();
      throw error;
    }
  }
}
