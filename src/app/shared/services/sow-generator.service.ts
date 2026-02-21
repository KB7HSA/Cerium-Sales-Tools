import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Quote } from './quote.service';
import { environment } from '../../../environments/environment';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

/**
 * SOW Document stored in database
 */
export interface SOWDocument {
  Id: string;
  QuoteId: string;
  CustomerName: string;
  ServiceName: string;
  FileName: string;
  FileSizeBytes: number;
  TotalValue: number;
  MonthlyValue: number;
  DurationMonths: number;
  GeneratedBy?: string;
  Status: 'generated' | 'sent' | 'signed' | 'expired' | 'cancelled';
  Notes?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

/**
 * SOW Generator Service
 * Generates Statement of Work documents from approved quotes
 * Uses the Template-Druva M365 MSP Agreement.docx template
 */
@Injectable({
  providedIn: 'root'
})
export class SowGeneratorService {
  private apiUrl = `${environment.apiUrl}/sow-documents`;
  private templateUrl = '/templates/Template-Druva%20M365%20MSP%20Agreement.docx';
  private templateCache: ArrayBuffer | null = null;
  
  private documentsSubject = new BehaviorSubject<SOWDocument[]>([]);
  public documents$ = this.documentsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadDocuments();
  }

  /**
   * Load all SOW documents from backend
   */
  loadDocuments(): void {
    this.http.get<ApiResponse<SOWDocument[]>>(this.apiUrl)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.documentsSubject.next(response.data);
          }
        }),
        catchError(error => {
          console.error('[SowGeneratorService] Failed to load documents:', error);
          this.documentsSubject.next([]);
          return of({ success: false, data: [], message: '', statusCode: 500 });
        })
      )
      .subscribe();
  }

  /**
   * Get all SOW documents
   */
  getDocuments(): SOWDocument[] {
    return this.documentsSubject.getValue();
  }

  /**
   * Load the Word template file
   */
  private async loadTemplate(): Promise<ArrayBuffer> {
    if (this.templateCache) {
      return this.templateCache;
    }

    try {
      const response = await fetch(this.templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
      }
      this.templateCache = await response.arrayBuffer();
      return this.templateCache;
    } catch (error) {
      console.error('[SowGeneratorService] Error loading template:', error);
      throw new Error('Failed to load SOW template. Please ensure the template file exists.');
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
  private formatDate(date: Date | string | undefined): string {
    if (!date) return new Date().toISOString().split('T')[0];
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Prepare template data from quote
   */
  private prepareTemplateData(quote: Quote): Record<string, any> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Prepare selected options for table
    const selectedOptions = (quote.selectedOptions || []).map(opt => ({
      name: opt.name || 'Add-on',
      monthlyPrice: this.formatCurrency(opt.monthlyPrice),
      pricingUnit: opt.pricingUnit || '/user/month'
    }));

    // Prepare work items for table (labor quotes)
    const workItems = (quote.workItems || []).map(item => ({
      name: item.name || 'Work Item',
      section: item.section || '',
      lineHours: (item.lineHours || 0).toFixed(2),
      ratePerHour: this.formatCurrency(item.ratePerHour),
      lineTotal: this.formatCurrency(item.lineTotal)
    }));

    return {
      // Customer & Quote Info
      customerName: quote.customerName || '',
      serviceName: quote.service || '',
      serviceLevelName: quote.serviceLevelName || '',
      numberOfUsers: quote.numberOfUsers || 0,
      durationMonths: quote.durationMonths || 0,
      pricingUnitLabel: quote.pricingUnitLabel || '/user/month',
      
      // Pricing
      monthlyPrice: this.formatCurrency(quote.monthlyPrice),
      totalPrice: this.formatCurrency(quote.totalPrice),
      setupFee: this.formatCurrency(quote.setupFee),
      discountAmount: this.formatCurrency(quote.discountAmount),
      basePricePerUnit: this.formatCurrency(quote.basePricePerUnit),
      professionalServicesPrice: this.formatCurrency(quote.professionalServicesPrice),
      perUnitTotal: this.formatCurrency(quote.perUnitTotal),
      
      // Dates & References
      quoteId: quote.id || quote.Id || '',
      createdDate: quote.createdDate || this.formatDate(quote.CreatedAt),
      currentDate: currentDate,
      notes: quote.notes || '',
      
      // Tables
      selectedOptions: selectedOptions,
      workItems: workItems,
      
      // Labor specific
      totalHours: (quote.totalHours || 0).toFixed(2)
    };
  }

  /**
   * Generate SOW document from quote data
   * @param quote The approved quote to generate SOW from
   * @returns Promise<Blob> The generated Word document
   */
  async generateSOW(quote: Quote): Promise<Blob> {
    console.log('[SowGeneratorService] Generating SOW for quote:', quote.id || quote.Id);
    
    // Load the Word template
    const templateContent = await this.loadTemplate();
    
    // Create PizZip instance from template
    const zip = new PizZip(templateContent);
    
    // Create Docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    // Prepare data for template
    const data = this.prepareTemplateData(quote);
    
    // Render the document with data
    try {
      doc.render(data);
    } catch (error: any) {
      console.error('[SowGeneratorService] Template render error:', error);
      throw new Error(`Failed to generate SOW: ${error.message}`);
    }

    // Generate output as blob
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return out;
  }

  /**
   * Generate and save SOW document to database
   * @param quote The quote to generate SOW from
   * @returns Observable with the saved document info
   */
  async generateAndSaveSOW(quote: Quote): Promise<SOWDocument> {
    // Generate the document
    const blob = await this.generateSOW(quote);
    
    // Convert blob to base64
    const base64 = await this.blobToBase64(blob);
    
    // Create filename
    const customerName = (quote.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `SOW_${customerName}_${new Date().toISOString().split('T')[0]}.docx`;
    
    // Save to backend
    const payload = {
      QuoteId: quote.id || quote.Id || '',
      CustomerName: quote.customerName || '',
      ServiceName: quote.service || '',
      FileName: fileName,
      FileDataBase64: base64,
      TotalValue: quote.totalPrice || 0,
      MonthlyValue: quote.monthlyPrice || 0,
      DurationMonths: quote.durationMonths || 0,
      Notes: quote.notes || ''
    };

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse<SOWDocument>>(this.apiUrl, payload)
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Reload documents list
              this.loadDocuments();
              resolve(response.data);
            } else {
              reject(new Error(response.message || 'Failed to save SOW document'));
            }
          },
          error: (error) => {
            console.error('[SowGeneratorService] Error saving SOW:', error);
            reject(error);
          }
        });
    });
  }

  /**
   * Convert Blob to Base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Download SOW document by ID
   */
  downloadSOWById(id: string): void {
    const url = `${this.apiUrl}/${id}/download`;
    window.open(url, '_blank');
  }

  /**
   * Download the generated SOW document directly
   * @param quote The quote to generate SOW from
   * @param filename Optional custom filename
   */
  async downloadSOW(quote: Quote, filename?: string): Promise<void> {
    try {
      const blob = await this.generateSOW(quote);
      const defaultFilename = `SOW_${(quote.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('[SowGeneratorService] Error generating SOW:', error);
      throw error;
    }
  }

  /**
   * Update SOW document status
   */
  updateDocumentStatus(id: string, status: string): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(
        tap(() => this.loadDocuments()),
        catchError(error => {
          console.error('[SowGeneratorService] Error updating status:', error);
          throw error;
        })
      );
  }

  /**
   * Delete SOW document
   */
  deleteDocument(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => this.loadDocuments()),
        catchError(error => {
          console.error('[SowGeneratorService] Error deleting document:', error);
          throw error;
        })
      );
  }

  /**
   * Get placeholder data mappings for the Word template
   * Useful for template design reference
   */
  getTemplateFields(): { field: string; description: string; example: string }[] {
    return [
      { field: '{customerName}', description: 'Customer/Company Name', example: 'Acme Corporation' },
      { field: '{serviceName}', description: 'MSP Service Name', example: 'Managed Security' },
      { field: '{serviceLevelName}', description: 'Service Level/Tier', example: 'Premium' },
      { field: '{numberOfUsers}', description: 'Number of Users/Licenses', example: '50' },
      { field: '{durationMonths}', description: 'Contract Duration (months)', example: '12' },
      { field: '{monthlyPrice}', description: 'Monthly Price ($)', example: '$2,500.00' },
      { field: '{totalPrice}', description: 'Total Contract Value ($)', example: '$30,000.00' },
      { field: '{setupFee}', description: 'One-time Setup Fee ($)', example: '$500.00' },
      { field: '{discountAmount}', description: 'Discount Applied ($)', example: '$1,000.00' },
      { field: '{basePricePerUnit}', description: 'License Price Per Unit ($)', example: '$25.00' },
      { field: '{professionalServicesPrice}', description: 'Professional Services Per Unit ($)', example: '$10.00' },
      { field: '{perUnitTotal}', description: 'Total Per Unit Price ($)', example: '$35.00' },
      { field: '{notes}', description: 'Additional Notes', example: 'Special terms apply' },
      { field: '{createdDate}', description: 'Quote Created Date', example: '2026-02-20' },
      { field: '{quoteId}', description: 'Quote Reference ID', example: 'QT-12345' },
      { field: '{currentDate}', description: 'SOW Generation Date', example: '2026-02-20' },
      // Table placeholders
      { field: '{#selectedOptions}...{/selectedOptions}', description: 'Add-on Services Table Loop', example: 'Add-on name | Price' },
      { field: '{#workItems}...{/workItems}', description: 'Work Items Table Loop (Labor)', example: 'Item | Hours | Rate' },
    ];
  }
}
