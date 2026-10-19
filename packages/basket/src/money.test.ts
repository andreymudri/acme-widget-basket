import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCents, formatCents, percentOfFloor } from "./money";

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

  it("formats whole dollars and large amounts exactly", () => {
    expect(formatCents(100)).toBe("$1.00");
    expect(formatCents(123456789)).toBe("$1,234,567.89");
  });

  it("rejects values that are not cents", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
    expect(() => formatCents(-1)).toThrow(RangeError);
  });

  describe("without fractional numbers", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("never hands a non-integer number to Intl", () => {
      const args: unknown[] = [];
      const RealNumberFormat = Intl.NumberFormat;
      vi.spyOn(Intl, "NumberFormat").mockImplementation(function (
        locales?: Intl.LocalesArgument,
        options?: Intl.NumberFormatOptions,
      ) {
        const real = new RealNumberFormat(locales, options);
        return {
          format: (value: unknown) => {
            args.push(value);
            return real.format(value as number);
          },
          formatToParts: (value: unknown) => {
            args.push(value);
            return real.formatToParts(value as number);
          },
          resolvedOptions: () => real.resolvedOptions(),
        } as unknown as Intl.NumberFormat;
      });
      expect(formatCents(3785)).toBe("$37.85");
      expect(formatCents(5)).toBe("$0.05");
      expect(args.length).toBeGreaterThan(0);
      for (const arg of args) {
        if (typeof arg === "number") expect(Number.isInteger(arg)).toBe(true);
      }
    });
  });
});

describe("percentOfFloor", () => {
  it.each([
    [3295, 50, 1647],
    [3295, 100, 3295],
    [3295, 0, 0],
    [1, 50, 0],
    [199, 50, 99],
  ])("takes %i cents at %i percent as %i", (amount, percent, expected) => {
    expect(percentOfFloor(amount, percent)).toBe(expected);
  });

  it.each([12.5, -1, 101])("rejects %d as percent", (percent) => {
    expect(() => percentOfFloor(3295, percent)).toThrow(RangeError);
  });

  it("rejects an amount that is not cents", () => {
    expect(() => percentOfFloor(1.5, 50)).toThrow(RangeError);
  });
});
