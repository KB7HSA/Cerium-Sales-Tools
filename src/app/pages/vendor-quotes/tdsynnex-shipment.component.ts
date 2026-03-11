import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  VendorQuotesService,
  TDSynnexStatus,
  ShipmentDetailsResponse,
} from '../../shared/services/vendor-quotes.service';

@Component({
  selector: 'app-tdsynnex-shipment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tdsynnex-shipment.component.html',
  styleUrl: './tdsynnex-shipment.component.css',
})
export class TDSynnexShipmentComponent implements OnInit, OnDestroy {
  // ── Configuration status ──
  apiStatus: TDSynnexStatus | null = null;
  statusLoading = true;

  // ── Search form ──
  orderNo = '';
  isLoading = false;
  errorMessage = '';

  // ── Results ──
  shipmentData: ShipmentDetailsResponse | null = null;

  private sub = new Subscription();

  constructor(private vendorQuotesService: VendorQuotesService) {}

  ngOnInit(): void {
    this.checkApiStatus();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  /** Check backend configuration of TD SYNNEX API */
  checkApiStatus(): void {
    this.statusLoading = true;
    this.sub.add(
      this.vendorQuotesService.getTDSynnexStatus().subscribe(status => {
        this.apiStatus = status;
        this.statusLoading = false;
      })
    );
  }

  /** Submit shipment query */
  lookupShipment(): void {
    const trimmed = this.orderNo.trim();
    if (!trimmed) {
      this.errorMessage = 'Please enter an order number.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.shipmentData = null;

    this.sub.add(
      this.vendorQuotesService.getShipmentDetails(trimmed).subscribe(result => {
        this.isLoading = false;
        if (result.error) {
          this.errorMessage = result.error;
        } else {
          this.shipmentData = result.data;
          if (!this.shipmentData?.lines?.length) {
            this.errorMessage = 'No shipment lines found for this order.';
          }
        }
      })
    );
  }

  /** Clear form and results */
  clearResults(): void {
    this.orderNo = '';
    this.shipmentData = null;
    this.errorMessage = '';
  }

  /** Get a CSS class for a status badge */
  getStatusClass(status: string | null): string {
    if (!status) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    const s = status.toLowerCase();
    if (s === 'shipped' || s === 'delivered' || s === 'complete' || s === 'closed') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (s === 'open' || s === 'in progress' || s === 'processing') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (s === 'backordered' || s === 'pending') {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (s === 'cancelled' || s === 'error') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}
