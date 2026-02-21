import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ERateSettingsService, ERateSetting, ERateStatusCode } from '../../shared/services/erate-settings.service';

@Component({
  selector: 'app-erate-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './erate-settings.component.html',
  styleUrl: './erate-settings.component.css'
})
export class ERateSettingsComponent implements OnInit {
  // Settings
  settings: ERateSetting[] = [];
  settingsLoading = false;
  settingsError = '';
  settingsSuccess = '';

  // Status Codes
  statusCodes: ERateStatusCode[] = [];
  statusCodesLoading = false;
  statusCodesError = '';
  statusCodesSuccess = '';

  // New status code form
  newStatusCode = '';
  newDisplayName = '';
  newColorClass = 'bg-gray-100 text-gray-800';
  newSortOrder = 0;

  // Edit mode
  editingStatusCodeId: string | null = null;
  editStatusCode = '';
  editDisplayName = '';
  editColorClass = '';
  editSortOrder = 0;
  editIsActive = true;

  // Color options for status badges
  colorOptions = [
    { value: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Gray' },
    { value: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Blue' },
    { value: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Green' },
    { value: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Yellow' },
    { value: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Red' },
    { value: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Purple' },
    { value: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300', label: 'Indigo' },
    { value: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300', label: 'Pink' }
  ];

  constructor(private erateSettingsService: ERateSettingsService) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadStatusCodes();
  }

  // ================================================================
  // SETTINGS
  // ================================================================

  loadSettings(): void {
    this.settingsLoading = true;
    this.settingsError = '';
    this.erateSettingsService.getSettings().subscribe({
      next: (data) => {
        this.settings = data;
        this.settingsLoading = false;
      },
      error: (err) => {
        this.settingsError = 'Failed to load settings';
        this.settingsLoading = false;
        console.error('[ERateSettings] Load error:', err);
      }
    });
  }

  updateSetting(setting: ERateSetting): void {
    this.settingsError = '';
    this.settingsSuccess = '';
    this.erateSettingsService.updateSetting(setting.SettingKey, setting.SettingValue, setting.Description).subscribe({
      next: (result) => {
        if (result) {
          this.settingsSuccess = `Setting "${setting.SettingKey}" updated successfully`;
          setTimeout(() => this.settingsSuccess = '', 3000);
        } else {
          this.settingsError = `Failed to update "${setting.SettingKey}"`;
        }
      },
      error: (err) => {
        this.settingsError = `Failed to update "${setting.SettingKey}"`;
        console.error('[ERateSettings] Update error:', err);
      }
    });
  }

  initializeTables(): void {
    this.settingsLoading = true;
    this.settingsError = '';
    this.settingsSuccess = '';
    this.erateSettingsService.initializeTables().subscribe({
      next: (result) => {
        this.settingsSuccess = 'Tables initialized: ' + result.results.join(', ');
        this.loadSettings();
        this.loadStatusCodes();
        setTimeout(() => this.settingsSuccess = '', 5000);
      },
      error: (err) => {
        this.settingsError = 'Failed to initialize tables';
        this.settingsLoading = false;
        console.error('[ERateSettings] Init error:', err);
      }
    });
  }

  getSettingLabel(key: string): string {
    const labels: Record<string, string> = {
      'SODA_API_URL': 'USAC SODA API URL',
      'TARGET_STATES': 'Target States (comma-separated)',
      'FUNDING_YEAR': 'Funding Year'
    };
    return labels[key] || key;
  }

  getSettingHelp(key: string): string {
    const help: Record<string, string> = {
      'SODA_API_URL': 'The URL for the USAC Open Data API endpoint (Form 470 data)',
      'TARGET_STATES': 'State codes to filter data retrieval (e.g., AZ,CO,NM)',
      'FUNDING_YEAR': 'The E-Rate funding year to retrieve data for'
    };
    return help[key] || '';
  }

  // ================================================================
  // STATUS CODES
  // ================================================================

  loadStatusCodes(): void {
    this.statusCodesLoading = true;
    this.statusCodesError = '';
    this.erateSettingsService.getStatusCodes(false).subscribe({
      next: (data) => {
        this.statusCodes = data.sort((a, b) => a.SortOrder - b.SortOrder);
        this.statusCodesLoading = false;
        // Set next sort order for new items
        if (this.statusCodes.length > 0) {
          this.newSortOrder = Math.max(...this.statusCodes.map(s => s.SortOrder)) + 1;
        }
      },
      error: (err) => {
        this.statusCodesError = 'Failed to load status codes';
        this.statusCodesLoading = false;
        console.error('[ERateSettings] Load status codes error:', err);
      }
    });
  }

  addStatusCode(): void {
    if (!this.newStatusCode.trim() || !this.newDisplayName.trim()) {
      this.statusCodesError = 'Status code and display name are required';
      return;
    }

    this.statusCodesError = '';
    this.statusCodesSuccess = '';
    this.erateSettingsService.createStatusCode(
      this.newStatusCode.trim(),
      this.newDisplayName.trim(),
      this.newColorClass,
      this.newSortOrder
    ).subscribe({
      next: (result) => {
        if (result) {
          this.statusCodesSuccess = `Status code "${this.newDisplayName}" created successfully`;
          this.newStatusCode = '';
          this.newDisplayName = '';
          this.newColorClass = 'bg-gray-100 text-gray-800';
          this.loadStatusCodes();
          setTimeout(() => this.statusCodesSuccess = '', 3000);
        } else {
          this.statusCodesError = 'Failed to create status code';
        }
      },
      error: (err) => {
        this.statusCodesError = 'Failed to create status code';
        console.error('[ERateSettings] Create status code error:', err);
      }
    });
  }

  startEdit(statusCode: ERateStatusCode): void {
    this.editingStatusCodeId = statusCode.Id;
    this.editStatusCode = statusCode.StatusCode;
    this.editDisplayName = statusCode.DisplayName;
    this.editColorClass = statusCode.ColorClass || 'bg-gray-100 text-gray-800';
    this.editSortOrder = statusCode.SortOrder;
    this.editIsActive = statusCode.IsActive;
  }

  cancelEdit(): void {
    this.editingStatusCodeId = null;
  }

  saveEdit(): void {
    if (!this.editingStatusCodeId) return;

    if (!this.editStatusCode.trim() || !this.editDisplayName.trim()) {
      this.statusCodesError = 'Status code and display name are required';
      return;
    }

    this.statusCodesError = '';
    this.statusCodesSuccess = '';
    this.erateSettingsService.updateStatusCode(this.editingStatusCodeId, {
      StatusCode: this.editStatusCode.trim(),
      DisplayName: this.editDisplayName.trim(),
      ColorClass: this.editColorClass,
      SortOrder: this.editSortOrder,
      IsActive: this.editIsActive
    }).subscribe({
      next: (result) => {
        if (result) {
          this.statusCodesSuccess = `Status code "${this.editDisplayName}" updated successfully`;
          this.editingStatusCodeId = null;
          this.loadStatusCodes();
          setTimeout(() => this.statusCodesSuccess = '', 3000);
        } else {
          this.statusCodesError = 'Failed to update status code';
        }
      },
      error: (err) => {
        this.statusCodesError = 'Failed to update status code';
        console.error('[ERateSettings] Update status code error:', err);
      }
    });
  }

  deleteStatusCode(statusCode: ERateStatusCode): void {
    if (!confirm(`Are you sure you want to delete "${statusCode.DisplayName}"?`)) {
      return;
    }

    this.statusCodesError = '';
    this.statusCodesSuccess = '';
    this.erateSettingsService.deleteStatusCode(statusCode.Id).subscribe({
      next: (success) => {
        if (success) {
          this.statusCodesSuccess = `Status code "${statusCode.DisplayName}" deleted successfully`;
          this.loadStatusCodes();
          setTimeout(() => this.statusCodesSuccess = '', 3000);
        } else {
          this.statusCodesError = 'Failed to delete status code';
        }
      },
      error: (err) => {
        this.statusCodesError = 'Failed to delete status code';
        console.error('[ERateSettings] Delete status code error:', err);
      }
    });
  }

  toggleStatusCodeActive(statusCode: ERateStatusCode): void {
    this.erateSettingsService.updateStatusCode(statusCode.Id, {
      IsActive: !statusCode.IsActive
    }).subscribe({
      next: (result) => {
        if (result) {
          this.loadStatusCodes();
        }
      }
    });
  }
}
