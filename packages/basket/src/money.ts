export type Cents = number;

export function assertCents(value: number, label = "value"): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
  return value;
}

/** `percent` percent of `amount`, rounded down, using integer operations only. */
export function percentOfFloor(amount: Cents, percent: number): Cents {
  assertCents(amount, "amount");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`percent must be an integer from 0 to 100, got ${percent}`);
  }
  const scaled = amount * percent;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`amount ${amount} is too large to take ${percent}% of exactly`);
  }
  return (scaled - (scaled % 100)) / 100;
}

export function formatCents(value: Cents, currency = "USD", locale = "en-US"): string {
  assertCents(value);
  const units = (value - (value % 100)) / 100;
  const minor = value % 100;
  const minorDigits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
  if (minorDigits !== 2) {
    throw new RangeError(`${currency} does not have 2 minor digits, so it cannot be formatted from cents`);
  }
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  // Format the whole units as a BigInt (always ".00"), then splice in the exact minor digits,
  // so no fractional number is ever created.
  return formatter
    .formatToParts(BigInt(units))
    .map((part) => (part.type === "fraction" ? String(minor).padStart(2, "0") : part.value))
    .join("");
}
