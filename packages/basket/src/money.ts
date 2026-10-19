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
  return (scaled - (scaled % 100)) / 100;
}

export function formatCents(value: Cents, currency = "USD", locale = "en-US"): string {
  assertCents(value);
  const units = (value - (value % 100)) / 100;
  const minor = value % 100;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Format the whole units as a BigInt (always ".00"), then splice in the exact minor digits,
  // so no fractional number is ever created.
  return formatter
    .formatToParts(BigInt(units))
    .map((part) => (part.type === "fraction" ? String(minor).padStart(2, "0") : part.value))
    .join("");
}
