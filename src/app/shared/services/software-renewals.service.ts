import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';

export type SoftwareRenewalStatus = '' | 'Renewed' | 'Cancelled' | 'In Review';

export interface SoftwareRenewalItem {
  partnerGeoEntity: string;
  globalCustomerName: string;
  installSiteEndCustomerName: string;
  installSiteCountry: string;
  poNumber: string;
  webOrderId: string;
  architecture: string;
  subArchitecture: string;
  aap: string;
  subscriptionId: string;
  contractNumber: string;
  contractStatus: string;
  subscriptionOfferType: string;
  quoteNumber: string;
  quoteType: string;
  eaFlag: string;
  startDate: string;
  endDate: string;
  autoRenewTerm: string;
  cancelRequestDate: string;
  itemQuantity: number;
  fullTermListPrice: number;
  opportunity: number;
  status: SoftwareRenewalStatus;
}

export interface SoftwareCustomerSummary {
  customerName: string;
  itemCount: number;
  totalQuantity: number;
  totalOpportunity: number;
  totalListPrice: number;
  architectures: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SoftwareRenewalsService {
  private renewalsSubject = new BehaviorSubject<SoftwareRenewalItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadedSubject = new BehaviorSubject<boolean>(false);

  renewals$ = this.renewalsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  loaded$ = this.loadedSubject.asObservable();

  private readonly DATA_FILE_URL = '/cisco_uploads/Partner_Renewals1 (8).xlsx';
  private readonly STATUS_STORAGE_KEY = 'cisco_sw_renewal_statuses';

  constructor() {}

  /**
   * Load and parse the Software Renewals xlsx file
   */
  loadSoftwareRenewals(): void {
    if (this.loadedSubject.value) return;

    this.loadingSubject.next(true);

    fetch(this.DATA_FILE_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const savedStatuses = this.loadStatuses();

        const items: SoftwareRenewalItem[] = rawData.map((row, index) => ({
          partnerGeoEntity: row['Partner Geo Entity'] || '',
          globalCustomerName: row['Global Customer Name'] || '',
          installSiteEndCustomerName: row['Install Site End Customer Name'] || '',
          installSiteCountry: row['Install Site Country'] || '',
          poNumber: row['PO#'] || '',
          webOrderId: row['Web Order ID'] || '',
          architecture: row['Architecture'] || '',
          subArchitecture: row['Sub Architecture'] || '',
          aap: row['AAP'] || '',
          subscriptionId: row['Subscription ID'] || '',
          contractNumber: row['Contract Number'] || '',
          contractStatus: row['Contract-Subscr Status'] || '',
          subscriptionOfferType: row['Subscription Offer Type'] || '',
          quoteNumber: row['Quote Number'] || '',
          quoteType: row['Quote Type'] || '',
          eaFlag: row['EA Flag'] || '',
          startDate: row['Start Date'] || '',
          endDate: row['End Date'] || '',
          autoRenewTerm: String(row['Auto Renew Term(months)'] || '').trim(),
          cancelRequestDate: String(row['Cancel Request Date'] || '').trim(),
          itemQuantity: Number(row['Item Quantity']) || 0,
          fullTermListPrice: Number(row['Full Term List Price']) || 0,
          opportunity: Number(row['Opportunity (1 Yr List)']) || 0,
          status: (savedStatuses[index] as SoftwareRenewalStatus) || '',
        }));

        this.renewalsSubject.next(items);
        this.loadedSubject.next(true);
        this.loadingSubject.next(false);
      })
      .catch(error => {
        console.error('[SoftwareRenewalsService] Error loading software renewals:', error);
        this.loadingSubject.next(false);
      });
  }

  /**
   * Get customer summaries — aggregated by Install Site End Customer Name
   */
  getCustomerSummaries(items: SoftwareRenewalItem[]): SoftwareCustomerSummary[] {
    const map = new Map<string, SoftwareCustomerSummary>();

    for (const item of items) {
      const key = item.installSiteEndCustomerName.toUpperCase().trim();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          customerName: item.installSiteEndCustomerName,
          itemCount: 0,
          totalQuantity: 0,
          totalOpportunity: 0,
          totalListPrice: 0,
          architectures: [],
        });
      }

      const summary = map.get(key)!;
      summary.itemCount++;
      summary.totalQuantity += item.itemQuantity;
      summary.totalOpportunity += item.opportunity;
      summary.totalListPrice += item.fullTermListPrice;
      if (!summary.architectures.includes(item.architecture)) {
        summary.architectures.push(item.architecture);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalOpportunity - a.totalOpportunity);
  }

  /**
   * Get unique architectures from the data
   */
  getArchitectures(items: SoftwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.architecture))].filter(a => a).sort();
  }

  /**
   * Get unique subscription offer types from the data
   */
  getOfferTypes(items: SoftwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.subscriptionOfferType))].filter(f => f && f !== 'UNKNOWN').sort();
  }

  /**
   * Get unique contract statuses from the data
   */
  getContractStatuses(items: SoftwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.contractStatus))].filter(s => s).sort();
  }

  /**
   * Get unique customer names
   */
  getCustomerNames(items: SoftwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.installSiteEndCustomerName))].filter(n => n).sort();
  }

  /**
   * Save a status change for an item and persist to localStorage
   */
  updateItemStatus(item: SoftwareRenewalItem, status: SoftwareRenewalStatus): void {
    item.status = status;
    const items = this.renewalsSubject.value;
    const statuses: Record<number, string> = {};
    items.forEach((it, idx) => {
      if (it.status) {
        statuses[idx] = it.status;
      }
    });
    try {
      localStorage.setItem(this.STATUS_STORAGE_KEY, JSON.stringify(statuses));
    } catch (e) {
      console.warn('[SoftwareRenewalsService] Failed to save statuses to localStorage', e);
    }
  }

  /**
   * Load saved statuses from localStorage
   */
  private loadStatuses(): Record<number, string> {
    try {
      const raw = localStorage.getItem(this.STATUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
