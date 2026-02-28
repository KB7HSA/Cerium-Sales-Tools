import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
// @ts-ignore – no type declarations for the free image module
import ImageModule from 'docxtemplater-image-module-free';

/**
 * SOW data structure for document generation
 */
export interface SOWDocumentData {
  customerName: string;
  customerContact?: string;
  sowTitle: string;
  practiceArea: string;
  sowType: string;
  executiveSummary: string;
  scope: string;
  methodology: string;
  recommendations: string;
  estimatedHours: number;
  hourlyRate: number;
  totalPrice: number;
  templateFileName?: string;
  aiSummary?: string;
  aiFindings?: string;
  aiRecommendations?: string;
  aiScope?: string;
  contentSections?: { name: string; type: 'text' | 'image'; content: string; imageFileName?: string; templateTag?: string }[];
}

/**
 * SOW Document Generator Service
 * Generates Statement of Work documents using Docxtemplater
 */
@Injectable({
  providedIn: 'root'
})
export class SOWDocumentGeneratorService {
  private templateCache: Map<string, ArrayBuffer> = new Map();

  constructor() {}

  /**
   * Load the Word template file
   */
  private async loadTemplate(templateFileName?: string): Promise<ArrayBuffer> {
    const filename = templateFileName || 'Cerium_SOW_Master_v1.docx';
    const templateUrl = `/templates/${filename}`;

    // Check cache first
    if (this.templateCache.has(filename)) {
      return this.templateCache.get(filename)!;
    }

    try {
      const response = await fetch(templateUrl);
      if (!response.ok) {
        // Fall back to default template if specific template not found
        if (templateFileName && templateFileName !== 'Cerium_SOW_Master_v1.docx') {
          console.warn(`[SOWDocumentGeneratorService] Template "${filename}" not found, using default template`);
          return this.loadTemplate('Cerium_SOW_Master_v1.docx');
        }
        // If default not found either, try Assessment template
        console.warn(`[SOWDocumentGeneratorService] SOW template not found, falling back to Assessment template`);
        return this.loadFallbackTemplate();
      }
      const buffer = await response.arrayBuffer();
      this.templateCache.set(filename, buffer);
      return buffer;
    } catch (error) {
      console.error('[SOWDocumentGeneratorService] Error loading template:', error);
      throw new Error(`Failed to load SOW template "${filename}". Please ensure the template file exists.`);
    }
  }

