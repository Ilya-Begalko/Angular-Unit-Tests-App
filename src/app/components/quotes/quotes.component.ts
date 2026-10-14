import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuoteModel } from './model/quote.model';
import { QuoteService } from './service/quote.service';

@Component({
  selector: 'app-quotes',
  imports: [FormsModule, DatePipe],
  templateUrl: './quotes.component.html',
  styleUrl: './quotes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesComponent implements OnInit {
  private readonly service = inject(QuoteService);

  readonly maxLength = 280;
  readonly quoteList = this.service.quotes;
  readonly fetchedList = signal<QuoteModel[]>([]);
  readonly isFetching = signal(false);
  readonly quoteText = signal('');
  readonly canSubmit = computed(() => this.quoteText().trim().length > 0);

  async ngOnInit(): Promise<void> {
    this.isFetching.set(true);
    try {
      this.fetchedList.set(await this.service.fetchQuotesFromServer());
    } finally {
      this.isFetching.set(false);
    }
  }

  createNewQuote(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.service.addNewQuote(this.quoteText());
    this.quoteText.set('');
  }

  removeQuote(id: number): void {
    this.service.removeQuote(id);
  }
}
