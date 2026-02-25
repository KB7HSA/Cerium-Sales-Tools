import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

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
    const filename = templateFileName || 'SOW-Template.docx';
    const templateUrl = `/templates/${filename}`;

    // Check cache first
    if (this.templateCache.has(filename)) {
      return this.templateCache.get(filename)!;
    }

    try {
      const response = await fetch(templateUrl);
      if (!response.ok) {
        // Fall back to default template if specific template not found
        if (templateFileName && templateFileName !== 'SOW-Template.docx') {
          console.warn(`[SOWDocumentGeneratorService] Template "${filename}" not found, using default template`);
          return this.loadTemplate('SOW-Template.docx');
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
    return {
      companyName: data.customerName || 'Customer',
      customerName: data.customerName || 'Customer',
      customerContact: data.customerContact || data.customerName || '',
      assessmentTitle: data.sowTitle || 'Statement of Work',
      sowTitle: data.sowTitle || 'Statement of Work',
      practiceArea: data.practiceArea || '',
      assessmentType: data.sowType || '',
      sowType: data.sowType || '',
      currentDate: this.formatDate(),
      executiveSummary: data.executiveSummary || '',
      scope: data.scope || '',
      methodology: data.methodology || '',
      recommendations: data.recommendations || '',
      estimatedHours: data.estimatedHours?.toString() || '0',
      hourlyRate: this.formatCurrency(data.hourlyRate),
      totalPrice: this.formatCurrency(data.totalPrice),
      AI_Summary: data.aiSummary || data.executiveSummary || '',
      AI_Findings: data.aiFindings || '',
      AI_Recommendations: data.aiRecommendations || data.recommendations || '',
      AI_Scope: data.aiScope || data.scope || '',
    };
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
      const zip = new PizZip(templateBuffer);

      // Create Docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' }
      });

      // Prepare and set data
      const templateData = this.prepareTemplateData(data);
      doc.setData(templateData);

      // Render the document
      doc.render();

      // Generate output
      const outputBuffer = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      return outputBuffer;
    } catch (error) {
      console.error('[SOWDocumentGeneratorService] Error generating document:', error);
      throw new Error('Failed to generate SOW document. Please check the template file.');
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
