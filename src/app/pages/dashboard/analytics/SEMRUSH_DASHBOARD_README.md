# SEMrush-Style Analytics Dashboard - TailwindCSS Components

## 📋 Overview

This is a complete, production-ready analytics dashboard built with **Angular 21** and **TailwindCSS v4**, inspired by the SEMrush Domain Overview interface. All components are standalone, fully typed, and feature dark mode support.

## 🎯 What's Included

### Components Created

1. **DomainSearchHeaderComponent** - Search header with country selectors and filters
2. **MetricCardComponent** - Reusable metric display cards with sub-metrics
3. **OrganicKeywordsChartComponent** - Interactive donut chart for keyword distribution
4. **TrafficTrendChartComponent** - Line chart using ApexCharts for traffic trends
5. **DomainAnalyticsComponent** - Main dashboard page that orchestrates all components

### Supporting Files

- **analytics-models.ts** - TypeScript interfaces and data models
- **domain-analytics.component.html** - Complete dashboard layout
- **domain-analytics.component.ts** - Main component logic with sample data

## 📁 File Structure

```
src/app/pages/dashboard/analytics/
├── analytics-models.ts                     # TypeScript interfaces
├── domain-search-header.component.ts       # Search header with filters
├── metric-card.component.ts                # Metric display cards
├── organic-keywords-chart.component.ts     # Donut chart component
├── traffic-trend-chart.component.ts        # Line chart component
├── domain-analytics.component.ts           # Main dashboard component
└── domain-analytics.component.html         # Dashboard template
```

## 🎨 TailwindCSS Classes Breakdown

### Layout Classes
- **Grid System**: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`
- **Flexbox**: `flex items-center justify-between gap-3`
- **Spacing**: `px-6 py-6 space-y-6 gap-6`

### Component Styling

#### Cards & Containers
```css
bg-white border border-gray-200 rounded-xl p-6 
hover:shadow-theme-md transition-shadow
dark:bg-gray-dark dark:border-gray-700
```

#### Buttons
```css
/* Primary Button */
px-6 py-2.5 text-sm font-semibold text-white 
bg-orange-600 rounded-lg hover:bg-orange-700 
transition-colors focus:outline-none 
focus:ring-2 focus:ring-orange-500

/* Secondary Button */
px-4 py-2 text-xs font-medium border 
border-gray-300 rounded-lg hover:bg-gray-50
```

#### Input Fields
```css
w-full px-4 py-2.5 text-sm border 
border-gray-300 rounded-lg 
focus:outline-none focus:ring-2 
focus:ring-brand-500
dark:bg-gray-800 dark:text-white
```

#### Badge/Pills
```css
px-3 py-1 bg-blue-light-50 
text-blue-light-700 rounded-full 
text-xs font-medium
```

### Color Palette Used

| Component | Color Variable | Hex Value |
|-----------|---------------|-----------|
| Organic Search (Blue) | `blue-light-500` | #0BA5EC |
| Paid Search (Orange) | `orange-500` | #FB6514 |
| Backlinks (Green) | `success-500` | #12B76A |
| Display Ads (Purple) | `theme-purple-500` | #7A5AF8 |
| Primary Brand | `brand-500` | #465FFF |

## 🚀 How to Use

### 1. Add Route Configuration

Update your `app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... other routes
  {
    path: 'dashboard/domain-analytics',
    loadComponent: () => 
      import('./pages/dashboard/analytics/domain-analytics.component')
        .then(m => m.DomainAnalyticsComponent),
    title: 'Domain Analytics'
  }
];
```

### 2. Navigation Link

Add to your sidebar navigation:

```html
<a routerLink="/dashboard/domain-analytics" 
   class="menu-item"
   routerLinkActive="menu-item-active">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
    </path>
  </svg>
  Domain Analytics
</a>
```

### 3. Using Individual Components

You can use components standalone:

```typescript
import { Component } from '@angular/core';
import { MetricCardComponent } from './path/to/metric-card.component';
import { MetricData } from './path/to/analytics-models';

