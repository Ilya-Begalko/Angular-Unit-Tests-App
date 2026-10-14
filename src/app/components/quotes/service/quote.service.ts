import { Injectable, computed, signal } from '@angular/core';
import { QuoteModel } from '../model/quote.model';

export const FETCH_DELAY_MS = 2000;

export const SERVER_QUOTES: readonly QuoteModel[] = [
  {
    id: -1,
    text: 'Тестирование программ может доказать наличие ошибок, но никогда — их отсутствие.',
    author: 'Эдсгер Дейкстра',
    createdAt: new Date('1970-01-01T00:00:00Z'),
  },
  {
    id: -2,
    text: 'Код без тестов — это плохой код. Неважно, насколько он хорошо написан.',
    author: 'Майкл Физерс',
    createdAt: new Date('2004-09-22T00:00:00Z'),
  },
  {
    id: -3,
    text: 'Тесты — это лучшая документация: она никогда не устаревает.',
    author: 'Народная мудрость',
    createdAt: new Date('2018-06-04T00:00:00Z'),
  },
];

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly quoteList = signal<QuoteModel[]>([]);
  private nextId = 1;

  readonly quotes = this.quoteList.asReadonly();
  readonly count = computed(() => this.quoteList().length);

  addNewQuote(text: string): QuoteModel | null {
    const normalized = text.trim();
    if (!normalized) {
      return null;
    }

    const quote: QuoteModel = { id: this.nextId++, text: normalized, createdAt: new Date() };
    this.quoteList.update((list) => [...list, quote]);
    return quote;
  }

  getQuotes(): readonly QuoteModel[] {
    return this.quoteList();
  }

  removeQuote(id: number): void {
    this.quoteList.update((list) => list.filter((quote) => quote.id !== id));
  }

  fetchQuotesFromServer(): Promise<QuoteModel[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...SERVER_QUOTES]), FETCH_DELAY_MS);
    });
  }
}
