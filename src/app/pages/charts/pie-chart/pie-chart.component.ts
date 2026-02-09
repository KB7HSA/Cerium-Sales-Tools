import { Component } from '@angular/core';
import { PieChartOneComponent } from '../../../shared/components/charts/pie/pie-chart-one/pie-chart-one.component';
import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PieChartTwoComponent } from '../../../shared/components/charts/pie/pie-chart-two/pie-chart-two.component';

@Component({
  selector: 'app-pie-chart',
  imports: [
    PieChartOneComponent,
    ComponentCardComponent,
    PageBreadcrumbComponent,
    PieChartTwoComponent,
  ],
  templateUrl: './pie-chart.component.html',
  styles: ``
})
export class PieChartComponent {

}
