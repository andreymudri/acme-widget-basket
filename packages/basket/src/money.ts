export type Cents = number;

export function assertCents(value: number, label = "value"): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
  return value;
}

export function formatCents(value: Cents, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value / 100);
}
