import { ChangeDetectionStrategy, Component } from '@angular/core';

interface TestKind {
  readonly icon: string;
  readonly title: string;
  readonly scope: string;
  readonly text: string;
  readonly example: string;
  readonly speed: string;
}

interface PipelineStep {
  readonly title: string;
  readonly text: string;
  readonly code?: string;
}

interface ApiEntry {
  readonly name: string;
  readonly text: string;
}

@Component({
  selector: 'app-testing-guide',
  templateUrl: './testing-guide.component.html',
  styleUrl: './testing-guide.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestingGuideComponent {
  readonly kinds: readonly TestKind[] = [
    {
      icon: 'pi-cog',
      title: 'Юнит-тесты',
      scope: 'Один класс или функция',
      text: 'Проверяют логику в изоляции: без DOM, сети и Angular. Сервис создаётся через new и тестируется как обычный TypeScript-класс.',
      example: 'quote.service.spec.ts',
      speed: '≈ 1 мс на тест',
    },
    {
      icon: 'pi-th-large',
      title: 'Компонентные тесты',
      scope: 'Компонент + шаблон + DI',
      text: 'TestBed собирает компонент с зависимостями, рендерит шаблон в jsdom, а тест кликает и печатает как пользователь.',
      example: 'quotes.component.spec.ts',
      speed: '≈ 10–50 мс на тест',
    },
    {
      icon: 'pi-globe',
      title: 'E2E-тесты',
      scope: 'Всё приложение в браузере',
      text: 'Проверяют пользовательский путь целиком в реальном браузере (Playwright, Cypress). В этом проекте их нет — фокус на юнит-уровне.',
      example: 'не входят в проект',
      speed: 'секунды на тест',
    },
  ];

  readonly pipeline: readonly PipelineStep[] = [
    {
      title: 'CLI находит спеки',
      text: 'Билдер @angular/build:unit-test собирает все *.spec.ts вместе с шаблонами и стилями компонентов через esbuild.',
      code: 'npm test',
    },
    {
      title: 'Vitest поднимает окружение',
      text: 'Тесты выполняются в Node.js, а jsdom эмулирует браузерный DOM: document, события, querySelector.',
    },
    {
      title: 'beforeEach готовит «мини-приложение»',
      text: 'TestBed.configureTestingModule() описывает, какие компоненты и провайдеры нужны. Каждый тест получает свежий TestBed.',
      code: 'TestBed.configureTestingModule({ imports: [QuotesComponent] })',
    },
    {
      title: 'Создаётся компонент и fixture',
      text: 'ComponentFixture — пульт управления: доступ к экземпляру, DOM и запуску детекции изменений.',
      code: 'fixture = TestBed.createComponent(QuotesComponent)',
    },
    {
      title: 'detectChanges() рендерит шаблон',
      text: 'Вызываются ngOnInit и другие хуки, шаблон синхронизируется с состоянием. Без этого вызова DOM не обновится.',
      code: 'fixture.detectChanges()',
    },
    {
      title: 'Тест действует и проверяет',
      text: 'Кликаем, вводим текст, ждём промисы, а затем сравниваем фактический результат с ожидаемым через expect().',
      code: "expect(button.disabled).toBe(true)",
    },
    {
      title: 'Отчёт',
      text: 'Vitest выводит зелёные и красные тесты с diff «ожидали / получили». С флагом --coverage строится отчёт о покрытии.',
      code: 'npm run test:coverage',
    },
  ];

  readonly aaaExample = `it('should enable the button when the textarea is not empty', async () => {
  // Arrange — подготовка: рендерим компонент и ждём регистрации ngModel
  fixture.detectChanges();
  await fixture.whenStable();

  // Act — действие: пользователь печатает текст
  typeQuote('Я люблю тесты');

  // Assert — проверка: кнопка стала активной
  expect(query<HTMLButtonElement>('submit-quote').disabled).toBe(false);
});`;

  readonly api: readonly ApiEntry[] = [
    { name: 'describe() / it()', text: 'Группа тестов и отдельный тест-кейс. Название it() читается как требование.' },
    { name: 'beforeEach()', text: 'Код, который выполняется перед каждым тестом, — гарантирует изоляцию.' },
    { name: 'TestBed', text: 'Тестовое окружение Angular: DI, компиляция шаблонов, создание компонентов.' },
    { name: 'ComponentFixture', text: 'Обёртка над компонентом: componentInstance, nativeElement, debugElement.' },
    { name: 'fixture.detectChanges()', text: 'Ручной запуск детекции изменений — DOM догоняет состояние.' },
    { name: 'fixture.whenStable()', text: 'Промис, который выполняется, когда завершены асинхронные задачи.' },
    { name: 'By.css()', text: 'Предикат для поиска элементов через debugElement.query().' },
    { name: 'vi.spyOn()', text: 'Шпион: подменяет метод, считает вызовы и возвращает заготовленный ответ.' },
    { name: 'vi.useFakeTimers()', text: 'Фейковые таймеры: setTimeout «перематывается» без реального ожидания.' },
  ];
}
