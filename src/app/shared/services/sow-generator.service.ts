import { Injectable } from '@angular/core';
import { Quote } from './quote.service';

/**
 * SOW Generator Service
 * Generates Statement of Work documents from approved quotes
 * 
 * TODO: Integrate with Word template when provided
 * - Template should be placed in src/assets/templates/
 * - Use docxtemplater or similar library for Word document generation
 */
@Injectable({
  providedIn: 'root'
})
export class SowGeneratorService {
  
  constructor() {}

  /**
   * Generate SOW document from quote data
   * @param quote The approved quote to generate SOW from
   * @returns Promise<Blob> The generated Word document
   */
  async generateSOW(quote: Quote): Promise<Blob> {
    console.log('[SowGeneratorService] Generating SOW for quote:', quote.id);
    
    // TODO: Implement Word template generation
    // Steps to implement:
    // 1. Install docxtemplater: npm install docxtemplater pizzip file-saver
    // 2. Load Word template from assets/templates/sow-template.docx
    // 3. Replace placeholders with quote data:
    //    - {customerName} -> quote.customerName
    //    - {serviceName} -> quote.service
    //    - {serviceLevelName} -> quote.serviceLevelName
    //    - {numberOfUsers} -> quote.numberOfUsers
    //    - {durationMonths} -> quote.durationMonths
    //    - {monthlyPrice} -> quote.monthlyPrice
    //    - {totalPrice} -> quote.totalPrice
    //    - {setupFee} -> quote.setupFee
    //    - {discountAmount} -> quote.discountAmount
    //    - {basePricePerUnit} -> quote.basePricePerUnit
    //    - {professionalServicesPrice} -> quote.professionalServicesPrice
    //    - {perUnitTotal} -> quote.perUnitTotal
    //    - {notes} -> quote.notes
    //    - {selectedOptions} -> quote.selectedOptions (table)
    //    - {createdDate} -> quote.createdDate
    //    - {quoteId} -> quote.id
    // 4. Generate and return the document blob
    
    throw new Error('SOW generation not yet implemented. Word template required.');
  }

  /**
   * Download the generated SOW document
   * @param quote The quote to generate SOW from
   * @param filename Optional custom filename
   */
  async downloadSOW(quote: Quote, filename?: string): Promise<void> {
    try {
      const blob = await this.generateSOW(quote);
      const defaultFilename = `SOW_${quote.customerName?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      
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
