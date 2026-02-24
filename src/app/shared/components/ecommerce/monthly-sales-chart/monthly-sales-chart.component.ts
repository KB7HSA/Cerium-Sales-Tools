
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexPlotOptions, ApexDataLabels, ApexStroke, ApexLegend, ApexYAxis, ApexGrid, ApexFill, ApexTooltip } from 'ng-apexcharts';
import { environment } from '../../../../../environments/environment';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-monthly-sales-chart',
  standalone: true,
  imports: [
    NgApexchartsModule,
],
  templateUrl: './monthly-sales-chart.component.html'
})
export class MonthlySalesChartComponent implements OnInit {
  public series: ApexAxisChartSeries = [
    { name: 'Total Cost', data: [] },
    { name: 'Count', data: [] },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard/stats`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const quotesByMonth: { month: number; count: number; totalCost: number }[] = res.data.quotesByMonth || [];
          const assessmentsByMonth: { month: number; count: number }[] = res.data.assessmentsByMonth || [];

          // Build a set of months that have ANY data
          const activeMonths = new Set<number>();
          quotesByMonth.forEach(q => activeMonths.add(q.month));
          assessmentsByMonth.forEach(a => activeMonths.add(a.month));

          // Sort months chronologically
          const sortedMonths = Array.from(activeMonths).sort((a, b) => a - b);

          if (sortedMonths.length === 0) return;

          // Build maps for quick lookup
          const quoteMap = new Map(quotesByMonth.map(q => [q.month, q]));
          const assessmentMap = new Map(assessmentsByMonth.map(a => [a.month, a]));

          const costData: number[] = [];
          const countData: number[] = [];
          const categories: string[] = [];

          sortedMonths.forEach(m => {
            categories.push(MONTH_LABELS[m - 1]);
            const q = quoteMap.get(m);
            costData.push(q ? Number(q.totalCost) : 0);
            countData.push((q?.count || 0) + (assessmentMap.get(m)?.count || 0));
          });

          this.xaxis = { ...this.xaxis, categories };

          this.series = [
            { name: 'Total Cost ($)', data: costData },
            { name: 'Count', data: countData },
          ];
        }
      },
      error: (err) => { console.error('Monthly chart error:', err); }
    });
  }
  public chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    type: 'bar',
    height: 180,
    toolbar: { show: false },
  };
  public xaxis: ApexXAxis = {
    categories: [],
    axisBorder: { show: false },
    axisTicks: { show: false },
  };
  public plotOptions: ApexPlotOptions = {
    bar: {
      horizontal: false,
      columnWidth: '39%',
      borderRadius: 5,
      borderRadiusApplication: 'end',
    },
  };
  public dataLabels: ApexDataLabels = { enabled: false };
  public stroke: ApexStroke = {
    show: true,
    width: 4,
    colors: ['transparent'],
  };
  public legend: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    fontFamily: 'Outfit',
  };
  public yaxis: ApexYAxis[] = [
    {
      title: { text: 'Cost ($)' },
      labels: {
        formatter: (val: number) => {
          if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'k';
          return '$' + val.toFixed(0);
        }
      }
    },
    {
      opposite: true,
      title: { text: 'Count' },
      labels: {
        formatter: (val: number) => val.toFixed(0)
      }
    }
  ];
  public grid: ApexGrid = { yaxis: { lines: { show: true } } };
  public fill: ApexFill = { opacity: 1 };
  public tooltip: ApexTooltip = {
    x: { show: true },
    y: {
      formatter: (val: number, opts: any) => {
        if (opts.seriesIndex === 0) {
          return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return val.toString();
      }
    },
  };
  public colors: string[] = ['#465fff', '#10B981'];
}