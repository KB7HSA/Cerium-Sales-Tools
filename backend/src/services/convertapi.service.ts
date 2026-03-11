import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ConvertApi from 'convertapi';

/**
 * ConvertAPI Service
 *
 * Uses the ConvertAPI (convertapi.com) to convert PDF files to high-fidelity
 * DOCX documents, preserving formatting, fonts, colors, tables, and images.
 *
 * Requires environment variable:
 *   CONVERTAPI_SECRET
 */
export class ConvertApiService {

  private static instance: ConvertApi | null = null;

  /**
   * Temporarily disable TLS certificate verification for corporate proxy environments
   * that intercept SSL with custom certificates.
   */
  private static async withTlsBypass<T>(fn: () => Promise<T>): Promise<T> {
    const orig = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      return await fn();
    } finally {
      if (orig === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = orig;
      }
    }
  }

  /**
   * Check if ConvertAPI credentials are configured
   */
  static isConfigured(): boolean {
    return !!process.env.CONVERTAPI_SECRET;
  }

  /**
   * Get or create the ConvertApi SDK instance
   */
  private static getInstance(): ConvertApi {
    if (!this.isConfigured()) {
      throw new Error(
        'ConvertAPI secret not configured. Set CONVERTAPI_SECRET in .env'
      );
    }

    if (!this.instance) {
      this.instance = new ConvertApi(process.env.CONVERTAPI_SECRET!);
    }
    return this.instance;
  }

  /**
   * Convert a PDF buffer into a DOCX buffer.
   *
   * Uses the ConvertAPI cloud service for high-fidelity conversion that
   * preserves formatting, fonts, colors, tables, charts, and images.
   *
   * @param pdfBuffer - The PDF file as a Buffer
   * @returns DOCX file as a Buffer
   */
  static async convertPdfToDocx(pdfBuffer: Buffer): Promise<Buffer> {
    return this.withTlsBypass(async () => {
      const convertapi = this.getInstance();

      console.log(`[ConvertAPI] Converting PDF (${pdfBuffer.length} bytes) to DOCX...`);

      // Write PDF buffer to a temp file (ConvertAPI SDK needs a file path)
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `convertapi_${Date.now()}.pdf`);
      const tempDocxPath = path.join(tempDir, `convertapi_${Date.now()}.docx`);

      try {
        fs.writeFileSync(tempPdfPath, pdfBuffer);

        // Call ConvertAPI to convert PDF → DOCX
        const result = await convertapi.convert('docx', {
          File: tempPdfPath,
        }, 'pdf');

        // Save result to temp file and read back as buffer
        await result.saveFiles(tempDir);

        // The result file will be in the temp directory
        const resultFile = result.files[0];
        if (!resultFile) {
          throw new Error('ConvertAPI returned no output files');
        }

        // Download the file data as a buffer
        const fileUrl = resultFile.url;
        console.log(`[ConvertAPI] Conversion complete, downloading result from: ${fileUrl}`);

        // Fetch the converted file
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download converted file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const docxBuffer = Buffer.from(arrayBuffer);

        console.log(`[ConvertAPI] Got DOCX result: ${docxBuffer.length} bytes`);
        return docxBuffer;

      } finally {
        // Clean up temp files
        try { fs.unlinkSync(tempPdfPath); } catch { /* ignore */ }
        try { fs.unlinkSync(tempDocxPath); } catch { /* ignore */ }
      }
    });
  }

  /**
   * Quick connectivity/health check — verifies the API key works
   * by checking the user's account info.
   */
  static async checkHealth(): Promise<{ success: boolean; secondsLeft?: number; error?: string }> {
    return this.withTlsBypass(async () => {
      try {
        const convertapi = this.getInstance();
        const user = await convertapi.getUser() as any;
        return {
          success: true,
          secondsLeft: user.SecondsLeft,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Unknown error',
        };
      }
    });
  }
}
