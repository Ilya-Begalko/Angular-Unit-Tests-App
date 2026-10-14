import { FETCH_DELAY_MS, QuoteService, SERVER_QUOTES } from './quote.service';

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(() => {
    // Arrange: сервис — обычный класс, поэтому TestBed не нужен.
    service = new QuoteService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a quote to the list', () => {
    service.addNewQuote('Тесты — это документация');

    expect(service.quotes()).toHaveLength(1);
    expect(service.quotes()[0].text).toBe('Тесты — это документация');
  });

  it('should ignore an empty quote', () => {
    const result = service.addNewQuote('   ');

    expect(result).toBeNull();
    expect(service.count()).toBe(0);
  });

  it('should remove a quote by id', () => {
    const first = service.addNewQuote('Первая')!;
    const second = service.addNewQuote('Вторая')!;

    service.removeQuote(first.id);

    expect(service.quotes()).toEqual([second]);
  });

  it('should fetch quotes from the server asynchronously', async () => {
    vi.useFakeTimers();
    const request = service.fetchQuotesFromServer();

    await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS);

    await expect(request).resolves.toEqual(SERVER_QUOTES);
  });
});
