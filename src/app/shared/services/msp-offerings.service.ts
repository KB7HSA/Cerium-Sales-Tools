import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MSPOption {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  pricingUnit: PricingUnit;
}

export interface MSPServiceLevel {
  id: string;
  name: string;
  basePrice: number;
  pricingUnit: PricingUnit;
  options: MSPOption[];
}

export type PricingUnit = 'per-user' | 'per-gb' | 'per-device' | 'one-time';

export interface MSPOffering {
  id: string;
  name: string;
  description: string;
  category: 'backup' | 'support' | 'database' | 'consulting';
  basePrice?: number; // Legacy: Price based on selected unit
  pricingUnit?: PricingUnit; // Legacy: Per user, per GB, or per device per month
  setupFee: number;
  features: string[];
  options?: MSPOption[]; // Legacy
  serviceLevels: MSPServiceLevel[];
  isActive: boolean;
  createdDate: string;
  lastModified: string;
}

@Injectable({
  providedIn: 'root'
})
export class MSPOfferingsService {
  private offeringsSubject = new BehaviorSubject<MSPOffering[]>([]);
  public offerings$ = this.offeringsSubject.asObservable();
  private readonly STORAGE_KEY = 'msp_offerings';

  constructor() {
    this.loadOfferings();
  }

  private loadOfferings(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MSPOffering[];
        this.offeringsSubject.next(this.normalizeOfferings(parsed));
      } catch (e) {
        console.error('Error loading MSP offerings:', e);
        this.initializeDefaultOfferings();
      }
    } else {
      this.initializeDefaultOfferings();
    }
  }

  private initializeDefaultOfferings(): void {
    const defaultOfferings: MSPOffering[] = [
      {
        id: 'offering-1',
        name: 'Druva M365 Backup',
        description: 'Comprehensive backup and recovery for Microsoft 365 cloud applications',
        category: 'backup',
        setupFee: 500,
        features: ['Exchange Online Backup', 'SharePoint Online Backup', 'OneDrive Backup', 'Teams Data Protection', 'Instant Restore'],
        serviceLevels: [
          {
            id: 'level-1',
            name: 'Standard',
            basePrice: 25,
            pricingUnit: 'per-user',
            options: [
              { id: 'opt-1', name: 'Advanced Ransomware Protection', description: 'AI-powered threat detection', monthlyPrice: 10, pricingUnit: 'per-user' },
              { id: 'opt-2', name: 'Compliance Reporting', description: 'Automated compliance reports', monthlyPrice: 5, pricingUnit: 'per-user' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      },
      {
        id: 'offering-2',
        name: 'Druva Phoenix Backup',
        description: 'Enterprise backup solution for on-premise and hybrid environments',
        category: 'backup',
        setupFee: 750,
        features: ['Full Server Backup', 'Incremental Backup', 'Deduplication', 'Encryption', 'Disaster Recovery'],
        serviceLevels: [
          {
            id: 'level-2',
            name: 'Standard',
            basePrice: 30,
            pricingUnit: 'per-user',
            options: [
              { id: 'opt-3', name: '24/7 Priority Support', description: 'Round-the-clock support', monthlyPrice: 200, pricingUnit: 'per-user' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      },
      {
        id: 'offering-3',
        name: 'Veeam Backup & Recovery',
        description: 'Unified backup and disaster recovery for virtual and physical infrastructure',
        category: 'backup',
        setupFee: 1000,
        features: ['VM Backup', 'Physical Server Backup', 'Application Backup', 'Granular Recovery', 'Backup Copy'],
        serviceLevels: [
          {
            id: 'level-3',
            name: 'Standard',
            basePrice: 0.5,
            pricingUnit: 'per-gb',
            options: [
              { id: 'opt-4', name: 'Advanced Networking', description: 'WAN optimization', monthlyPrice: 50, pricingUnit: 'per-gb' },
              { id: 'opt-5', name: 'Immutable Backups', description: 'Ransomware protection', monthlyPrice: 75, pricingUnit: 'per-gb' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      },
      {
        id: 'offering-4',
        name: 'Helpdesk Support',
        description: 'Multi-level IT support services for your infrastructure',
        category: 'support',
        setupFee: 0,
        features: ['Tier 1 Support', 'Ticket Management', 'Email Support', 'Phone Support', 'Incident Tracking'],
        serviceLevels: [
          {
            id: 'level-4',
            name: 'Standard',
            basePrice: 20,
            pricingUnit: 'per-user',
            options: [
              { id: 'opt-6', name: 'Tier 2 Support', description: 'Advanced technical support', monthlyPrice: 30, pricingUnit: 'per-user' },
              { id: 'opt-7', name: '24/7 Support', description: 'Round-the-clock availability', monthlyPrice: 100, pricingUnit: 'per-user' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      },
      {
        id: 'offering-5',
        name: 'Database Management',
        description: 'Comprehensive database administration and optimization',
        category: 'database',
        setupFee: 1500,
        features: ['Database Monitoring', 'Performance Tuning', 'Backup Management', 'Security Management', 'Patch Management'],
        serviceLevels: [
          {
            id: 'level-5',
            name: 'Standard',
            basePrice: 35,
            pricingUnit: 'per-device',
            options: [
              { id: 'opt-8', name: 'High Availability Setup', description: 'Redundancy and failover', monthlyPrice: 150, pricingUnit: 'per-device' },
              { id: 'opt-9', name: 'Replication Services', description: 'Data replication across sites', monthlyPrice: 120, pricingUnit: 'per-device' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      },
      {
        id: 'offering-6',
        name: 'Consulting Services',
        description: 'Strategic IT consulting and architecture services',
        category: 'consulting',
        setupFee: 0,
        features: ['Strategic Planning', 'Technology Assessment', 'Architecture Design', 'Implementation Support', 'Documentation'],
        serviceLevels: [
          {
            id: 'level-6',
            name: 'Standard',
            basePrice: 150,
            pricingUnit: 'per-user',
            options: [
              { id: 'opt-10', name: 'On-site Consultation', description: 'In-person consulting hours', monthlyPrice: 250, pricingUnit: 'per-user' }
            ]
          }
        ],
        isActive: true,
        createdDate: '2025-01-15',
        lastModified: '2025-01-15'
      }
    ];
    this.offeringsSubject.next(defaultOfferings);
    this.saveOfferings(defaultOfferings);
  }

  private normalizeOfferings(offerings: MSPOffering[]): MSPOffering[] {
    return offerings.map(offering => ({
      ...offering,
      serviceLevels: this.normalizeServiceLevels(offering)
    }));
  }

  private normalizeServiceLevels(offering: MSPOffering): MSPServiceLevel[] {
    const levels = (offering.serviceLevels && offering.serviceLevels.length > 0)
      ? offering.serviceLevels
      : [
          {
            id: `level-${offering.id || Date.now()}`,
            name: 'Standard',
            basePrice: offering.basePrice ?? 0,
            pricingUnit: offering.pricingUnit ?? 'per-user',
            options: offering.options || []
          }
        ];

    return levels.map(level => ({
      ...level,
      options: (level.options || []).map(option => ({
        ...option,
        pricingUnit: option.pricingUnit || level.pricingUnit || offering.pricingUnit || 'per-user'
      }))
    }));
  }

  private saveOfferings(offerings: MSPOffering[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offerings));
  }

  getOfferings(): Observable<MSPOffering[]> {
    return this.offerings$;
  }

  getOfferingById(id: string): MSPOffering | undefined {
    return this.offeringsSubject.value.find(o => o.id === id);
  }

  createOffering(offering: Omit<MSPOffering, 'id' | 'createdDate' | 'lastModified'>): MSPOffering {
    const now = new Date();
    const newOffering: MSPOffering = {
      ...offering,
      id: `offering-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: now.toLocaleDateString(),
      lastModified: now.toLocaleDateString()
    };
    const offerings = [...this.offeringsSubject.value, newOffering];
    this.offeringsSubject.next(offerings);
    this.saveOfferings(offerings);
    return newOffering;
  }

  updateOffering(id: string, updates: Partial<MSPOffering>): void {
    const offerings = this.offeringsSubject.value.map(o => 
      o.id === id 
        ? { 
            ...o, 
            ...updates,
            lastModified: new Date().toLocaleDateString()
          }
        : o
    );
    this.offeringsSubject.next(offerings);
    this.saveOfferings(offerings);
  }

  deleteOffering(id: string): void {
    const offerings = this.offeringsSubject.value.filter(o => o.id !== id);
    this.offeringsSubject.next(offerings);
    this.saveOfferings(offerings);
  }

  toggleOfferingStatus(id: string): void {
    const offering = this.getOfferingById(id);
    if (offering) {
      this.updateOffering(id, { isActive: !offering.isActive });
    }
  }

  getOfferingsByCategory(category: MSPOffering['category']): MSPOffering[] {
    return this.offeringsSubject.value.filter(o => o.category === category);
  }

  addOption(offeringId: string, option: Omit<MSPOption, 'id'>): void {
    const offering = this.getOfferingById(offeringId);
    if (offering && offering.serviceLevels.length > 0) {
      const newOption: MSPOption = {
        ...option,
        id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      const [firstLevel, ...rest] = offering.serviceLevels;
      this.updateOffering(offeringId, {
        serviceLevels: [
          { ...firstLevel, options: [...firstLevel.options, newOption] },
          ...rest
        ]
      });
    }
  }

  updateOption(offeringId: string, optionId: string, updates: Partial<MSPOption>): void {
    const offering = this.getOfferingById(offeringId);
    if (offering && offering.serviceLevels.length > 0) {
      const [firstLevel, ...rest] = offering.serviceLevels;
      this.updateOffering(offeringId, {
        serviceLevels: [
          {
            ...firstLevel,
            options: firstLevel.options.map(opt =>
              opt.id === optionId ? { ...opt, ...updates } : opt
            )
          },
          ...rest
        ]
      });
    }
  }

  deleteOption(offeringId: string, optionId: string): void {
    const offering = this.getOfferingById(offeringId);
    if (offering && offering.serviceLevels.length > 0) {
      const [firstLevel, ...rest] = offering.serviceLevels;
      this.updateOffering(offeringId, {
        serviceLevels: [
          {
            ...firstLevel,
            options: firstLevel.options.filter(opt => opt.id !== optionId)
          },
          ...rest
        ]
      });
    }
  }
}
