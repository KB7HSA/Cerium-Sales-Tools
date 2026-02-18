import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricData } from './analytics-models';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-theme-md transition-shadow dark:bg-gray-dark dark:border-gray-700">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div 
            [ngClass]="accentColorClasses"
            class="w-2 h-2 rounded-full">
          </div>
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide dark:text-white">
            {{ metric.title }}
          </h3>
        </div>
      </div>

      <!-- Main Value -->
      <div class="mb-4">
        <div class="flex items-baseline gap-3">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">
            {{ metric.value }}
          </span>
          @if (metric.change !== undefined && metric.change !== 0) {
            <span 
              [ngClass]="{
                'text-success-600 bg-success-50': metric.changeType === 'increase',
                'text-error-600 bg-error-50': metric.changeType === 'decrease',
                'text-gray-600 bg-gray-50': metric.changeType === 'neutral'
              }"
              class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full">
              @if (metric.changeType === 'increase') {
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"></path>
                </svg>
              }
              @if (metric.changeType === 'decrease') {
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clip-rule="evenodd"></path>
                </svg>
              }
              {{ metric.change > 0 ? '+' : '' }}{{ metric.change }}%
            </span>
          }
        </div>
        <p class="text-xs text-gray-500 uppercase mt-1 dark:text-gray-400">TRAFFIC</p>
      </div>

      <!-- Sub Metrics -->
      @if (metric.subMetrics && metric.subMetrics.length > 0) {
        <div class="pt-4 border-t border-gray-100 space-y-3 dark:border-gray-700">
          @for (subMetric of metric.subMetrics; track subMetric.label) {
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ subMetric.label }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ subMetric.value }}
                </span>
                @if (subMetric.change !== undefined && subMetric.change !== 0) {
                  <span 
                    [ngClass]="{
                      'text-success-600': subMetric.change > 0,
                      'text-error-600': subMetric.change < 0
                    }"
                    class="text-xs font-medium">
                    {{ subMetric.change > 0 ? '+' : '' }}{{ subMetric.change }}%
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class MetricCardComponent {
  @Input({ required: true }) metric!: MetricData;

  get accentColorClasses(): string {
    const colorMap = {
      blue: 'bg-blue-light-500',
      orange: 'bg-orange-500',
      green: 'bg-success-500',
      purple: 'bg-theme-purple-500'
    };
    return colorMap[this.metric.accentColor] || 'bg-gray-500';
  }
}