  /**
   * Try to load Assessment template as fallback
   */
  private async loadFallbackTemplate(): Promise<ArrayBuffer> {
    try {
      const response = await fetch('/templates/Assessment-Template.docx');
      if (!response.ok) {
        throw new Error('No template file available');
      }
      const buffer = await response.arrayBuffer();
      this.templateCache.set('Assessment-Template.docx', buffer);
      return buffer;
    } catch (error) {
      throw new Error('Failed to load any template file. Please add SOW-Template.docx to /public/templates/');
    }
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '$0.00';
    return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Format date
   */
  private formatDate(date?: Date): string {
    const d = date || new Date();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Prepare template data from SOW input
   */
  private prepareTemplateData(data: SOWDocumentData): Record<string, any> {
    const templateData: Record<string, any> = {
      // Core customer/project fields
      companyName: data.customerName || 'Customer',
      customerName: data.customerName || 'Customer',
      customerContact: data.customerContact || data.customerName || '',
      assessmentTitle: data.sowTitle || 'Statement of Work',
      sowTitle: data.sowTitle || 'Statement of Work',
      title: data.sowTitle || 'Statement of Work',
      practiceArea: data.practiceArea || '',
      assessmentType: data.sowType || '',
      sowType: data.sowType || '',
      serviceName: data.sowType || '',
      currentDate: this.formatDate(),
      createdDate: this.formatDate(),
      // Content sections
      executiveSummary: data.executiveSummary || '',
      scope: data.scope || '',
      methodology: data.methodology || '',
      recommendations: data.recommendations || '',
      findings: data.aiFindings || '',
      nextSteps: data.recommendations || '',
      // Pricing fields
      estimatedHours: data.estimatedHours?.toString() || '0',
      hourlyRate: this.formatCurrency(data.hourlyRate),
      totalPrice: this.formatCurrency(data.totalPrice),
      monthlyPrice: this.formatCurrency((data.totalPrice || 0) / 12),
      // AI content fields
      AI_Summary: data.aiSummary || data.executiveSummary || '',
      AI_Findings: data.aiFindings || '',
      AI_Recommendations: data.aiRecommendations || data.recommendations || '',
      AI_Scope: data.aiScope || data.scope || '',
      // Customer notes
      notes: '',
    };

    // Add content sections as template variables
    if (data.contentSections && data.contentSections.length > 0) {
      data.contentSections.forEach((section, index) => {
        // Use templateTag if specified, otherwise fall back to sanitized name
        const tag = section.templateTag?.trim() || section.name.replace(/[^a-zA-Z0-9]/g, '_');

        if (section.type === 'image' && section.content?.startsWith('data:image')) {
          // For images: the value is the data-URL; the image module resolves it
          // via {%tag} syntax in the DOCX template
          templateData[tag] = section.content;
          templateData[`section_${index}`] = section.content;
        } else {
          const value = section.content || '';
          templateData[tag] = value;
          templateData[`section_${index}`] = value;
        }
      });

      // Add a combined 'contentSections' array for loop templates (text only)
      templateData['contentSections'] = data.contentSections
        .filter(s => s.type === 'text')
        .map(s => ({ name: s.name, tag: s.templateTag || s.name.replace(/[^a-zA-Z0-9]/g, '_'), content: s.content || '' }));
    }

    return templateData;
  }

  /**
   * Decode a base64 data-URL to a Uint8Array for the image module.
   */
  private base64DataUrlToBuffer(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1] || '';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Resolve image natural dimensions from a data-URL using an HTML Image.
   * Returns dimensions scaled to fit within 6"×8" at 96 DPI.
   * Falls back to 500×375 if the image cannot be decoded.
   */
  private getImageSize(dataUrl: string): Promise<[number, number]> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const MAX_W = 576; // 6 inches × 96 DPI
        const MAX_H = 768; // 8 inches × 96 DPI
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        resolve([w, h]);
      };
      img.onerror = () => resolve([500, 375]);
      img.src = dataUrl;
    });
  }

  /**
   * Build the image module configuration.
   * Caches resolved sizes so the synchronous getSize callback works.
   */
  private buildImageModule(sizeCache: Map<string, [number, number]>): any {
    const self = this;
    return new ImageModule({
      centered: false,
      fileType: 'docx',
      getImage(tagValue: string) {
        if (typeof tagValue === 'string' && tagValue.startsWith('data:image')) {
          return self.base64DataUrlToBuffer(tagValue);
        }
        // Return 1×1 transparent PNG as fallback
        return self.base64DataUrlToBuffer(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg=='
        );
      },
      getSize(img: any, tagValue: string, tagName: string) {
        return sizeCache.get(tagName) || sizeCache.get(tagValue) || [500, 375];
      }
    });
  }

  /**
   * Pre-resolve all image sizes before rendering (async → sync bridge).
   */
  private async preloadImageSizes(
    templateData: Record<string, any>,
    sections?: SOWDocumentData['contentSections']
  ): Promise<Map<string, [number, number]>> {
    const cache = new Map<string, [number, number]>();
    if (!sections) return cache;

    const promises: Promise<void>[] = [];
    for (const section of sections) {
      if (section.type !== 'image' || !section.content?.startsWith('data:image')) continue;

      const tag = section.templateTag?.trim() || section.name.replace(/[^a-zA-Z0-9]/g, '_');
      const dataUrl = section.content;

      promises.push(
        this.getImageSize(dataUrl).then(size => {
          cache.set(tag, size);
          cache.set(dataUrl, size);
        })
      );
    }

    await Promise.all(promises);
    return cache;
  }

  /**
   * Generate SOW document
   * @param data SOW data to populate the template
   * @returns Blob containing the generated DOCX file
   */
  async generateDocument(data: SOWDocumentData): Promise<Blob> {
    try {
      // Load template
      const templateBuffer = await this.loadTemplate(data.templateFileName);

      // Prepare template data
      const templateData = this.prepareTemplateData(data);

      // Pre-resolve image sizes (async) so the sync getSize callback works
      const sizeCache = await this.preloadImageSizes(templateData, data.contentSections);

      // Build image module
      const imageModule = this.buildImageModule(sizeCache);

      // Create zip and docxtemplater with image module attached
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        modules: [imageModule],
        // Gracefully handle missing placeholders instead of throwing errors
        nullGetter(part: any) {
          if (!part.module) {
            return '';
          }
          if (part.module === 'rawxml') {
            return '';
          }
          return '';
        }
      });

      // Set data and render
      doc.setData(templateData);
      doc.render();

      // Generate output
      const outputBuffer = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      return outputBuffer;
    } catch (error: any) {
      console.error('[SOWDocumentGeneratorService] Error generating document:', error);
      // Preserve detailed error info for debugging
      const detail = error?.properties?.errors?.map((e: any) => e.message).join('; ') || error?.message || String(error);
      throw new Error(`Failed to generate SOW document: ${detail}`);
    }
  }

  /**
   * Generate and trigger browser download
   */
  async generateAndDownload(data: SOWDocumentData, filename?: string): Promise<void> {
    const blob = await this.generateDocument(data);
    const defaultFilename = `SOW_${(data.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}
