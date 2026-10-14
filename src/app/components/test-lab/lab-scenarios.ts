import { QuoteModel } from '../quotes/model/quote.model';
import { QuotesComponent } from '../quotes/quotes.component';
import { FETCH_DELAY_MS, QuoteService } from '../quotes/service/quote.service';
import { LabExpect } from './lab-expect';

export type LabPhase = 'arrange' | 'act' | 'assert';

export const PHASE_LABELS: Record<LabPhase, string> = {
  arrange: 'Arrange',
  act: 'Act',
  assert: 'Assert',
};

export interface LabFixture {
  readonly component: QuotesComponent;
  readonly element: HTMLElement;
  detectChanges(): void;
  query<T extends Element = HTMLElement>(testId: string): T;
  queryAll(testId: string): Element[];
  type(testId: string, text: string): void;
}

export interface LabContext {
  readonly service: QuoteService;
  readonly expect: LabExpect;
  log(text: string): void;
  mount(): LabFixture;
  whenStable(): Promise<void>;
}

export interface LabStep {
  readonly phase: LabPhase;
  readonly title: string;
  readonly detail?: string;
  run(ctx: LabContext): void | Promise<void>;
}

export interface LabSuite {
  readonly name: string;
  readonly file: string;
  readonly description: string;
}

export interface LabScenario {
  readonly id: string;
  readonly suite: LabSuite;
  readonly name: string;
  readonly title: string;
  readonly goal: string;
  readonly tools: readonly string[];
  readonly code: string;
  /** Фабрика шагов: каждый запуск получает свежее замыкание, как отдельный it(). */
  readonly steps: () => LabStep[];
}

export const SERVICE_SUITE: LabSuite = {
  name: 'QuoteService',
  file: 'quote.service.spec.ts',
  description:
    'Изолированные юнит-тесты: сервис создаётся через new, без Angular. Проверяем только логику работы со списком.',
};

export const COMPONENT_SUITE: LabSuite = {
  name: 'QuotesComponent',
  file: 'quotes.component.spec.ts',
  description:
    'Тесты компонента с DOM: TestBed собирает компонент, мы взаимодействуем с разметкой как пользователь и проверяем результат.',
};

