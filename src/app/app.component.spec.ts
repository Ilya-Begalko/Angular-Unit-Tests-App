import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { QuoteService } from './components/quotes/service/quote.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    vi.spyOn(TestBed.inject(QuoteService), 'fetchQuotesFromServer').mockResolvedValue([]);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it('should render a single h1 heading', () => {
    const headings = element.querySelectorAll('h1');

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain('Юнит-тесты в Angular');
  });

  it('should provide semantic landmarks', () => {
    expect(element.querySelector('header')).toBeTruthy();
    expect(element.querySelector('nav[aria-label]')).toBeTruthy();
    expect(element.querySelector('main#main')).toBeTruthy();
    expect(element.querySelector('footer')).toBeTruthy();
  });

  it('should toggle the mobile menu', () => {
    const burger = element.querySelector<HTMLButtonElement>('.header__burger')!;

    burger.click();
    fixture.detectChanges();

    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.nav')?.classList).toContain('nav--open');
  });
});
