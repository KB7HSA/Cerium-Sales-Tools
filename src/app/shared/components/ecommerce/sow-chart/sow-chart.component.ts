import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../../../../environments/environment';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

@Component({
  selector: 'app-sow-chart',
  imports: [NgApexchartsModule],
  templateUrl: './sow-chart.component.html',
})
export class SowChartComponent implements AfterViewInit, OnInit {
  @ViewChild('datepicker') datepicker!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard/stats`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.updateChartData(res.data.sowsByDay || []);
        }
      },
      error: () => { /* silently fail */ }
    });
  }

  private updateChartData(sowsByDay: { day: string; count: number }[]) {
    const days: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const sowsMap = new Map(sowsByDay.map(s => [s.day, s.count]));
    const sowsData = days.map(d => sowsMap.get(d) || 0);

    const labels = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    this.series = [
      { name: 'SOW Documents', data: sowsData },
    ];
    this.xaxis = { ...this.xaxis, categories: labels };
  }

  ngAfterViewInit() {
    flatpickr(this.datepicker.nativeElement, {
      mode: 'range',
      static: true,
      monthSelectorType: 'static',
      dateFormat: 'M j, Y',
      defaultDate: [new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), new Date()],
      onReady: (selectedDates: Date[], dateStr: string, instance: Instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
        const customClass = instance.element.getAttribute('data-class');
        instance.calendarContainer?.classList.add(customClass!);
      },
      onChange: (selectedDates: Date[], dateStr: string, instance: Instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
      },
    });
  }

  public series: ApexAxisChartSeries = [
    {
      name: 'SOW Documents',
      data: [],
    },
  ];

  public chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    height: 310,
    type: 'area',
    toolbar: { show: false },
  };

  public colors: string[] = ['#F59E0B'];

  public stroke: ApexStroke = {
    curve: 'straight',
    width: [2],
  };

  public fill: ApexFill = {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.55,
      opacityTo: 0,
    },
  };

  public markers: ApexMarkers = {
    size: 0,
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: { size: 6 },
  };

  public grid: ApexGrid = {
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  public dataLabels: ApexDataLabels = { enabled: false };

  public tooltip: ApexTooltip = {
    enabled: true,
    x: { format: 'dd MMM yyyy' },
  };

  public xaxis: ApexXAxis = {
    type: 'category',
    categories: [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
  };

  public yaxis: ApexYAxis = {
    labels: {
      style: {
        fontSize: '12px',
        colors: ['#6B7280'],
      },
    },
    title: {
      text: '',
      style: { fontSize: '0px' },
    },
  };

  public legend: ApexLegend = {
    show: false,
    position: 'top',
    horizontalAlign: 'left',
  };
}