export const LAB_SCENARIOS: readonly LabScenario[] = [
  {
    id: 'service-add',
    suite: SERVICE_SUITE,
    name: 'should add a quote to the list',
    title: 'Добавляет цитату в список',
    goal: 'Проверяем базовый контракт: после addNewQuote() в списке появляется ровно одна цитата с переданным текстом.',
    tools: ['new QuoteService()', 'expect().toHaveLength()', 'expect().toBe()'],
    code: `it('should add a quote to the list', () => {
  service.addNewQuote('Тесты — это документация');

  expect(service.quotes()).toHaveLength(1);
  expect(service.quotes()[0].text).toBe('Тесты — это документация');
});`,
    steps: () => [
      {
        phase: 'arrange',
        title: 'Создаём чистый экземпляр сервиса',
        detail: 'beforeEach() создаёт новый QuoteService перед каждым тестом, поэтому тесты не влияют друг на друга.',
        run: (ctx) => ctx.expect(ctx.service.quotes(), 'service.quotes()').toHaveLength(0),
      },
      {
        phase: 'act',
        title: 'Вызываем addNewQuote()',
        run: (ctx) => {
          ctx.service.addNewQuote('Тесты — это документация');
          ctx.log('service.addNewQuote("Тесты — это документация")');
        },
      },
      {
        phase: 'assert',
        title: 'В списке одна цитата с нашим текстом',
        run: (ctx) => {
          ctx.expect(ctx.service.quotes(), 'service.quotes()').toHaveLength(1);
          ctx.expect(ctx.service.quotes()[0]?.text, 'service.quotes()[0].text').toBe('Тесты — это документация');
        },
      },
    ],
  },
  {
    id: 'service-empty',
    suite: SERVICE_SUITE,
    name: 'should ignore an empty quote',
    title: 'Игнорирует пустой текст',
    goal: 'Граничный случай: строка из одних пробелов не должна попадать в список. Такие тесты защищают от «мусорных» данных.',
    tools: ['expect().toBeNull()', 'computed() count'],
    code: `it('should ignore an empty quote', () => {
  const result = service.addNewQuote('   ');

  expect(result).toBeNull();
  expect(service.count()).toBe(0);
});`,
    steps: () => {
      let result: QuoteModel | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Готовим строку из пробелов',
          run: (ctx) => ctx.log('const text = "   "'),
        },
        {
          phase: 'act',
          title: 'Пытаемся добавить пустую цитату',
          run: (ctx) => {
            result = ctx.service.addNewQuote('   ');
            ctx.log('const result = service.addNewQuote("   ")');
          },
        },
        {
          phase: 'assert',
          title: 'Метод вернул null, список не изменился',
          run: (ctx) => {
            ctx.expect(result, 'result').toBeNull();
            ctx.expect(ctx.service.count(), 'service.count()').toBe(0);
          },
        },
      ];
    },
  },
  {
    id: 'service-remove',
    suite: SERVICE_SUITE,
    name: 'should remove a quote by id',
    title: 'Удаляет цитату по id',
    goal: 'Удаляется именно та цитата, id которой передали, а остальные остаются на месте.',
    tools: ['expect().toEqual()'],
    code: `it('should remove a quote by id', () => {
  const first = service.addNewQuote('Первая')!;
  const second = service.addNewQuote('Вторая')!;

  service.removeQuote(first.id);

  expect(service.quotes()).toEqual([second]);
});`,
    steps: () => {
      let first: QuoteModel | null = null;
      let second: QuoteModel | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Добавляем две цитаты',
          run: (ctx) => {
            first = ctx.service.addNewQuote('Первая');
            second = ctx.service.addNewQuote('Вторая');
            ctx.log(`Добавлены цитаты с id ${first?.id} и ${second?.id}`);
          },
        },
        {
          phase: 'act',
          title: 'Удаляем первую',
          run: (ctx) => {
            ctx.service.removeQuote(first!.id);
            ctx.log(`service.removeQuote(${first!.id})`);
          },
        },
        {
          phase: 'assert',
          title: 'Осталась только вторая цитата',
          run: (ctx) => ctx.expect(ctx.service.quotes(), 'service.quotes()').toEqual([second]),
        },
      ];
    },
  },
  {
    id: 'service-fetch',
    suite: SERVICE_SUITE,
    name: 'should fetch quotes from the server asynchronously',
    title: 'Асинхронно получает цитаты с «сервера»',
    goal: `Метод возвращает Promise, который выполняется через ${FETCH_DELAY_MS / 1000} с. В спеке время «перематывается» через vi.useFakeTimers(), а здесь вы увидите реальное ожидание.`,
    tools: ['async/await', 'vi.useFakeTimers()', 'vi.advanceTimersByTimeAsync()'],
    code: `it('should fetch quotes from the server asynchronously', async () => {
  vi.useFakeTimers();
  const request = service.fetchQuotesFromServer();

  await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS);

  await expect(request).resolves.toEqual(SERVER_QUOTES);
});`,
    steps: () => {
      let request: Promise<QuoteModel[]> | null = null;
      let data: QuoteModel[] = [];
      return [
        {
          phase: 'arrange',
          title: 'Запускаем запрос',
          detail: 'Промис создан, но ещё не выполнен: setTimeout внутри сервиса только запланирован.',
          run: (ctx) => {
            request = ctx.service.fetchQuotesFromServer();
            ctx.log('const request = service.fetchQuotesFromServer()');
          },
        },
        {
          phase: 'act',
          title: `Ждём ответ (${FETCH_DELAY_MS} мс)`,
          detail: 'С фейковыми таймерами этот шаг занимает 0 мс: vi.advanceTimersByTimeAsync() «перематывает» время.',
          run: async (ctx) => {
            ctx.log(`await request… (ожидание ${FETCH_DELAY_MS} мс)`);
            data = await request!;
          },
        },
        {
          phase: 'assert',
          title: 'Промис вернул список цитат',
          run: (ctx) => {
            ctx.expect(data, 'await request').toHaveLength(3);
            ctx.expect(data[0]?.author, 'data[0].author').toBe('Эдсгер Дейкстра');
          },
        },
      ];
    },
  },
  {
    id: 'component-create',
    suite: COMPONENT_SUITE,
    name: 'should create the component',
    title: 'Компонент создаётся',
    goal: 'Smoke-тест: если в компоненте сломан шаблон или не хватает зависимости, упадёт уже он.',
    tools: ['TestBed.configureTestingModule()', 'TestBed.createComponent()'],
    code: `beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [QuotesComponent],
  }).compileComponents();

  fixture = TestBed.createComponent(QuotesComponent);
  component = fixture.componentInstance;
});

it('should create the component', () => {
  expect(component).toBeTruthy();
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'TestBed.createComponent(QuotesComponent)',
          detail:
            'Компонент создаётся в изолированном инжекторе со своим QuoteService. Разметка уже построена, но привязки не применены и ngOnInit ещё не вызван.',
          run: (ctx) => {
            fixture = ctx.mount();
          },
        },
        {
          phase: 'assert',
          title: 'Экземпляр существует, ngOnInit ещё не вызывался',
          run: (ctx) => {
            ctx.expect(fixture!.component, 'component').toBeTruthy();
            ctx.expect(fixture!.component.isFetching(), 'component.isFetching()').toBe(false);
          },
        },
      ];
    },
  },
  {
    id: 'component-render',
    suite: COMPONENT_SUITE,
    name: 'should render quotes from the service',
    title: 'Показывает цитаты из сервиса',
    goal: 'Проверяем связку «сервис → шаблон»: данные, положенные в сервис, должны появиться в DOM после детекции изменений.',
    tools: ['TestBed.inject()', 'fixture.detectChanges()', 'By.css()'],
    code: `it('should render quotes from the service', () => {
  service.addNewQuote('Тест — это спецификация');

  fixture.detectChanges();

  const items = fixture.debugElement.queryAll(By.css('[data-testid="quote-item"]'));
  expect(items).toHaveLength(1);
  expect(items[0].nativeElement.textContent).toContain('Тест — это спецификация');
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Создаём компонент и кладём цитату в сервис',
          run: (ctx) => {
            fixture = ctx.mount();
            ctx.service.addNewQuote('Тест — это спецификация');
            ctx.log('service.addNewQuote("Тест — это спецификация")');
          },
        },
        {
          phase: 'act',
          title: 'fixture.detectChanges()',
          detail: 'Angular выполняет ngOnInit и отрисовывает шаблон — в песочнице появляется разметка.',
          run: () => fixture!.detectChanges(),
        },
        {
          phase: 'assert',
          title: 'В списке один элемент с нашим текстом',
          run: (ctx) => {
            const items = fixture!.queryAll('quote-item');
            ctx.expect(items, 'items').toHaveLength(1);
            ctx.expect(items[0]?.textContent, 'items[0].textContent').toContain('Тест — это спецификация');
          },
        },
      ];
    },
  },
  {
    id: 'component-disabled',
    suite: COMPONENT_SUITE,
    name: 'should disable the button when the textarea is empty',
    title: 'Кнопка неактивна при пустом поле',
    goal: 'Нельзя отправить пустую форму: проверяем атрибут disabled у реальной кнопки в DOM.',
    tools: ['fixture.detectChanges()', 'HTMLButtonElement.disabled'],
    code: `it('should disable the button when the textarea is empty', () => {
  fixture.detectChanges();

  expect(query<HTMLButtonElement>('submit-quote').disabled).toBe(true);
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Создаём компонент',
          run: (ctx) => {
            fixture = ctx.mount();
          },
        },
        {
          phase: 'act',
          title: 'fixture.detectChanges()',
          detail: 'Запускает ngOnInit и впервые рендерит шаблон. До этого вызова привязки в шаблоне не применены.',
          run: () => fixture!.detectChanges(),
        },
        {
          phase: 'assert',
          title: 'button.disabled === true',
          run: (ctx) =>
            ctx.expect(fixture!.query<HTMLButtonElement>('submit-quote').disabled, 'button.disabled').toBe(true),
        },
      ];
    },
  },
  {
    id: 'component-enabled',
    suite: COMPONENT_SUITE,
    name: 'should enable the button when the textarea is not empty',
    title: 'Кнопка активна после ввода текста',
    goal: 'Имитируем ввод пользователя: меняем value у textarea и диспатчим событие input, на которое подписан ngModel.',
    tools: ["dispatchEvent(new Event('input'))", '[(ngModel)]', 'signal()'],
    code: `const typeQuote = (text: string): void => {
  const textarea = query<HTMLTextAreaElement>('quote-input');
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  fixture.detectChanges();
};

it('should enable the button when the textarea is not empty', async () => {
  fixture.detectChanges();
  await fixture.whenStable();

  typeQuote('Я люблю тесты');

  expect(query<HTMLButtonElement>('submit-quote').disabled).toBe(false);
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Рендерим компонент и ждём whenStable()',
          detail:
            'ngModel внутри <form> регистрируется в NgForm асинхронно. Если начать печатать сразу, ввод будет проигнорирован.',
          run: async (ctx) => {
            fixture = ctx.mount();
            fixture.detectChanges();
            await ctx.whenStable();
          },
        },
        {
          phase: 'act',
          title: 'Печатаем «Я люблю тесты»',
          detail: 'Событие input обновляет сигнал quoteText, computed canSubmit пересчитывается.',
          run: (ctx) => {
            fixture!.type('quote-input', 'Я люблю тесты');
            ctx.log('textarea.value = "Я люблю тесты"; dispatchEvent(input)');
          },
        },
        {
          phase: 'assert',
          title: 'button.disabled === false',
          run: (ctx) => {
            ctx.expect(fixture!.component.quoteText(), 'component.quoteText()').toBe('Я люблю тесты');
            ctx.expect(fixture!.query<HTMLButtonElement>('submit-quote').disabled, 'button.disabled').toBe(false);
          },
        },
      ];
    },
  },
  {
    id: 'component-submit',
    suite: COMPONENT_SUITE,
    name: 'should add a quote and clear the textarea on submit',
    title: 'Отправка формы добавляет цитату и очищает поле',
    goal: 'Полный пользовательский сценарий: ввод → клик → новая цитата в списке и пустое поле ввода.',
    tools: ['element.click()', 'fixture.whenStable()'],
    code: `it('should add a quote and clear the textarea on submit', async () => {
  fixture.detectChanges();
  await fixture.whenStable();
  typeQuote('Красный, зелёный, рефакторинг');

  query<HTMLButtonElement>('submit-quote').click();
  fixture.detectChanges();
  await fixture.whenStable();

  expect(service.count()).toBe(1);
  expect(query('quote-list').textContent).toContain('Красный, зелёный, рефакторинг');
  expect(query<HTMLTextAreaElement>('quote-input').value).toBe('');
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Рендерим компонент и вводим текст',
          run: async (ctx) => {
            fixture = ctx.mount();
            fixture.detectChanges();
            await ctx.whenStable();
            fixture.type('quote-input', 'Красный, зелёный, рефакторинг');
            ctx.log('Введено: "Красный, зелёный, рефакторинг"');
          },
        },
        {
          phase: 'act',
          title: 'Кликаем «Добавить цитату»',
          detail: 'После клика ждём whenStable(): ngModel записывает новое значение в textarea асинхронно.',
          run: async (ctx) => {
            fixture!.query<HTMLButtonElement>('submit-quote').click();
            fixture!.detectChanges();
            ctx.log('button.click(); fixture.detectChanges(); await fixture.whenStable()');
            await ctx.whenStable();
            fixture!.detectChanges();
          },
        },
        {
          phase: 'assert',
          title: 'Цитата в списке, поле очищено',
          run: (ctx) => {
            ctx.expect(ctx.service.count(), 'service.count()').toBe(1);
            ctx.expect(fixture!.query('quote-list')?.textContent, 'quoteList.textContent').toContain(
              'Красный, зелёный, рефакторинг',
            );
            ctx.expect(fixture!.query<HTMLTextAreaElement>('quote-input').value, 'textarea.value').toBe('');
          },
        },
      ];
    },
  },
  {
    id: 'component-remove',
    suite: COMPONENT_SUITE,
    name: 'should remove a quote when the delete button is clicked',
    title: 'Удаление цитаты кнопкой',
    goal: 'Клик по корзине должен убрать цитату и из сервиса, и из DOM, а вместо списка показать пустое состояние.',
    tools: ['element.click()', 'fixture.detectChanges()'],
    code: `it('should remove a quote when the delete button is clicked', () => {
  service.addNewQuote('Удали меня');
  fixture.detectChanges();

  query<HTMLButtonElement>('remove-quote').click();
  fixture.detectChanges();

  expect(service.count()).toBe(0);
  expect(query('quotes-empty')).toBeTruthy();
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      return [
        {
          phase: 'arrange',
          title: 'Рендерим компонент с одной цитатой',
          run: (ctx) => {
            fixture = ctx.mount();
            ctx.service.addNewQuote('Удали меня');
            fixture.detectChanges();
          },
        },
        {
          phase: 'act',
          title: 'Кликаем по кнопке удаления',
          run: (ctx) => {
            fixture!.query<HTMLButtonElement>('remove-quote').click();
            fixture!.detectChanges();
            ctx.log('removeButton.click(); fixture.detectChanges()');
          },
        },
        {
          phase: 'assert',
          title: 'Список пуст, показан плейсхолдер',
          run: (ctx) => {
            ctx.expect(ctx.service.count(), 'service.count()').toBe(0);
            ctx.expect(fixture!.query('quotes-empty'), 'emptyState').toBeTruthy();
          },
        },
      ];
    },
  },
  {
    id: 'component-fetch',
    suite: COMPONENT_SUITE,
    name: 'should fetch data asynchronously',
    title: 'Загружает данные асинхронно (spy)',
    goal: 'Подменяем «сетевой» метод шпионом, чтобы тест не ждал 2 секунды и не зависел от сервера. Проверяем вызов и отрисовку.',
    tools: ['vi.spyOn()', 'mockResolvedValue()', 'toHaveBeenCalledTimes()', 'fixture.whenStable()'],
    code: `it('should fetch data asynchronously', async () => {
  const fakeList: QuoteModel[] = [{ id: 42, text: 'Я люблю юнит-тесты', createdAt: new Date() }];
  const spy = vi.spyOn(service, 'fetchQuotesFromServer').mockResolvedValue(fakeList);

  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  expect(spy).toHaveBeenCalledTimes(1);
  expect(component.fetchedList()).toEqual(fakeList);
  expect(query('fetched-list').textContent).toContain('Я люблю юнит-тесты');
});`,
    steps: () => {
      let fixture: LabFixture | null = null;
      let calls = 0;
      const fakeList: QuoteModel[] = [{ id: 42, text: 'Я люблю юнит-тесты', createdAt: new Date() }];
      return [
        {
          phase: 'arrange',
          title: 'Подменяем fetchQuotesFromServer шпионом',
          detail: 'Шпион считает вызовы и сразу возвращает подготовленные данные вместо ожидания «сервера».',
          run: (ctx) => {
            ctx.service.fetchQuotesFromServer = () => {
              calls++;
              return Promise.resolve(fakeList);
            };
            ctx.log('vi.spyOn(service, "fetchQuotesFromServer").mockResolvedValue(fakeList)');
            fixture = ctx.mount();
          },
        },
        {
          phase: 'act',
          title: 'detectChanges() → ngOnInit → await whenStable()',
          run: async (ctx) => {
            fixture!.detectChanges();
            ctx.log('ngOnInit вызвал fetchQuotesFromServer(), ждём выполнения промиса');
            await ctx.whenStable();
            fixture!.detectChanges();
          },
        },
        {
          phase: 'assert',
          title: 'Шпион вызван один раз, данные отрисованы',
          run: (ctx) => {
            ctx.expect(calls, 'spy.calls').toBe(1);
            ctx.expect(fixture!.component.fetchedList(), 'component.fetchedList()').toEqual(fakeList);
            ctx.expect(fixture!.query('fetched-list')?.textContent, 'fetchedList.textContent').toContain(
              'Я люблю юнит-тесты',
            );
          },
        },
      ];
    },
  },
];
