import puppeteer, { Browser } from 'puppeteer';
import { Media } from '../models';

// ─── Warm browser singleton ──────────────────────────────────────────────────
// Launching Chromium per request is the dominant cost (cold start can be 15–30s
// on Windows because Defender scans the binary). Keep one instance warm and
// relaunch only if it disconnects — same pattern the reconciliation service uses.
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.connected) return b;
    } catch { /* fall through to relaunch */ }
    browserPromise = null;
  }
  browserPromise = puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const b = await browserPromise;
  b.on('disconnected', () => { browserPromise = null; });
  return b;
}

// Ask Cloudinary for a small, PDF-sized derivative instead of the full photo.
// Cuts each image from ~1–5 MB to ~30–60 KB and lets Chromium load them straight
// from the CDN — no server-side download or base64 bloat.
function cloudinaryThumb(url: string, size = 400): string {
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const after = i + marker.length;
  const rest = url.slice(after);
  if (/^[a-z]+_[^/]+\//.test(rest)) return url; // already has a transformation
  // Square thumbnail matching the 160px print cell (object-fit: cover), as a
  // compact JPEG. Photos are displayed tiny in the PDF, so a full-res embed
  // would only bloat the file (a 144-photo laudo went from ~70 MB to a few MB).
  return url.slice(0, after) + `w_${size},h_${size},c_fill,q_auto:eco,f_jpg/` + rest;
}

// `landlordData` (locador) and `tenantData` (locatário) each used to hold a
// single party object; both can now hold several. Normalize whatever is stored
// (raw JSON string, single object, or array) into an array of party objects.
// Returns [{}] when empty so the PDF still renders a row with the "---"
// placeholders.
function normalizeParties(raw: any): any[] {
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw || '{}'); } catch { data = {}; }
  }
  const arr = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
  const list = arr.filter((t: any) => t && typeof t === 'object');
  return list.length ? list : [{}];
}

export class PDFService {
  static async deleteInspectionPDF(inspectionId: string) {
    try {
      const existing: any = await Media.findOne({ filename: `vistoria_${inspectionId}.pdf` }).lean();
      if (existing) {
        await Media.deleteOne({ _id: existing._id });
      }
    } catch (err) {
      console.error('Error deleting cached PDF:', err);
    }
  }

  private static readonly PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  // Resolve a stored photo URL to something an <img src> can render:
  //  - Cloudinary URL → a resized derivative URL (loaded straight from the CDN)
  //  - MongoDB /api/media/:id → base64 data URI (bytes live in the DB)
  //  - anything else → returned as-is (or placeholder if empty)
  private static async resolveImage(photoUrl: string): Promise<string> {
    if (!photoUrl) return PDFService.PLACEHOLDER;

    if (photoUrl.includes('res.cloudinary.com')) {
      return cloudinaryThumb(photoUrl);
    }

    const mediaMatch = photoUrl.match(/\/api\/media\/([a-zA-Z0-9_-]+)/);
    if (mediaMatch) {
      try {
        const media: any = await Media.findById(mediaMatch[1]).lean();
        if (media) {
          const buf = Buffer.isBuffer(media.data) ? media.data : (media.data?.buffer ?? Buffer.from(media.data ?? []));
          return `data:${media.mimeType};base64,${buf.toString('base64')}`;
        }
      } catch (err) {
        console.warn(`Failed to read media ${mediaMatch[1]} from DB:`, err);
      }
      return PDFService.PLACEHOLDER;
    }

    if (photoUrl.startsWith('http')) return photoUrl;
    return PDFService.PLACEHOLDER;
  }

  static async generateInspectionPDF(inspection: any, branding: any) {
    const pdfFilename = `vistoria_${inspection.id}.pdf`;

    const existingPdf: any = await Media.findOne({ filename: pdfFilename }).lean();
    if (existingPdf) {
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
        urlMap[url] = await PDFService.resolveImage(url);
      })
    );

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      
      const landlords = normalizeParties(inspection.landlordData);
      const tenants = normalizeParties(inspection.tenantData);
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
              ${landlords.map((landlord: any, i: number) => `
                <div class="info-item">
                  <div class="info-label">Locador${landlords.length > 1 ? ` ${i + 1}` : ''}</div>
                  <div class="info-value"><strong>${landlord.name || '---'}</strong></div>
                  <div class="info-value" style="font-size: 10px; color: #666;">CPF: ${landlord.cpf || '---'} | RG: ${landlord.rg || '---'}</div>
                </div>
              `).join('')}
              ${tenants.map((tenant: any, i: number) => `
                <div class="info-item">
                  <div class="info-label">Locatário${tenants.length > 1 ? ` ${i + 1}` : ''}</div>
                  <div class="info-value"><strong>${tenant.name || '---'}</strong></div>
                  <div class="info-value" style="font-size: 10px; color: #666;">CPF: ${tenant.cpf || '---'} | RG: ${tenant.rg || '---'}</div>
                </div>
              `).join('')}
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
            ${landlords.map((landlord: any, i: number) => `
              <div class="sig-box">
                LOCADOR${landlords.length > 1 ? ` ${i + 1}` : ''}: ${landlord.name || '---'}<br>
                CPF: ${landlord.cpf || '---'}
              </div>
            `).join('')}
            ${tenants.map((tenant: any, i: number) => `
              <div class="sig-box">
                LOCATÁRIO${tenants.length > 1 ? ` ${i + 1}` : ''}: ${tenant.name || '---'}<br>
                CPF: ${tenant.cpf || '---'}
              </div>
            `).join('')}
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

      // DOM first (data URIs are inline; Cloudinary images load over the network).
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Explicitly wait for every image to finish, but cap the wait so a single
      // slow/broken image can't block the whole PDF — after the cap we render
      // whatever loaded. This replaces the old 4s hard timeout that silently
      // dropped photos on image-heavy laudos.
      // NOTE: this runs inside the browser; DOM globals are reached via
      // globalThis so the Node-side tsc (no 'dom' lib) still type-checks.
      await page.evaluate(async () => {
        const doc: any = (globalThis as any).document;
        const imgs: any[] = Array.from(doc.images);
        const settle = (img: any) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => { img.onload = img.onerror = () => res(); });
        const timeout = new Promise<void>((res) => setTimeout(res, 20000));
        await Promise.race([Promise.all(imgs.map(settle)), timeout]);
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      // Small thumbnails keep the PDF well under MongoDB's 16 MB limit
      // (a 144-photo laudo is ~3 MB), so it's stored in Media and served via
      // /api/media/:id — no Cloudinary PDF-delivery restriction to worry about.
      const media: any = await Media.create({
        filename: pdfFilename,
        mimeType: 'application/pdf',
        data: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
      });
      return `/api/media/${media._id}`;
    } catch (error) {
      console.error('PDFService.generateInspectionPDF error:', error);
      throw error;
    } finally {
      await page.close().catch(() => {});
    }
  }
}
