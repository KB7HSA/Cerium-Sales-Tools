import { Injectable } from '@angular/core';
import { PricingUnit } from './msp-offerings.service';

export type PricingUnitOption = {
  value: PricingUnit;
  label: string;
  suffix: string;
  enabled: boolean;
};

@Injectable({ providedIn: 'root' })
export class PricingUnitsService {
  private readonly STORAGE_KEY = 'admin_pricing_units';

  private readonly defaultUnits: PricingUnitOption[] = [
    { value: 'per-user', label: 'Per User Per Month', suffix: '/user/mo', enabled: true },
    { value: 'per-gb', label: 'Per GB Per Month', suffix: '/GB/mo', enabled: true },
    { value: 'per-device', label: 'Per Device Per Month', suffix: '/device/mo', enabled: true },
    { value: 'one-time', label: 'One Time Only', suffix: '/one-time', enabled: true }
  ];

  getUnits(): PricingUnitOption[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return this.cloneUnits(this.defaultUnits);
    }

    try {
      const parsed = JSON.parse(stored) as PricingUnitOption[];
      const normalized = this.normalizeUnits(parsed);
      return this.cloneUnits(normalized);
    } catch {
      return this.cloneUnits(this.defaultUnits);
    }
  }

  saveUnits(units: PricingUnitOption[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(units));
  }

  resetUnits(): PricingUnitOption[] {
    const units = this.cloneUnits(this.defaultUnits);
    this.saveUnits(units);
    return units;
  }

  private normalizeUnits(units: PricingUnitOption[]): PricingUnitOption[] {
    const byValue = new Map<PricingUnit, PricingUnitOption>();
    for (const unit of units) {
      if (!unit || !unit.value) continue;
      byValue.set(unit.value, {
        value: unit.value,
        label: unit.label || this.getDefaultLabel(unit.value),
        suffix: unit.suffix || this.getDefaultSuffix(unit.value),
        enabled: unit.enabled !== false
      });
    }

    for (const def of this.defaultUnits) {
      if (!byValue.has(def.value)) {
        byValue.set(def.value, { ...def });
      }
    }

    return Array.from(byValue.values());
  }

  private getDefaultLabel(unit: PricingUnit): string {
    const labels: Record<PricingUnit, string> = {
      'per-user': 'Per User Per Month',
      'per-gb': 'Per GB Per Month',
      'per-device': 'Per Device Per Month',
      'one-time': 'One Time Only'
    };
    return labels[unit];
  }

  private getDefaultSuffix(unit: PricingUnit): string {
    const labels: Record<PricingUnit, string> = {
      'per-user': '/user/mo',
      'per-gb': '/GB/mo',
      'per-device': '/device/mo',
      'one-time': '/one-time'
    };
    return labels[unit];
  }

  private cloneUnits(units: PricingUnitOption[]): PricingUnitOption[] {
    return units.map(unit => ({ ...unit }));
  }
}
