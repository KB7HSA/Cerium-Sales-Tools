/**
 * Analytics Dashboard Models
 * Type definitions for SEMrush-style analytics dashboard
 */

export interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  accentColor: 'blue' | 'orange' | 'green' | 'purple';
  icon?: string;
  subMetrics?: SubMetric[];
}

export interface SubMetric {
  label: string;
  value: string | number;
  change?: number;
}

export interface CountryData {
  code: string;
  name: string;
  flag: string;
  source: 'GOOGLE' | 'BING' | 'YAHOO';
}

export interface KeywordDistribution {
  country: string;
  countryCode: string;
  percentage: number;
  value: number;
  color: string;
}

export interface TrafficData {
  date: string;
  organic: number;
  paid: number;
}

export interface SearchFilters {
  domain: string;
  reportType: 'domain-overview' | 'keyword-analytics' | 'backlinks' | 'advertising';
  countries: CountryData[];
  deviceType: 'desktop' | 'mobile';
}

export const AVAILABLE_COUNTRIES: CountryData[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', source: 'GOOGLE' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', source: 'GOOGLE' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', source: 'GOOGLE' },
  { code: 'FR', name: 'France', flag: '🇫🇷', source: 'GOOGLE' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', source: 'GOOGLE' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', source: 'GOOGLE' },
  { code: 'IN', name: 'India', flag: '🇮🇳', source: 'GOOGLE' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', source: 'GOOGLE' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', source: 'GOOGLE' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', source: 'GOOGLE' },
];
