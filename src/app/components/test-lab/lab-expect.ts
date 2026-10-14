export type LabLogKind = 'suite' | 'info' | 'phase' | 'wait' | 'pass' | 'fail' | 'summary';

export type LabLogger = (text: string, kind: LabLogKind) => void;

export class LabAssertionError extends Error {
  constructor(
    message: string,
    readonly expected: string,
    readonly received: string,
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

export interface LabMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeNull(): void;
  toContain(expected: string): void;
  toHaveLength(expected: number): void;
}

export type LabExpect = (actual: unknown, label: string) => LabMatchers;

const MAX_VALUE_LENGTH = 80;
const MAX_ARGUMENT_LENGTH = 32;

export function formatValue(value: unknown, maxLength = MAX_VALUE_LENGTH): string {
  let text: string;
  if (typeof value === 'string') {
    text = `"${value}"`;
  } else if (value === undefined) {
    text = 'undefined';
  } else if (typeof Element !== 'undefined' && value instanceof Element) {
    text = `<${value.tagName.toLowerCase()}>`;
  } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const proto = Object.getPrototypeOf(value);
    text = proto && proto !== Object.prototype && !(value instanceof Date) ? 'экземпляр класса' : safeJson(value);
  } else {
    text = safeJson(value);
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function lengthOf(value: unknown): number | undefined {
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length;
  }
  return undefined;
}

export function createExpect(log: LabLogger): LabExpect {
  return (actual, label) => {
    const verify = (matcher: string, passed: boolean, expected: string, received = formatValue(actual)) => {
      const call = `expect(${label}).${matcher}`;
      if (!passed) {
        log(`✗ ${call} — получено ${received}`, 'fail');
        throw new LabAssertionError(call, expected, received);
      }
      log(`✓ ${call} — получено ${received}`, 'pass');
    };

    return {
      toBe: (expected) =>
        verify(`toBe(${formatValue(expected, MAX_ARGUMENT_LENGTH)})`, Object.is(actual, expected), formatValue(expected)),
      toEqual: (expected) =>
        verify(
          `toEqual(${formatValue(expected, MAX_ARGUMENT_LENGTH)})`,
          safeJson(actual) === safeJson(expected),
          formatValue(expected),
        ),
      toBeTruthy: () => verify('toBeTruthy()', Boolean(actual), 'истинное значение'),
      toBeNull: () => verify('toBeNull()', actual === null, 'null'),
      toContain: (expected) =>
        verify(
          `toContain(${formatValue(expected, MAX_ARGUMENT_LENGTH)})`,
          typeof actual === 'string' && actual.includes(expected),
          `строка, содержащая ${formatValue(expected)}`,
        ),
      toHaveLength: (expected) => {
        const length = lengthOf(actual);
        verify(`toHaveLength(${expected})`, length === expected, `длина ${expected}`, `длина ${length ?? '—'}`);
      },
    };
  };
}
