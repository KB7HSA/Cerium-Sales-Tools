import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RenewalStatusAdminService, RenewalStatusConfig, RenewalStatusSettings } from '../../shared/services/renewal-status-admin.service';

@Component({
  selector: 'app-renewal-status-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renewal-status-admin.component.html',
})
export class RenewalStatusAdminComponent implements OnInit {
  settings!: RenewalStatusSettings;
  availableColors: { value: string; label: string; badgeClass: string }[] = [];
  saveMessage = '';
  saveMessageType: 'success' | 'error' = 'success';

  // New status form
  newHardwareLabel = '';
  newHardwareColor = 'green';
  newSoftwareLabel = '';
  newSoftwareColor = 'green';

  constructor(private statusService: RenewalStatusAdminService) {}

  ngOnInit(): void {
    this.settings = JSON.parse(JSON.stringify(this.statusService.getSettings()));
    this.availableColors = this.statusService.getAvailableColors();
  }

  // --- Hardware Statuses ---
  addHardwareStatus(): void {
    const label = this.newHardwareLabel.trim();
    if (!label) return;
    if (this.settings.hardware.some(s => s.label.toLowerCase() === label.toLowerCase())) {
      this.showMessage('A hardware status with that name already exists.', 'error');
      return;
    }
    this.settings.hardware.push({ label, color: this.newHardwareColor as RenewalStatusConfig['color'] });
    this.newHardwareLabel = '';
    this.newHardwareColor = 'green';
  }

  removeHardwareStatus(index: number): void {
    this.settings.hardware.splice(index, 1);
  }

  moveHardwareStatus(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.settings.hardware.length) return;
    const temp = this.settings.hardware[index];
    this.settings.hardware[index] = this.settings.hardware[newIndex];
    this.settings.hardware[newIndex] = temp;
  }

  // --- Software Statuses ---
  addSoftwareStatus(): void {
    const label = this.newSoftwareLabel.trim();
    if (!label) return;
    if (this.settings.software.some(s => s.label.toLowerCase() === label.toLowerCase())) {
      this.showMessage('A software status with that name already exists.', 'error');
      return;
    }
    this.settings.software.push({ label, color: this.newSoftwareColor as RenewalStatusConfig['color'] });
    this.newSoftwareLabel = '';
    this.newSoftwareColor = 'green';
  }

  removeSoftwareStatus(index: number): void {
    this.settings.software.splice(index, 1);
  }

  moveSoftwareStatus(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.settings.software.length) return;
    const temp = this.settings.software[index];
    this.settings.software[index] = this.settings.software[newIndex];
    this.settings.software[newIndex] = temp;
  }

  // --- Actions ---
  save(): void {
    if (this.settings.hardware.length === 0 && this.settings.software.length === 0) {
      this.showMessage('Please add at least one status option.', 'error');
      return;
    }
    this.statusService.saveSettings(this.settings);
    this.showMessage('Status settings saved successfully.', 'success');
  }

  resetToDefaults(): void {
    this.settings = JSON.parse(JSON.stringify(this.statusService.resetToDefaults()));
    this.showMessage('Settings reset to defaults.', 'success');
  }

  getColorBadgeClass(color: string): string {
    const found = this.availableColors.find(c => c.value === color);
    return found?.badgeClass || 'bg-gray-100 text-gray-600';
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.saveMessage = msg;
    this.saveMessageType = type;
    setTimeout(() => this.saveMessage = '', 4000);
  }
}
