import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainSearchHeaderComponent } from './domain-search-header.component';
import { MetricCardComponent } from './metric-card.component';
import { OrganicKeywordsChartComponent } from './organic-keywords-chart.component';
import { TrafficTrendChartComponent } from './traffic-trend-chart.component';
import { MetricData, KeywordDistribution, TrafficData, SearchFilters } from './analytics-models';

@Component({
  selector: 'app-domain-analytics',
  standalone: true,
  imports: [
    CommonModule,
    DomainSearchHeaderComponent,
    MetricCardComponent,
    OrganicKeywordsChartComponent,
    TrafficTrendChartComponent
  ],
  templateUrl: './domain-analytics.component.html',
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class DomainAnalyticsComponent {
  currentDomain = signal('smepals.com');
  isLoading = signal(false);

  // Metrics Data
  metricsData = signal<MetricData[]>([
    {
      id: 'organic-search',
      title: 'Organic Search',
      value: '1.4K',
      change: 22.3,
      changeType: 'increase',
      accentColor: 'blue',
      subMetrics: [
        { label: 'SEMrush Rank', value: '537K', change: 0 },
        { label: 'Keywords', value: '9.9K', change: 26 },
        { label: 'Traffic Cost', value: '$7.6K', change: 172 }
      ]
    },
    {
      id: 'paid-search',
      title: 'Paid Search',
      value: '0',
      change: 0,
      changeType: 'neutral',
      accentColor: 'orange',
      subMetrics: [
        { label: 'Keywords', value: '0', change: 0 },
        { label: 'Traffic Cost', value: '$0', change: 0 }
      ]
    },
    {
      id: 'backlinks',
      title: 'Backlinks',
      value: '138',
      accentColor: 'green',
      subMetrics: [
        { label: 'Referring Domains', value: '56' },
        { label: 'Referring IPs', value: '58' }
      ]
    },
    {
      id: 'display-ads',
      title: 'Display Advertising',
      value: '0',
      change: 0,
      changeType: 'neutral',
      accentColor: 'purple',
      subMetrics: [
        { label: 'Ads', value: '0' },
        { label: 'Publishers', value: '0' },
        { label: 'Advertisers', value: '0' }
      ]
    }
  ]);

  // Keyword Distribution Data
  keywordDistribution = signal<KeywordDistribution[]>([
    { country: 'United States', countryCode: 'US', percentage: 35.2, value: 3500, color: '#465FFF' },
    { country: 'India', countryCode: 'IN', percentage: 18.5, value: 1850, color: '#FB6514' },
    { country: 'Australia', countryCode: 'AU', percentage: 12.3, value: 1230, color: '#12B76A' },
    { country: 'United Kingdom', countryCode: 'UK', percentage: 10.8, value: 1080, color: '#F04438' },
    { country: 'Canada', countryCode: 'CA', percentage: 8.7, value: 870, color: '#F79009' },
    { country: 'Netherlands', countryCode: 'NL', percentage: 6.2, value: 620, color: '#7A5AF8' },
    { country: 'Italy', countryCode: 'IT', percentage: 4.8, value: 480, color: '#EE46BC' },
    { country: 'Spain', countryCode: 'ES', percentage: 3.5, value: 350, color: '#36BFFA' }
  ]);

  // Traffic Trend Data (Last 3 months)
  trafficTrendData = signal<TrafficData[]>([
    { date: '27 Feb', organic: 1200, paid: 0 },
    { date: '6 Mar', organic: 1250, paid: 0 },
    { date: '13 Mar', organic: 1180, paid: 5 },
    { date: '20 Mar', organic: 1320, paid: 8 },
    { date: '27 Mar', organic: 1280, paid: 3 },
    { date: '3 Apr', organic: 1350, paid: 0 },
    { date: '10 Apr', organic: 1380, paid: 0 },
    { date: '17 Apr', organic: 1420, paid: 12 },
    { date: '24 Apr', organic: 1390, paid: 8 },
    { date: '1 May', organic: 1450, paid: 15 },
    { date: '8 May', organic: 1480, paid: 10 },
    { date: '13 May', organic: 1520, paid: 7 }
  ]);

  // Handle Search
  handleSearch(filters: SearchFilters) {
    console.log('Search filters:', filters);
    this.currentDomain.set(filters.domain);
    this.isLoading.set(true);

    // Simulate API call
    setTimeout(() => {
      this.isLoading.set(false);
      // In a real app, you would fetch data based on filters
      // this.fetchAnalyticsData(filters);
    }, 1000);
  }

  // Simulate fetching analytics data
  private fetchAnalyticsData(filters: SearchFilters) {
    // This would be an actual API call in production
    // Example: this.analyticsService.getDomainOverview(filters).subscribe(...)
  }
}
