import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface RenewalStatusConfig {
  label: string;
  color: 'green' | 'blue' | 'gray' | 'red' | 'amber' | 'purple' | 'indigo' | 'cyan' | 'rose' | 'teal';
}

export interface RenewalStatusSettings {
  hardware: RenewalStatusConfig[];
  software: RenewalStatusConfig[];
}

const COLOR_CLASSES: Record<string, { badge: string; text: string }> = {
  green:  { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Green' },
  blue:   { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', text: 'Blue' },
  gray:   { badge: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400', text: 'Gray' },
  red:    { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', text: 'Red' },
  amber:  { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', text: 'Amber' },
  purple: { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', text: 'Purple' },
  indigo: { badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', text: 'Indigo' },
  cyan:   { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', text: 'Cyan' },
  rose:   { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', text: 'Rose' },
  teal:   { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', text: 'Teal' },
};

const DEFAULT_SETTINGS: RenewalStatusSettings = {
  hardware: [
    { label: 'In Use', color: 'green' },
    { label: 'Replaced', color: 'blue' },
    { label: 'Retired', color: 'gray' },
  ],
  software: [
    { label: 'Renewed', color: 'green' },
    { label: 'In Review', color: 'blue' },
    { label: 'Cancelled', color: 'gray' },
  ],
};

@Injectable({
  providedIn: 'root'
})
export class RenewalStatusAdminService {
  private readonly STORAGE_KEY = 'cisco_renewal_status_settings';

  private settingsSubject = new BehaviorSubject<RenewalStatusSettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  getSettings(): RenewalStatusSettings {
    return this.settingsSubject.value;
  }

  getHardwareStatuses(): string[] {
    return this.settingsSubject.value.hardware.map(s => s.label);
  }

  getSoftwareStatuses(): string[] {
    return this.settingsSubject.value.software.map(s => s.label);
  }

  getHardwareStatusBadgeClass(status: string): string {
    const config = this.settingsSubject.value.hardware.find(s => s.label === status);
    if (!config) return 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500';
    return COLOR_CLASSES[config.color]?.badge || COLOR_CLASSES['gray'].badge;
  }

  getSoftwareStatusBadgeClass(status: string): string {
    const config = this.settingsSubject.value.software.find(s => s.label === status);
    if (!config) return 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500';
    return COLOR_CLASSES[config.color]?.badge || COLOR_CLASSES['gray'].badge;
  }

  getAvailableColors(): { value: string; label: string; badgeClass: string }[] {
    return Object.entries(COLOR_CLASSES).map(([value, info]) => ({
      value,
      label: info.text,
      badgeClass: info.badge,
    }));
  }

  saveSettings(settings: RenewalStatusSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[RenewalStatusAdminService] Failed to save settings', e);
    }
    this.settingsSubject.next({ ...settings });
  }

  resetToDefaults(): RenewalStatusSettings {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings(defaults);
    return defaults;
  }

  private loadSettings(): RenewalStatusSettings {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.hardware && parsed.software) {
          return parsed;
        }
      }
    } catch {
      // Fall through to defaults
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}
