import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-services-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.css',
})
export class ServicesOverviewComponent {
  services = [
    {
      id: 1,
      name: 'Druva M365 Backup',
      description: 'Complete Druvainfrastructure management and support',
      icon: '💻',
      features: ['M365 Users', 'Sharepoint', 'Exchange Online', 'Teams'],
    },
    {
      id: 2,
      name: 'Druva Phoenix Backup',
      description: 'Manage backups for your physical and virtual servers',
      icon: '☁️',
      features: ['Azure VMs', 'AWS EC2', 'On-Prem Servers', 'Disaster Recovery'],
    },
    {
      id: 3,
      name: 'Veeam Backup & Recovery',
      description: 'Protect your business from cyber threats',
      icon: '🔒',
      features: ['Threat Detection', 'Compliance', 'Penetration Testing', 'Training'],
    },
    {
      id: 4,
      name: 'Helpdesk Support',
      description: 'Professional technical support for your team',
      icon: '📞',
      features: ['Ticket System', 'Remote Assistance', 'Priority Support', 'SLA Guarantee'],
    },
    {
      id: 5,
      name: 'Database Management',
      description: 'Optimize and secure your databases',
      icon: '🗄️',
      features: ['Performance Tuning', 'Backup Solutions', 'Replication', 'Disaster Recovery'],
    },
    {
      id: 6,
      name: 'Consulting Services',
      description: 'Strategic IT guidance for your business',
      icon: '🎯',
      features: ['Technology Planning', 'ROI Analysis', 'Best Practices', 'Digital Transformation'],
    },
  ];
}
