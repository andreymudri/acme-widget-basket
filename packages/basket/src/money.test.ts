import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("formats other two-digit currencies", () => {
    expect(formatCents(3785, "EUR")).toBe("€37.85");
    expect(formatCents(3785, "USD")).toBe("$37.85");
  });

  it.each(["JPY", "KWD"])("rejects %s, whose minor unit is not cents", (currency) => {
    expect(() => formatCents(3785, currency)).toThrow(RangeError);
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

  it("refuses amounts whose scaled product leaves the safe-integer range", () => {
    expect(() => percentOfFloor(Number.MAX_SAFE_INTEGER, 50)).toThrow(RangeError);
  });

  it("always returns a safe integer for prices 0..5000 and percents 0..100", () => {
    for (let amount = 0; amount <= 5000; amount++) {
      for (let percent = 0; percent <= 100; percent++) {
        const result = percentOfFloor(amount, percent);
        if (!Number.isSafeInteger(result)) {
          expect.fail(`percentOfFloor(${amount}, ${percent}) = ${result}`);
        }
      }
    }
  });
});

describe("integer-only source", () => {
  const srcDir = join(fileURLToPath(import.meta.url), "..");
  const sources = readdirSync(srcDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => [name, readFileSync(join(srcDir, name), "utf8")] as const);

  // Comments and string contents are not arithmetic, so drop them before scanning.
  const codeOnly = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');

  it("scans the package sources", () => {
    expect(sources.map(([name]) => name)).toEqual(expect.arrayContaining(["money.ts", "offers.ts"]));
  });

  it.each([
    ["Math.floor(", /Math\.floor\(/],
    ["Math.round(", /Math\.round\(/],
    ["Math.ceil(", /Math\.ceil\(/],
    ["Math.trunc(", /Math\.trunc\(/],
    ["toFixed(", /toFixed\(/],
    ["parseFloat(", /parseFloat\(/],
    ["a float literal", /\b\d+\.\d+\b/],
  ])("uses no %s", (_label, pattern) => {
    const offenders = sources.filter(([, source]) => pattern.test(codeOnly(source))).map(([name]) => name);
    expect(offenders).toEqual([]);
  });

  it("divides only in the integer-floor form (x - (x % d)) / d", () => {
    const floorDivision = /\((\w+) - \(\1 % (\w+)\)\) \/ \2\b/g;
    const offenders = sources
      .filter(([, source]) => codeOnly(source).replace(floorDivision, "").includes("/"))
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });
});
