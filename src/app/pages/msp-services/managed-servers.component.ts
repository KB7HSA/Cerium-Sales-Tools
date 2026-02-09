import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Server {
  id: number;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'warning';
  cpu: number;
  memory: number;
  storage: number;
  uptime: string;
  lastBackup: string;
}

@Component({
  selector: 'app-managed-servers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './managed-servers.component.html',
  styleUrl: './managed-servers.component.css',
})
export class ManagedServersComponent {
  servers: Server[] = [
    {
      id: 1,
      name: 'Absher Construction',
      ip: 'http://absherconstruction.com',
      status: 'online',
      cpu: 45,
      memory: 72,
      storage: 81,
      uptime: '365 days',
      lastBackup: '2025-02-06',
    },
    {
      id: 2,
      name: 'Production Server 2',
      ip: '192.168.1.101',
      status: 'online',
      cpu: 38,
      memory: 65,
      storage: 62,
      uptime: '365 days',
      lastBackup: '2025-02-06',
    },
    {
      id: 3,
      name: 'Database Server',
      ip: '192.168.1.50',
      status: 'online',
      cpu: 68,
      memory: 88,
      storage: 95,
      uptime: '245 days',
      lastBackup: '2025-02-05',
    },
    {
      id: 4,
      name: 'Backup Server',
      ip: '192.168.1.60',
      status: 'online',
      cpu: 15,
      memory: 32,
      storage: 78,
      uptime: '180 days',
      lastBackup: '2025-02-06',
    },
    {
      id: 5,
      name: 'Development Server',
      ip: '192.168.1.102',
      status: 'warning',
      cpu: 92,
      memory: 94,
      storage: 88,
      uptime: '45 days',
      lastBackup: '2025-02-04',
    },
    {
      id: 6,
      name: 'Staging Server',
      ip: '192.168.1.103',
      status: 'offline',
      cpu: 0,
      memory: 0,
      storage: 45,
      uptime: '0 days',
      lastBackup: '2025-01-20',
    },
  ];

  getStatusColor(status: string): string {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'offline':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getUsageColor(value: number): string {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  }
}
