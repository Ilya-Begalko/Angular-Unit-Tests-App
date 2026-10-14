import { TestBed } from '@angular/core/testing';
import { TestLabRunner } from './test-lab-runner.service';

describe('TestLabRunner', () => {
  let runner: TestLabRunner;
  let sandbox: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestLabRunner] });
    runner = TestBed.inject(TestLabRunner);
    runner.speed.set('instant');
    // Форма отправляется по клику, только если подключена к документу.
    sandbox = document.body.appendChild(document.createElement('div'));
    runner.attachSandbox(sandbox);
  });

  afterEach(() => {
    sandbox.remove();
  });

  it('should pass every lab scenario against the real QuoteService', async () => {
    await runner.runAll();

    const { total, passed, failed } = runner.summary();
    expect(failed).toBe(0);
    expect(passed).toBe(total);
  });

  it('should catch the regressions introduced by the buggy service', async () => {
    runner.injectBug.set(true);

    await runner.runAll();

    const failedIds = Object.entries(runner.states())
      .filter(([, state]) => state.status === 'failed')
      .map(([id]) => id);
    expect(failedIds).toEqual(['service-empty', 'service-remove', 'component-remove']);
  });
});
