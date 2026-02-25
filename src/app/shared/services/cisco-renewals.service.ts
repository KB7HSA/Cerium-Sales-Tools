import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import * as XLSX from 'xlsx';

export type RenewalStatus = '' | 'In Use' | 'Replaced' | 'Retired';

export interface HardwareRenewalItem {
  partnerGeoEntity: string;
  globalCustomerName: string;
  installSiteEndCustomerName: string;
  installSiteCountry: string;
  architecture: string;
  subArchitecture: string;
  aap: string;
  productFamily: string;
  productId: string;
  productDescription: string;
  eolDate: string;
  ldos: string;
  itemQuantity: number;
  opportunity: number;
  status: RenewalStatus;
}

export interface CustomerSummary {
  customerName: string;
  itemCount: number;
  totalQuantity: number;
  totalOpportunity: number;
  architectures: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CiscoRenewalsService {
  private renewalsSubject = new BehaviorSubject<HardwareRenewalItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadedSubject = new BehaviorSubject<boolean>(false);

  renewals$ = this.renewalsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  loaded$ = this.loadedSubject.asObservable();

  private readonly DATA_FILE_URL = '/cisco_uploads/Hardware Renewals.xlsx';
  private readonly STATUS_STORAGE_KEY = 'cisco_hw_renewal_statuses';

  constructor() {}

  /**
   * Load and parse the Hardware Renewals xlsx file
   */
  loadHardwareRenewals(): void {
    if (this.loadedSubject.value) return; // Already loaded

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

        // Load saved statuses from localStorage
        const savedStatuses = this.loadStatuses();

        const items: HardwareRenewalItem[] = rawData.map((row, index) => ({
          partnerGeoEntity: row['Partner Geo Entity'] || '',
          globalCustomerName: row['Global Customer Name'] || '',
          installSiteEndCustomerName: row['Install Site End Customer Name'] || '',
          installSiteCountry: row['Install Site Country'] || '',
          architecture: row['Architecture'] || '',
          subArchitecture: row['Sub Architecture'] || '',
          aap: row['AAP'] || '',
          productFamily: row['Product Family'] || '',
          productId: row['Product ID'] || '',
          productDescription: row['Product Description'] || '',
          eolDate: row['EOL Date'] || '',
          ldos: row['LDOS'] || '',
          itemQuantity: Number(row['Item Quantity']) || 0,
          opportunity: Number(row['Opportunity']) || 0,
          status: (savedStatuses[index] as RenewalStatus) || '',
        }));

        this.renewalsSubject.next(items);
        this.loadedSubject.next(true);
        this.loadingSubject.next(false);
      })
      .catch(error => {
        console.error('[CiscoRenewalsService] Error loading hardware renewals:', error);
        this.loadingSubject.next(false);
      });
  }

  /**
   * Get customer summaries — aggregated by Install Site End Customer Name
   */
  getCustomerSummaries(items: HardwareRenewalItem[]): CustomerSummary[] {
    const map = new Map<string, CustomerSummary>();

    for (const item of items) {
      const key = item.installSiteEndCustomerName.toUpperCase().trim();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          customerName: item.installSiteEndCustomerName,
          itemCount: 0,
          totalQuantity: 0,
          totalOpportunity: 0,
          architectures: [],
        });
      }

      const summary = map.get(key)!;
      summary.itemCount++;
      summary.totalQuantity += item.itemQuantity;
      summary.totalOpportunity += item.opportunity;
      if (!summary.architectures.includes(item.architecture)) {
        summary.architectures.push(item.architecture);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalOpportunity - a.totalOpportunity);
  }

  /**
   * Get unique architectures from the data
   */
  getArchitectures(items: HardwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.architecture))].filter(a => a).sort();
  }

  /**
   * Get unique product families from the data
   */
  getProductFamilies(items: HardwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.productFamily))].filter(f => f).sort();
  }

  /**
   * Get unique customer names
   */
  getCustomerNames(items: HardwareRenewalItem[]): string[] {
    return [...new Set(items.map(i => i.installSiteEndCustomerName))].filter(n => n).sort();
  }

  /**
   * Save a status change for an item and persist to localStorage
   */
  updateItemStatus(item: HardwareRenewalItem, status: RenewalStatus): void {
    item.status = status;
    // Persist all statuses
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
      console.warn('[CiscoRenewalsService] Failed to save statuses to localStorage', e);
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
