import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemStatusService, SystemStatus, ApiProbe } from '../../shared/services/system-status.service';

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-status.component.html',
})
export class SystemStatusComponent implements OnInit, OnDestroy {
  status: SystemStatus | null = null;
  isLoading = false;
  errorMessage = '';
  lastRefreshed: Date | null = null;
  private autoRefreshId: ReturnType<typeof setInterval> | null = null;

  constructor(private statusService: SystemStatusService) {}

  ngOnInit(): void {
    this.refresh();
    this.autoRefreshId = setInterval(() => this.refresh(), 30000);
  }

  ngOnDestroy(): void {
    if (this.autoRefreshId) {
      clearInterval(this.autoRefreshId);
    }
  }

  refresh(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.statusService.getSystemStatus().subscribe({
      next: (res) => {
        this.status = res.data;
        this.lastRefreshed = new Date();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.message || 'Failed to fetch system status';
        this.isLoading = false;
      },
    });
  }

  formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  get healthyApiCount(): number {
    return this.status?.apis.filter(a => a.status === 'ok').length ?? 0;
  }

  get totalApiCount(): number {
    return this.status?.apis.length ?? 0;
  }

  get overallHealthy(): boolean {
    return !!this.status && this.status.database.status === 'connected' && this.healthyApiCount === this.totalApiCount;
  }

  get hasApiErrors(): boolean {
    return this.status?.apis.some(a => !!a.error) ?? false;
  }
}
