import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created: string;
  updated: string;
  assigned: string;
}

@Component({
  selector: 'app-msp-support',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './support.component.html',
  styleUrl: './support.component.css',
})
export class SupportComponent {
  tickets: SupportTicket[] = [
    {
      id: 1001,
      title: 'Email Server Down',
      description: 'Production email server is experiencing connectivity issues',
      status: 'in-progress',
      priority: 'critical',
      created: '2025-02-05 14:30',
      updated: '2025-02-06 09:15',
      assigned: 'John Smith',
    },
    {
      id: 1002,
      title: 'Database Performance Slow',
      description: 'Query performance has degraded over the past week',
      status: 'in-progress',
      priority: 'high',
      created: '2025-02-04 10:22',
      updated: '2025-02-06 08:45',
      assigned: 'Sarah Johnson',
    },
    {
      id: 1003,
      title: 'Software License Renewal',
      description: 'Need to renew licenses for development tools',
      status: 'open',
      priority: 'medium',
      created: '2025-02-03 16:50',
      updated: '2025-02-03 16:50',
      assigned: 'Unassigned',
    },
    {
      id: 1004,
      title: 'Network Switch Upgrade',
      description: 'Upgrade network switch to support higher bandwidth',
      status: 'open',
      priority: 'medium',
      created: '2025-02-01 09:30',
      updated: '2025-02-01 09:30',
      assigned: 'Mike Davis',
    },
    {
      id: 1005,
      title: 'Backup Restoration Request',
      description: 'Need to restore files from 2025-02-01 backup',
      status: 'resolved',
      priority: 'high',
      created: '2025-01-31 11:45',
      updated: '2025-02-02 14:20',
      assigned: 'John Smith',
    },
    {
      id: 1006,
      title: 'Security Patch Installation',
      description: 'Apply critical security patches to all servers',
      status: 'closed',
      priority: 'critical',
      created: '2025-01-28 08:00',
      updated: '2025-02-01 17:30',
      assigned: 'Sarah Johnson',
    },
  ];

  activeTab: 'all' | 'open' | 'in-progress' | 'resolved' = 'all';

  getStatusColor(status: string): string {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'resolved':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'closed':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  getFilteredTickets(): SupportTicket[] {
    if (this.activeTab === 'all') {
      return this.tickets;
    }
    return this.tickets.filter(t => t.status === this.activeTab);
  }

  setActiveTab(tab: 'all' | 'open' | 'in-progress' | 'resolved'): void {
    this.activeTab = tab;
  }
}
