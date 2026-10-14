import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { QuoteModel } from './model/quote.model';
import { QuotesComponent } from './quotes.component';
import { QuoteService } from './service/quote.service';

describe('QuotesComponent', () => {
  let fixture: ComponentFixture<QuotesComponent>;
  let component: QuotesComponent;
  let service: QuoteService;

  const query = <T extends Element = HTMLElement>(testId: string): T =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement;

  const typeQuote = (text: string): void => {
    const textarea = query<HTMLTextAreaElement>('quote-input');
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotesComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(QuoteService);
    vi.spyOn(service, 'fetchQuotesFromServer').mockResolvedValue([]);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render quotes from the service', () => {
    service.addNewQuote('Тест — это спецификация');

    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[data-testid="quote-item"]'));
    expect(items).toHaveLength(1);
    expect(items[0].nativeElement.textContent).toContain('Тест — это спецификация');
  });

  it('should disable the button when the textarea is empty', () => {
    fixture.detectChanges();

    expect(query<HTMLButtonElement>('submit-quote').disabled).toBe(true);
  });

  it('should enable the button when the textarea is not empty', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    typeQuote('Я люблю тесты');

    expect(query<HTMLButtonElement>('submit-quote').disabled).toBe(false);
  });

  it('should add a quote and clear the textarea on submit', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    typeQuote('Красный, зелёный, рефакторинг');

    query<HTMLButtonElement>('submit-quote').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(service.count()).toBe(1);
    expect(query('quote-list').textContent).toContain('Красный, зелёный, рефакторинг');
    expect(query<HTMLTextAreaElement>('quote-input').value).toBe('');
  });

  it('should remove a quote when the delete button is clicked', () => {
    service.addNewQuote('Удали меня');
    fixture.detectChanges();

    query<HTMLButtonElement>('remove-quote').click();
    fixture.detectChanges();

    expect(service.count()).toBe(0);
    expect(query('quotes-empty')).toBeTruthy();
  });

  it('should fetch data asynchronously', async () => {
    const fakeList: QuoteModel[] = [{ id: 42, text: 'Я люблю юнит-тесты', createdAt: new Date() }];
    const spy = vi.spyOn(service, 'fetchQuotesFromServer').mockResolvedValue(fakeList);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.fetchedList()).toEqual(fakeList);
    expect(query('fetched-list').textContent).toContain('Я люблю юнит-тесты');
  });
});