@Component({
  selector: 'app-custom-dashboard',
  standalone: true,
  imports: [MetricCardComponent],
  template: `
    <app-metric-card [metric]="myMetric"></app-metric-card>
  `
})
export class CustomDashboardComponent {
  myMetric: MetricData = {
    id: 'traffic',
    title: 'Website Traffic',
    value: '12.5K',
    change: 15.3,
    changeType: 'increase',
    accentColor: 'blue',
    subMetrics: [
      { label: 'Sessions', value: '8.2K', change: 12 },
      { label: 'Bounce Rate', value: '42%', change: -5 }
    ]
  };
}
```

## 🎯 Component API Reference

### MetricCardComponent

**Input:**
```typescript
@Input() metric: MetricData;
```

**MetricData Interface:**
```typescript
interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  accentColor: 'blue' | 'orange' | 'green' | 'purple';
  subMetrics?: SubMetric[];
}
```

### OrganicKeywordsChartComponent

**Input:**
```typescript
@Input() data: KeywordDistribution[];
```

**Features:**
- Interactive donut chart
- Hover effects
- Auto-calculated segments
- Legend with percentages

### TrafficTrendChartComponent

**Inputs:**
```typescript
@Input() data: TrafficData[];
@Input() showPaidData: boolean = true;
```

**Dependencies:**
- Uses ApexCharts (ng-apexcharts)
- Responsive design
- Smooth animations

### DomainSearchHeaderComponent

**Output:**
```typescript
@Output() searchEvent = new EventEmitter<SearchFilters>();
```

**Features:**
- Multi-country selection
- Device type toggle (Desktop/Mobile)
- Report type dropdown
- Search input with clear button

## 🎨 Customization Guide

### Change Accent Colors

Edit [metric-card.component.ts](metric-card.component.ts):

```typescript
get accentColorClasses(): string {
  const colorMap = {
    blue: 'bg-blue-light-500',
    orange: 'bg-orange-500',
    green: 'bg-success-500',
    purple: 'bg-theme-purple-500',
    // Add your custom colors
    red: 'bg-error-500',
    yellow: 'bg-warning-500'
  };
  return colorMap[this.metric.accentColor] || 'bg-gray-500';
}
```

### Modify Chart Colors

Edit [traffic-trend-chart.component.ts](traffic-trend-chart.component.ts):

```typescript
colors: ['#0BA5EC', '#FB6514'], // Change these hex values
```

### Add More Countries

Edit [analytics-models.ts](analytics-models.ts):

```typescript
export const AVAILABLE_COUNTRIES: CountryData[] = [
  // Add more countries
  { code: 'JP', name: 'Japan', flag: '🇯🇵', source: 'GOOGLE' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', source: 'GOOGLE' },
];
```

## 📊 Sample Data Structure

The dashboard comes with realistic sample data. To connect to a real API:

```typescript
// In domain-analytics.component.ts
private fetchAnalyticsData(filters: SearchFilters) {
  this.analyticsService.getDomainOverview(filters).subscribe({
    next: (data) => {
      this.metricsData.set(data.metrics);
      this.keywordDistribution.set(data.keywords);
      this.trafficTrendData.set(data.traffic);
      this.isLoading.set(false);
    },
    error: (err) => {
      console.error('Failed to fetch analytics', err);
      this.isLoading.set(false);
    }
  });
}
```

## 🌙 Dark Mode Support

All components fully support dark mode using Tailwind's `dark:` variant:

```css
/* Light mode */
bg-white text-gray-900

/* Dark mode */
dark:bg-gray-dark dark:text-white
```

Toggle dark mode in your app:

```typescript
// Add to your layout component
toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

## 📱 Responsive Design

Breakpoints used:
- **Mobile**: Default (1 column)
- **md** (768px): 2 columns for metrics
- **lg** (1024px): 2 columns for charts
- **xl** (1280px): 4 columns for metrics, 3 columns for insights

## 🔧 Dependencies Required

Ensure these are in your `package.json`:

```json
{
  "dependencies": {
    "@angular/core": "^21.0.0",
    "@angular/common": "^21.0.0",
    "@angular/forms": "^21.0.0",
    "tailwindcss": "^4.1.0",
    "ng-apexcharts": "^2.0.0",
    "apexcharts": "^5.3.0"
  }
}
```

## ✨ Key Features

- ✅ **Fully Responsive** - Works on all screen sizes
- ✅ **Dark Mode Ready** - Complete dark mode support
- ✅ **Type Safe** - Full TypeScript interfaces
- ✅ **Standalone Components** - No module dependencies
- ✅ **Reusable** - Components can be used independently
- ✅ **Accessible** - Semantic HTML and ARIA labels
- ✅ **Performance** - Angular signals for reactive updates
- ✅ **Clean Code** - Well-structured and documented

## 🎓 TailwindCSS Patterns Used

### Utility Classes
```css
/* Spacing */
p-{size}, px-{size}, py-{size}, gap-{size}, space-y-{size}

/* Typography */
text-{size}, font-{weight}, text-{color}

/* Layout */
flex, grid, grid-cols-{n}, items-{align}, justify-{align}

/* Effects */
hover:, focus:, transition-{property}, rounded-{size}

/* Dark Mode */
dark:bg-{color}, dark:text-{color}, dark:border-{color}
```

### Custom Utilities (from styles.css)
```css
menu-item, menu-item-active, shadow-theme-{size}
```

## 🚦 Next Steps

1. **Connect to API**: Replace sample data with real API calls
2. **Add Loading States**: Implement skeleton screens
3. **Error Handling**: Add error boundaries and retry logic
4. **User Preferences**: Save search filters to localStorage
5. **Export Features**: Add PDF/CSV export functionality
6. **Real-time Updates**: Implement WebSocket for live data
7. **Advanced Filters**: Add date range pickers and more filters

## 📝 License

Feel free to use these components in your projects!

## 🤝 Contributing

To extend or modify:
1. Follow the existing TailwindCSS patterns
2. Maintain TypeScript strict mode compliance
3. Add dark mode support for new components
4. Update this documentation

---

**Built with ❤️ using Angular 21 + TailwindCSS v4**
