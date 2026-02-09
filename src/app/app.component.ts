import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MsalModule } from '@azure/msal-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    MsalModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Cerium Sales Tools';
}
