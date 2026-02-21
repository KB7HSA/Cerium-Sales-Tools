import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

/**
 * Assessment data structure for document generation
 */
export interface AssessmentDocumentData {
  customerName: string;
  assessmentTitle: string;
  practiceArea: string;
  assessmentType: string;
  executiveSummary: string;
  scope: string;
  methodology: string;
  recommendations: string;
  estimatedHours: number;
  hourlyRate: number;
  totalPrice: number;
  templateFileName?: string;
}

/**
 * Assessment Document Generator Service
 * Generates Assessment documents using Docxtemplater
 */
@Injectable({
  providedIn: 'root'
})
export class AssessmentDocumentService {
  private defaultTemplateUrl = '/templates/Assessment-Template.docx';
  private templateCache: Map<string, ArrayBuffer> = new Map();

  constructor() {}

  /**
   * Load the Word template file
   * @param templateFileName Optional template filename (defaults to Assessment-Template.docx)
   */
  private async loadTemplate(templateFileName?: string): Promise<ArrayBuffer> {
    const filename = templateFileName || 'Assessment-Template.docx';
    const templateUrl = `/templates/${filename}`;
    
    // Check cache first
    if (this.templateCache.has(filename)) {
      return this.templateCache.get(filename)!;
    }

    try {
      const response = await fetch(templateUrl);
      if (!response.ok) {
        // Fall back to default template if specific template not found
        if (templateFileName && templateFileName !== 'Assessment-Template.docx') {
          console.warn(`[AssessmentDocumentService] Template "${filename}" not found, using default template`);
          return this.loadTemplate('Assessment-Template.docx');
        }
        throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      this.templateCache.set(filename, buffer);
      return buffer;
    } catch (error) {
      console.error('[AssessmentDocumentService] Error loading template:', error);
      throw new Error(`Failed to load Assessment template "${filename}". Please ensure the template file exists.`);
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
   * Prepare template data from assessment input
   */
  private prepareTemplateData(data: AssessmentDocumentData): Record<string, any> {
    return {
      customerName: data.customerName || 'Customer',
      assessmentTitle: data.assessmentTitle || 'Assessment',
      practiceArea: data.practiceArea || '',
      assessmentType: data.assessmentType || '',
      currentDate: this.formatDate(),
      executiveSummary: data.executiveSummary || '',
      scope: data.scope || '',
      methodology: data.methodology || '',
      recommendations: data.recommendations || '',
      estimatedHours: data.estimatedHours?.toString() || '0',
      hourlyRate: this.formatCurrency(data.hourlyRate),
      totalPrice: this.formatCurrency(data.totalPrice),
    };
  }

  /**
   * Generate assessment document
   * @param data Assessment data to populate the template
   * @returns Blob containing the generated DOCX file
   */
  async generateDocument(data: AssessmentDocumentData): Promise<Blob> {
    try {
      // Load template (use type-specific template if provided)
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
    } catch (error: any) {
      console.error('[AssessmentDocumentService] Error generating document:', error);
      
      if (error.properties && error.properties.errors) {
        console.error('[AssessmentDocumentService] Template errors:', error.properties.errors);
      }
      
      throw new Error('Failed to generate assessment document. Please try again.');
    }
  }

  /**
   * Generate and download assessment document
   * @param data Assessment data
   * @param filename Optional filename (without extension)
   */
  async generateAndDownload(data: AssessmentDocumentData, filename?: string): Promise<void> {
    const blob = await this.generateDocument(data);
    
    // Create download link
    const defaultFilename = `${data.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_Assessment_${new Date().toISOString().split('T')[0]}`;
    const finalFilename = (filename || defaultFilename) + '.docx';
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
