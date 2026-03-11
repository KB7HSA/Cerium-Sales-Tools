import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFToImagesJob,
  ExportPDFToImagesTargetFormat,
  ExportPDFToImagesOutputType,
  ExportPDFToImagesParams,
  ExportPDFToImagesResult,
} from '@adobe/pdfservices-node-sdk';
import { Readable } from 'stream';

/**
 * Adobe PDF Service
 * 
 * Uses the Adobe PDF Services API to convert PDF pages into high-fidelity
 * JPEG images, preserving all formatting, fonts, colors, tables, and images.
 * 
 * Requires environment variables:
 *   PDF_SERVICES_CLIENT_ID
 *   PDF_SERVICES_CLIENT_SECRET
 */
export class AdobePdfService {

  /**
   * Check if Adobe PDF Services credentials are configured
   */
  static isConfigured(): boolean {
    return !!(process.env.PDF_SERVICES_CLIENT_ID && process.env.PDF_SERVICES_CLIENT_SECRET);
  }

  /**
   * Create a PDFServices instance with credentials from environment
   */
  private static createPdfServices(): PDFServices {
    if (!this.isConfigured()) {
      throw new Error(
        'Adobe PDF Services credentials not configured. ' +
        'Set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET in .env'
      );
    }

    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID!,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET!,
    });

    return new PDFServices({ credentials });
  }

  /**
   * Convert a PDF buffer into an array of JPEG image buffers (one per page).
   * 
   * Uses the Adobe PDF Services API for high-fidelity rendering that preserves
   * all formatting, fonts, colors, tables, charts, and embedded images.
   * 
   * @param pdfBuffer - The PDF file as a Buffer
   * @returns Array of JPEG image buffers, one per page
   */
  static async convertToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const pdfServices = this.createPdfServices();

    console.log(`[AdobePDF] Uploading PDF (${pdfBuffer.length} bytes) to Adobe API...`);

    // Temporarily disable TLS verification for Adobe API calls
    // (corporate proxies / firewalls may intercept SSL with custom certs)
    const origTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      // Create a readable stream from the buffer
      const readStream = Readable.from(pdfBuffer);

    // Upload the PDF
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF,
    });

    // Configure export parameters — JPEG images, one per page
    const params = new ExportPDFToImagesParams({
      targetFormat: ExportPDFToImagesTargetFormat.JPEG,
      outputType: ExportPDFToImagesOutputType.LIST_OF_PAGE_IMAGES,
    });

    // Create and submit the job
    const job = new ExportPDFToImagesJob({ inputAsset, params });
    console.log(`[AdobePDF] Submitting export job...`);

    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFToImagesResult,
    });

    // Collect all page images as buffers
    const result = pdfServicesResponse.result;
    if (!result || !result.assets) {
      throw new Error('Adobe PDF Services returned no result or assets');
    }
    const resultAssets = result.assets;
    console.log(`[AdobePDF] Received ${resultAssets.length} page image(s)`);

    const imageBuffers: Buffer[] = [];

    for (let i = 0; i < resultAssets.length; i++) {
      const streamAsset = await pdfServices.getContent({
        asset: resultAssets[i],
      });

      // Convert the readable stream to a Buffer
      const buffer = await this.streamToBuffer(streamAsset.readStream);
      imageBuffers.push(buffer);
      console.log(`[AdobePDF] Page ${i + 1}: ${buffer.length} bytes`);
    }

    console.log(`[AdobePDF] Conversion complete: ${imageBuffers.length} pages`);
    return imageBuffers;

    } finally {
      // Restore original TLS setting
      if (origTlsSetting === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = origTlsSetting;
      }
    }
  }

  /**
   * Convert a readable stream to a Buffer
   */
  private static streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
