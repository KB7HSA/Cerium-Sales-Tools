import { Component, Input, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrafficData } from './analytics-models';
import { ChartComponent, NgApexchartsModule, ApexChart, ApexAxisChartSeries, ApexXAxis, ApexYAxis, ApexDataLabels, ApexStroke, ApexGrid, ApexLegend, ApexTooltip, ApexMarkers } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  grid: ApexGrid;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  colors: string[];
};

@Component({
  selector: 'app-traffic-trend-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="bg-white border border-gray-200 rounded-xl dark:bg-gray-dark dark:border-gray-700">
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Traffic Trends</h3>
          
          <!-- Legend Pills -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-light-500 rounded-full"></div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Organic</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Paid</span>
            </div>
            <button class="text-sm text-error-600 hover:text-error-700 font-medium flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>
              Notes
            </button>
          </div>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="p-6">
        @if (chartOptions) {
          <apx-chart
            [series]="chartOptions.series!"
            [chart]="chartOptions.chart!"
            [xaxis]="chartOptions.xaxis!"
            [yaxis]="chartOptions.yaxis!"
            [dataLabels]="chartOptions.dataLabels!"
            [stroke]="chartOptions.stroke!"
            [grid]="chartOptions.grid!"
            [legend]="chartOptions.legend!"
            [tooltip]="chartOptions.tooltip!"
            [markers]="chartOptions.markers!"
            [colors]="chartOptions.colors!">
          </apx-chart>
        } @else {
          <div class="flex flex-col items-center justify-center py-12">
            <div class="text-center bg-gray-50 dark:bg-gray-800 px-8 py-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <p class="text-gray-500 font-semibold text-lg mb-2">Paid search data not found</p>
              <p class="text-sm text-gray-400">This domain has no paid search history</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TrafficTrendChartComponent implements OnInit {
  @Input() data: TrafficData[] = [];
  @Input() showPaidData: boolean = true;

  public chartOptions: Partial<ChartOptions> | null = null;

  ngOnInit() {
    this.initChart();
  }

  ngOnChanges() {
    this.initChart();
  }

  initChart() {
    if (!this.data || this.data.length === 0) {
      this.chartOptions = null;
      return;
    }

    const organicData = this.data.map(d => d.organic);
    const paidData = this.data.map(d => d.paid);
    const categories = this.data.map(d => d.date);

    const series: ApexAxisChartSeries = [
      {
        name: 'Organic',
        data: organicData
      }
    ];

    if (this.showPaidData) {
      series.push({
        name: 'Paid',
        data: paidData
      });
    }

    this.chartOptions = {
      series: series,
      chart: {
        type: 'line',
        height: 350,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      colors: ['#0BA5EC', '#FB6514'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      grid: {
        borderColor: '#E4E7EC',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 10
        }
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: '#667085',
            fontSize: '12px'
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#667085',
            fontSize: '12px'
          },
          formatter: function(value) {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value.toString();
          }
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        y: {
          formatter: function(value) {
            return value.toLocaleString();
          }
        }
      },
      markers: {
        size: 0,
        hover: {
          size: 5
        }
      }
    };
  }
}
