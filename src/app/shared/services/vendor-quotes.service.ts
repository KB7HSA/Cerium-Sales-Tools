import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ─────────────────────────────────────────────────

export interface ShipmentTracking {
  trackingNumber?: string;
  carrierDescription?: string;
}

export interface ShipmentSubLine {
  displayLineNumber: string;
  techDataPONumber: string | null;
  vendorSalesOrderNumber: string | null;
  quantity: string;
  shipDate: string | null;
  warehouse: string | null;
  deliveryNumber: string | null;
  lineStatus: string;
  tracking: ShipmentTracking[];
}

export interface ShipmentLine {
  displayLineNumber: string;
  lineNumber: string;
  partNumber: string;
  manufacturerPartNumber: string;
  configStatus: string | null;
  totalQuantity: string;
  hasMultipleTrackingNumbers: boolean;
  hasMultipleCarrier: boolean;
  lineStatusCode: string | null;
  lineStatus: string;
  uniqueID: string | null;
  subLines: ShipmentSubLine[];
}

export interface ShipmentDetailsResponse {
  orderNumber: string;
  purchaseOrder: string;
  orderStatus: string;
  orderStatusCode: string | null;
  uniqueID: string | null;
  lines: ShipmentLine[];
  errorMessage: string | null;
}

export interface TDSynnexStatus {
  configured: boolean;
  provider: string;
  apiUrl: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Service ────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VendorQuotesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Check if the TD SYNNEX API is configured on the backend.
   */
  getTDSynnexStatus(): Observable<TDSynnexStatus | null> {
    return this.http.get<ApiResponse<TDSynnexStatus>>(`${this.apiUrl}/vendor-quotes/tdsynnex/status`).pipe(
      map(res => res.data),
      catchError(err => {
        console.error('[VendorQuotes] Status check failed:', err);
        return of(null);
      })
    );
  }

  /**
   * Query shipment details for a given order number via TD SYNNEX API.
   */
  getShipmentDetails(orderNo: string): Observable<{ data: ShipmentDetailsResponse | null; error: string | null }> {
    return this.http.get<ApiResponse<ShipmentDetailsResponse>>(
      `${this.apiUrl}/vendor-quotes/tdsynnex/shipment/${encodeURIComponent(orderNo)}`
    ).pipe(
      map(res => ({ data: res.data, error: null })),
      catchError(err => {
        const message = err.error?.message || err.message || 'Failed to retrieve shipment details';
        console.error('[VendorQuotes] Shipment query failed:', message);
        return of({ data: null, error: message });
      })
    );
  }
}
