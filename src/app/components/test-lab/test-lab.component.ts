import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { COMPONENT_SUITE, LabSuite, PHASE_LABELS, SERVICE_SUITE } from './lab-scenarios';
import { LabScenarioView, LabSpeed, LabStatus, TestLabRunner } from './test-lab-runner.service';

interface SuiteGroup {
  readonly suite: LabSuite;
  readonly views: readonly LabScenarioView[];
}

const STATUS_META: Record<LabStatus, { label: string; icon: string }> = {
  idle: { label: 'Не запускался', icon: 'pi-circle' },
  queued: { label: 'В очереди', icon: 'pi-clock' },
  running: { label: 'Выполняется', icon: 'pi-spin pi-spinner' },
  passed: { label: 'Пройден', icon: 'pi-check' },
  failed: { label: 'Упал', icon: 'pi-times' },
  skipped: { label: 'Пропущен', icon: 'pi-minus' },
};

@Component({
  selector: 'app-test-lab',
  templateUrl: './test-lab.component.html',
  styleUrl: './test-lab.component.css',
  providers: [TestLabRunner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestLabComponent {
  readonly runner = inject(TestLabRunner);

  readonly phaseLabels = PHASE_LABELS;
  readonly statusMeta = STATUS_META;
  readonly speeds: readonly { value: LabSpeed; label: string; hint: string }[] = [
    { value: 'slow', label: 'Медленно', hint: '1,2 с на шаг' },
    { value: 'normal', label: 'Обычно', hint: '0,45 с на шаг' },
    { value: 'instant', label: 'Мгновенно', hint: 'как в CI' },
  ];

  readonly groups: readonly SuiteGroup[] = [SERVICE_SUITE, COMPONENT_SUITE].map((suite) => ({
    suite,
    views: this.runner.views.filter((view) => view.scenario.suite === suite),
  }));

  readonly expanded = signal<ReadonlySet<string>>(new Set([this.runner.views[0].scenario.id]));
  readonly activeTitle = computed(() => {
    const id = this.runner.activeId();
    return id ? this.runner.views.find((v) => v.scenario.id === id)?.scenario.title : null;
  });

  private readonly sandbox = viewChild.required<ElementRef<HTMLElement>>('sandbox');
  private readonly logList = viewChild.required<ElementRef<HTMLElement>>('logList');

  constructor() {
    afterNextRender(() => this.runner.attachSandbox(this.sandbox().nativeElement));

    effect(() => {
      const id = this.runner.activeId();
      if (id) {
        untracked(() => this.expanded.update((set) => new Set(set).add(id)));
      }
    });

    afterRenderEffect(() => {
      this.runner.logs();
      const list = this.logList().nativeElement;
      list.scrollTop = list.scrollHeight;
    });
  }

  isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  toggle(id: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  setExpandedAll(open: boolean): void {
    this.expanded.set(new Set(open ? this.runner.views.map((v) => v.scenario.id) : []));
  }

  suiteStats(group: SuiteGroup): { passed: number; failed: number; total: number } {
    const states = this.runner.states();
    return {
      passed: group.views.filter((v) => states[v.scenario.id].status === 'passed').length,
      failed: group.views.filter((v) => states[v.scenario.id].status === 'failed').length,
      total: group.views.length,
    };
  }
}
