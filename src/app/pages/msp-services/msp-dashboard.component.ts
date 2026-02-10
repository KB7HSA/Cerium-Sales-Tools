import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteService, Quote } from '../../shared/services/quote.service';

@Component({
  selector: 'app-msp-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './msp-dashboard.component.html',
  styleUrl: './msp-dashboard.component.css'
})
export class MspDashboardComponent implements OnInit {
  quotes: Quote[] = [];

  constructor(private quoteService: QuoteService) {}

  ngOnInit(): void {
    this.quoteService.quotes$.subscribe(quotes => {
      this.quotes = quotes;
    });
  }

  get activeQuotes(): number {
    return this.quotes.filter(quote => quote.type === 'msp' && quote.status === 'approved').length;
  }

  get activeTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'approved')
      .reduce((sum, quote) => sum + quote.totalPrice, 0);
  }

  get activeAddOnMonthlyTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'approved')
      .reduce((sum, quote) => sum + (quote.addOnMonthlyTotal || 0), 0);
  }

  get activeAddOnOneTimeTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'approved')
      .reduce((sum, quote) => sum + (quote.addOnOneTimeTotal || 0), 0);
  }

  get pendingQuotes(): number {
    return this.quotes.filter(quote => quote.type === 'msp' && quote.status === 'pending').length;
  }

  get pendingTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'pending')
      .reduce((sum, quote) => sum + quote.totalPrice, 0);
  }

  get pendingAddOnMonthlyTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'pending')
      .reduce((sum, quote) => sum + (quote.addOnMonthlyTotal || 0), 0);
  }

  get pendingAddOnOneTimeTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'pending')
      .reduce((sum, quote) => sum + (quote.addOnOneTimeTotal || 0), 0);
  }

  get deniedQuotes(): number {
    return this.quotes.filter(quote => quote.type === 'msp' && quote.status === 'denied').length;
  }

  get deniedTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'denied')
      .reduce((sum, quote) => sum + quote.totalPrice, 0);
  }

  get deniedAddOnMonthlyTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'denied')
      .reduce((sum, quote) => sum + (quote.addOnMonthlyTotal || 0), 0);
  }

  get deniedAddOnOneTimeTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp' && quote.status === 'denied')
      .reduce((sum, quote) => sum + (quote.addOnOneTimeTotal || 0), 0);
  }

  get overallAddOnMonthlyTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp')
      .reduce((sum, quote) => sum + (quote.addOnMonthlyTotal || 0), 0);
  }

  get overallAddOnOneTimeTotal(): number {
    return this.quotes
      .filter(quote => quote.type === 'msp')
      .reduce((sum, quote) => sum + (quote.addOnOneTimeTotal || 0), 0);
  }
}
