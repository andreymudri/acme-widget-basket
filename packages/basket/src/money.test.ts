import { describe, expect, it } from "vitest";
import { assertCents, formatCents } from "./money";

describe("assertCents", () => {
  it("returns non-negative safe integers unchanged", () => {
    expect(assertCents(0)).toBe(0);
    expect(assertCents(3295)).toBe(3295);
    expect(assertCents(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects %s with a RangeError",
    (value) => {
      expect(() => assertCents(value)).toThrow(RangeError);
    },
  );

  it("includes the label in the error message", () => {
    expect(() => assertCents(-5, "price of R01")).toThrow(/price of R01/);
  });
});

describe("formatCents", () => {
  it("formats cents as US dollars by default", () => {
    expect(formatCents(3785)).toBe("$37.85");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(11475)).toBe("$114.75");
  });

  it("keeps sub-dollar amounts", () => {
    expect(formatCents(5)).toBe("$0.05");
  });
});
