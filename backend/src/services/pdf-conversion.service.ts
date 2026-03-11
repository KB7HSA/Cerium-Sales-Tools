import pdfParse from 'pdf-parse';

/**
 * PDF Conversion Service
 * Handles converting PDF files to DOCX or extracting text content from PDFs.
 * 
 * Conversion methods:
 * - pdf-to-docx: Extracts text from PDF and creates a DOCX with the content
 * - pdf-extract: Extracts raw text content from PDF
 * - template-apply: For DOCX files — applies template headers/footers (handled elsewhere)
 */
export class PdfConversionService {

  /**
   * Extract text content from a PDF buffer
   */
  static async extractText(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Get PDF metadata (page count, info, etc.)
   */
  static async getMetadata(pdfBuffer: Buffer): Promise<{
    pages: number;
    info: any;
    textLength: number;
  }> {
    try {
      const data = await pdfParse(pdfBuffer);
      return {
        pages: data.numpages,
        info: data.info,
        textLength: data.text.length
      };
    } catch (error) {
      console.error('Error reading PDF metadata:', error);
      throw new Error('Failed to read PDF metadata');
    }
  }

  /**
   * Convert PDF to a simple DOCX file.
   * 
   * This creates a minimal DOCX containing the extracted text from the PDF.
   * The DOCX is created as a flat Open XML document (using docx building blocks).
   * 
   * For production use, consider integrating a dedicated library like
   * libreoffice-convert or a cloud API for higher-fidelity conversion.
   */
  static async convertToDocx(pdfBuffer: Buffer): Promise<Buffer> {
    // Extract text from PDF
    const text = await this.extractText(pdfBuffer);
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    
    // Build a minimal DOCX using Open XML
    const { createDocxFromParagraphs } = await import('./docx-builder');
    return createDocxFromParagraphs(paragraphs);
  }

  /**
   * Convert PDF to DOCX with header/footer from conversion type config
   */
  static async convertToDocxWithTemplate(
    pdfBuffer: Buffer,
    headerText?: string,
    footerText?: string
  ): Promise<Buffer> {
    const text = await this.extractText(pdfBuffer);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

    const { createDocxWithHeaderFooter } = await import('./docx-builder');
    return createDocxWithHeaderFooter(paragraphs, headerText, footerText);
  }

  /**
   * Extract text from PDF and return as a structured result
   * suitable for further processing (e.g., applying to a template)
   */
  static async extractForTemplate(pdfBuffer: Buffer): Promise<{
    text: string;
    paragraphs: string[];
    pageCount: number;
  }> {
    const data = await pdfParse(pdfBuffer);
    const paragraphs = data.text.split(/\n\n+/).filter((p: string) => p.trim());
    
    return {
      text: data.text,
      paragraphs,
      pageCount: data.numpages
    };
  }
}
