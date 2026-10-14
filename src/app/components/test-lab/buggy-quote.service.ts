import { Injectable } from '@angular/core';
import { QuoteModel } from '../quotes/model/quote.model';
import { QuoteService } from '../quotes/service/quote.service';

/** Намеренно сломанная реализация: лаборатория подменяет ею настоящий сервис, чтобы показать «красные» тесты. */
@Injectable()
export class BuggyQuoteService extends QuoteService {
  override addNewQuote(text: string): QuoteModel | null {
    return super.addNewQuote(text.trim() ? text : '(пустая цитата)');
  }

  override removeQuote(_id: number): void {
    // Баг: удаление «забыли» реализовать.
  }
}
