import {
  ComponentRef,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  computed,
  createComponent,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { QuotesComponent } from '../quotes/quotes.component';
import { QuoteService } from '../quotes/service/quote.service';
import { BuggyQuoteService } from './buggy-quote.service';
import { LabAssertionError, LabLogKind, createExpect } from './lab-expect';
import { LAB_SCENARIOS, LabContext, LabFixture, LabPhase, LabScenario, PHASE_LABELS } from './lab-scenarios';

export type LabStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'skipped';

export type LabSpeed = 'slow' | 'normal' | 'instant';

export const SPEED_DELAYS: Record<LabSpeed, number> = {
  slow: 1200,
  normal: 450,
  instant: 0,
};

export interface LabStepView {
  readonly phase: LabPhase;
  readonly title: string;
  readonly detail?: string;
}

export interface LabScenarioView {
  readonly scenario: LabScenario;
  readonly steps: readonly LabStepView[];
}

export interface LabError {
  readonly message: string;
  readonly expected?: string;
  readonly received?: string;
}

export interface LabScenarioState {
  readonly status: LabStatus;
  readonly steps: readonly LabStatus[];
  readonly durationMs?: number;
  readonly error?: LabError;
}

export interface LabLogEntry {
  readonly id: number;
  readonly at: number;
  readonly kind: LabLogKind;
  readonly text: string;
}

export type LabSandboxMode = 'empty' | 'service' | 'component';

class LabCancelled extends Error {}

const MAX_LOG_ENTRIES = 400;

@Injectable()
export class TestLabRunner {
  private readonly parentInjector = inject(EnvironmentInjector);

  readonly views: readonly LabScenarioView[] = LAB_SCENARIOS.map((scenario) => ({
    scenario,
    steps: scenario.steps().map(({ phase, title, detail }) => ({ phase, title, detail })),
  }));

  readonly speed = signal<LabSpeed>('normal');
  readonly injectBug = signal(false);
  readonly isRunning = signal(false);
  readonly activeId = signal<string | null>(null);
  readonly sandboxMode = signal<LabSandboxMode>('empty');
  readonly states = signal<Record<string, LabScenarioState>>(this.initialStates());
  readonly logs = signal<readonly LabLogEntry[]>([]);
  readonly totalDurationMs = signal(0);

  readonly summary = computed(() => {
    const states = Object.values(this.states());
    const passed = states.filter((s) => s.status === 'passed').length;
    const failed = states.filter((s) => s.status === 'failed').length;
    const total = states.length;
    const done = passed + failed;
    return { total, passed, failed, done, progress: total ? Math.round((done / total) * 100) : 0 };
  });

  private sandbox: HTMLElement | null = null;
  private disposeCurrent: (() => void) | null = null;
  private cancelRequested = false;
  private logId = 0;
  private runStartedAt = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  attachSandbox(element: HTMLElement): void {
    this.sandbox = element;
  }

  async runAll(): Promise<void> {
    await this.run(LAB_SCENARIOS);
  }

  async runOne(id: string): Promise<void> {
    const scenario = LAB_SCENARIOS.find((s) => s.id === id);
    if (scenario) {
      await this.run([scenario]);
    }
  }

  stop(): void {
    if (this.isRunning()) {
      this.cancelRequested = true;
    }
  }

  reset(): void {
    if (this.isRunning()) {
      return;
    }
    this.dispose();
    this.states.set(this.initialStates());
    this.logs.set([]);
    this.activeId.set(null);
    this.sandboxMode.set('empty');
    this.totalDurationMs.set(0);
  }

  clearLog(): void {
    this.logs.set([]);
  }

  private async run(scenarios: readonly LabScenario[]): Promise<void> {
    if (this.isRunning()) {
      return;
    }
    this.isRunning.set(true);
    this.cancelRequested = false;
    this.runStartedAt = performance.now();
    this.logs.set([]);
    this.patchStates(scenarios.map((s) => s.id), { status: 'queued' });
    this.log(
      `Запуск ${scenarios.length === 1 ? '1 теста' : `${scenarios.length} тестов`}` +
        (this.injectBug() ? ' — в QuoteService внесён баг' : ''),
      'summary',
    );

    try {
      for (const scenario of scenarios) {
        await this.execute(scenario);
      }
    } catch (error) {
      if (!(error instanceof LabCancelled)) {
        throw error;
      }
      this.patchStates(
        scenarios.filter((s) => this.states()[s.id].status === 'queued').map((s) => s.id),
        { status: 'idle' },
      );
      this.log('Запуск остановлен пользователем', 'summary');
    } finally {
      const total = Math.round(performance.now() - this.runStartedAt);
      this.totalDurationMs.set(total);
      const { passed, failed } = this.summaryFor(scenarios);
      this.log(`Итог: ${passed} пройдено, ${failed} упало за ${total} мс`, 'summary');
      this.activeId.set(null);
      this.isRunning.set(false);
    }
  }

  private async execute(scenario: LabScenario): Promise<void> {
    this.dispose();
    const steps = scenario.steps();
    const stepStatuses: LabStatus[] = steps.map(() => 'queued');
    const startedAt = performance.now();
    const setState = (patch: Partial<LabScenarioState>) =>
      this.states.update((all) => ({
        ...all,
        [scenario.id]: { ...all[scenario.id], steps: [...stepStatuses], ...patch },
      }));

    this.activeId.set(scenario.id);
    this.sandboxMode.set(scenario.suite.name === 'QuoteService' ? 'service' : 'empty');
    setState({ status: 'running', error: undefined, durationMs: undefined });
    this.log(`describe('${scenario.suite.name}') › it('${scenario.name}')`, 'suite');

    const ctx = this.createContext();

    for (const [index, step] of steps.entries()) {
      this.throwIfCancelled();
      stepStatuses[index] = 'running';
      setState({});
      this.log(`${PHASE_LABELS[step.phase]}: ${step.title}`, 'phase');
      await this.pause();
      this.throwIfCancelled();

      try {
        await step.run(ctx);
        stepStatuses[index] = 'passed';
        setState({});
      } catch (error) {
        stepStatuses[index] = 'failed';
        for (let rest = index + 1; rest < steps.length; rest++) {
          stepStatuses[rest] = 'skipped';
        }
        const durationMs = Math.round(performance.now() - startedAt);
        setState({ status: 'failed', durationMs, error: this.toLabError(error) });
        if (!(error instanceof LabAssertionError)) {
          this.log(`✗ Исключение: ${this.toLabError(error).message}`, 'fail');
        }
        this.log(`Тест упал за ${durationMs} мс`, 'fail');
        await this.pause();
        return;
      }
    }

    const durationMs = Math.round(performance.now() - startedAt);
    setState({ status: 'passed', durationMs });
    this.log(`Тест пройден за ${durationMs} мс`, 'pass');
    await this.pause();
  }

  private createContext(): LabContext {
    const injector = createEnvironmentInjector(
      [{ provide: QuoteService, useClass: this.injectBug() ? BuggyQuoteService : QuoteService }],
      this.parentInjector,
      'TestLab',
    );
    let componentRef: ComponentRef<QuotesComponent> | null = null;

    this.disposeCurrent = () => {
      componentRef?.destroy();
      injector.destroy();
    };

    return {
      service: injector.get(QuoteService),
      expect: createExpect((text, kind) => this.log(text, kind)),
      log: (text) => this.log(text, 'info'),
      whenStable: () => new Promise((resolve) => setTimeout(resolve)),
      mount: () => {
        const host = document.createElement('app-quotes');
        this.sandbox?.replaceChildren(host);
        componentRef = createComponent(QuotesComponent, { environmentInjector: injector, hostElement: host });
        this.sandboxMode.set('component');
        this.log('TestBed.createComponent(QuotesComponent) — компонент создан, привязки ещё не применены', 'info');
        return this.createFixture(componentRef, host);
      },
    };
  }

  private createFixture(ref: ComponentRef<QuotesComponent>, host: HTMLElement): LabFixture {
    const query = <T extends Element = HTMLElement>(testId: string) =>
      host.querySelector(`[data-testid="${testId}"]`) as T;
    return {
      component: ref.instance,
      element: host,
      detectChanges: () => {
        ref.changeDetectorRef.detectChanges();
        this.log('fixture.detectChanges() — шаблон синхронизирован с состоянием', 'info');
      },
      query,
      queryAll: (testId) => Array.from(host.querySelectorAll(`[data-testid="${testId}"]`)),
      type: (testId, text) => {
        const field = query<HTMLTextAreaElement>(testId);
        field.value = text;
        field.dispatchEvent(new Event('input'));
        ref.changeDetectorRef.detectChanges();
      },
    };
  }

  private dispose(): void {
    this.disposeCurrent?.();
    this.disposeCurrent = null;
    this.sandbox?.replaceChildren();
  }

  private pause(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, SPEED_DELAYS[this.speed()]));
  }

  private throwIfCancelled(): void {
    if (this.cancelRequested) {
      throw new LabCancelled();
    }
  }

  private log(text: string, kind: LabLogKind): void {
    const entry: LabLogEntry = {
      id: ++this.logId,
      at: Math.round(performance.now() - this.runStartedAt),
      kind,
      text,
    };
    this.logs.update((logs) => [...logs, entry].slice(-MAX_LOG_ENTRIES));
  }

  private toLabError(error: unknown): LabError {
    if (error instanceof LabAssertionError) {
      return { message: error.message, expected: error.expected, received: error.received };
    }
    return { message: error instanceof Error ? error.message : String(error) };
  }

  private summaryFor(scenarios: readonly LabScenario[]): { passed: number; failed: number } {
    const states = this.states();
    return {
      passed: scenarios.filter((s) => states[s.id].status === 'passed').length,
      failed: scenarios.filter((s) => states[s.id].status === 'failed').length,
    };
  }

  private patchStates(ids: readonly string[], patch: Partial<LabScenarioState>): void {
    this.states.update((all) => {
      const next = { ...all };
      for (const id of ids) {
        const steps = this.views.find((v) => v.scenario.id === id)!.steps.map((): LabStatus => 'idle');
        next[id] = { ...next[id], steps, error: undefined, durationMs: undefined, ...patch };
      }
      return next;
    });
  }

  private initialStates(): Record<string, LabScenarioState> {
    return Object.fromEntries(
      LAB_SCENARIOS.map((s) => [s.id, { status: 'idle' as LabStatus, steps: s.steps().map((): LabStatus => 'idle') }]),
    );
  }
}
