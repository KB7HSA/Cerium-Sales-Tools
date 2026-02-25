import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RenewalsAIService, RenewalsAIPrompt } from '../../shared/services/renewals-ai.service';

@Component({
  selector: 'app-renewals-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renewals-admin.component.html',
})
export class RenewalsAdminComponent implements OnInit {
  loading = true;
  saving = false;
  resetting = false;
  saved = false;
  error = '';

  aiConfigured = false;
  aiModel = '';

  promptText = '';
  temperature = 0.7;
  maxTokens = 4000;
  updatedAt: string | null = null;
  updatedBy: string | null = null;
  isDefault = true;

  // Track original values for dirty detection
  private originalPrompt = '';
  private originalTemp = 0.7;
  private originalTokens = 4000;

  constructor(private renewalsAI: RenewalsAIService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    // Check AI status
    this.renewalsAI.checkAIStatus().subscribe(status => {
      this.aiConfigured = status.configured;
      this.aiModel = status.model || '';
    });

    // Load prompt
    this.renewalsAI.getPrompt().subscribe(prompt => {
      this.applyPrompt(prompt);
      this.loading = false;
    });
  }

  private applyPrompt(prompt: RenewalsAIPrompt): void {
    this.promptText = prompt.promptText;
    this.temperature = prompt.temperature;
    this.maxTokens = prompt.maxTokens;
    this.updatedAt = prompt.updatedAt;
    this.updatedBy = prompt.updatedBy;
    this.isDefault = !!prompt.isDefault;
    this.originalPrompt = prompt.promptText;
    this.originalTemp = prompt.temperature;
    this.originalTokens = prompt.maxTokens;
  }

  get isDirty(): boolean {
    return this.promptText !== this.originalPrompt
      || this.temperature !== this.originalTemp
      || this.maxTokens !== this.originalTokens;
  }

  get promptCharCount(): number {
    return this.promptText.length;
  }

  get promptLineCount(): number {
    return this.promptText ? this.promptText.split('\n').length : 0;
  }

  savePrompt(): void {
    if (!this.promptText.trim()) {
      this.error = 'Prompt text cannot be empty.';
      return;
    }
    this.saving = true;
    this.saved = false;
    this.error = '';

    const user = localStorage.getItem('userName') || undefined;
    this.renewalsAI.savePrompt(this.promptText, this.temperature, this.maxTokens, user).subscribe(result => {
      this.saving = false;
      if (result.saved) {
        this.saved = true;
        this.isDefault = false;
        this.originalPrompt = this.promptText;
        this.originalTemp = this.temperature;
        this.originalTokens = this.maxTokens;
        this.updatedAt = new Date().toISOString();
        this.updatedBy = user || null;
        setTimeout(() => this.saved = false, 3000);
      } else {
        this.error = 'Failed to save prompt. Please try again.';
      }
    });
  }

  resetToDefault(): void {
    if (!confirm('Are you sure you want to reset the renewals AI prompt to the default? This will discard your custom prompt.')) {
      return;
    }
    this.resetting = true;
    this.error = '';

    this.renewalsAI.resetPrompt().subscribe(prompt => {
      this.applyPrompt(prompt);
      this.resetting = false;
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
