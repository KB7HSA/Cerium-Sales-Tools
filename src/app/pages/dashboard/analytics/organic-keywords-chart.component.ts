import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeywordDistribution } from './analytics-models';

@Component({
  selector: 'app-organic-keywords-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border border-gray-200 rounded-xl p-6 dark:bg-gray-dark dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 mb-6 dark:text-white">Organic Keywords</h3>
      
      <div class="flex items-center justify-between gap-8">
        <!-- Donut Chart -->
        <div class="flex-shrink-0 relative w-64 h-64">
          <svg #chartSvg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            @for (segment of chartSegments; track segment.country) {
              <circle
                [attr.cx]="100"
                [attr.cy]="100"
                [attr.r]="radius"
                [attr.stroke]="segment.color"
                [attr.stroke-width]="strokeWidth"
                [attr.stroke-dasharray]="segment.dashArray"
                [attr.stroke-dashoffset]="segment.dashOffset"
                fill="transparent"
                class="transition-all duration-300 hover:opacity-80 cursor-pointer"
                (mouseenter)="hoveredCountry = segment.country"
                (mouseleave)="hoveredCountry = null"
              />
            }
          </svg>
          
          <!-- Center Label -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              @if (hoveredCountry) {
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ getCountryPercentage(hoveredCountry) }}%
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ hoveredCountry }}</div>
              } @else {
                <div class="text-sm text-gray-500 dark:text-gray-400">Keywords</div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ getTotalKeywords() }}
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex-1 grid grid-cols-2 gap-4">
          @for (item of data; track item.country; let i = $index) {
            <div 
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors dark:hover:bg-gray-800"
              (mouseenter)="hoveredCountry = item.country"
              (mouseleave)="hoveredCountry = null"
              [class.bg-gray-50]="hoveredCountry === item.country"
              [class.dark:bg-gray-800]="hoveredCountry === item.country">
              <div 
                [style.background-color]="item.color"
                class="w-3 h-3 rounded-full flex-shrink-0">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ item.countryCode }}
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ item.percentage }}%
                  </span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.value.toLocaleString() }} keywords
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- No Data State -->
      @if (!data || data.length === 0) {
        <div class="flex flex-col items-center justify-center py-12">
          <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p class="text-gray-500 font-medium">No data available</p>
          <p class="text-sm text-gray-400 mt-1">Try selecting a different domain</p>
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
export class OrganicKeywordsChartComponent implements AfterViewInit {
  @Input() data: KeywordDistribution[] = [];
  @ViewChild('chartSvg') chartSvg!: ElementRef<SVGElement>;

  hoveredCountry: string | null = null;
  radius = 70;
  strokeWidth = 30;
  chartSegments: any[] = [];

  ngAfterViewInit() {
    this.calculateSegments();
  }

  ngOnChanges() {
    this.calculateSegments();
  }

  calculateSegments() {
    if (!this.data || this.data.length === 0) return;

    const circumference = 2 * Math.PI * this.radius;
    let currentOffset = 0;

    this.chartSegments = this.data.map(item => {
      const segmentLength = (item.percentage / 100) * circumference;
      const segment = {
        country: item.country,
        color: item.color,
        dashArray: `${segmentLength} ${circumference}`,
        dashOffset: -currentOffset
      };
      currentOffset += segmentLength;
      return segment;
    });
  }

  getCountryPercentage(country: string): number {
    const item = this.data.find(d => d.country === country);
    return item?.percentage || 0;
  }

  getTotalKeywords(): string {
    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    return total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toString();
  }
}
