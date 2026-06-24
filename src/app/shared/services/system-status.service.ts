import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiProbe {
  name: string;
  table: string;
  status: string;
  count: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface SystemStatus {
  server: {
    status: string;
    uptime: number;
    environment: string;
    nodeVersion: string;
    timestamp: string;
  };
  database: {
    status: string;
    server: string;
    database: string;
    latencyMs: number | null;
    error: string | null;
  };
  apis: ApiProbe[];
}

export interface SystemStatusResponse {
  success: boolean;
  data: SystemStatus;
  message: string;
  statusCode: number;
}

@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getSystemStatus(): Observable<SystemStatusResponse> {
    return this.http.get<SystemStatusResponse>(`${this.apiUrl}/system-status`);
  }
}
