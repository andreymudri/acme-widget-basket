import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
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

type Rule =
  | "Math.floor("
  | "Math.round("
  | "Math.ceil("
  | "Math.trunc("
  | "toFixed("
  | "parseFloat("
  | "a float literal"
  | "a division";

const rules: readonly Rule[] = [
  "Math.floor(",
  "Math.round(",
  "Math.ceil(",
  "Math.trunc(",
  "toFixed(",
  "parseFloat(",
  "a float literal",
];

interface Violation {
  file: string;
  line: number;
  rule: Rule;
}

interface Token {
  kind: "number" | "ident" | "punct";
  text: string;
  pos: number;
}

const jsxOpeners = new Set(["return", "yield", "await", "default", "case", "else", "do", "in", "of", "throw"]);

// A small tokenizer: TypeScript 7 no longer ships the JS compiler API. It keeps only code tokens,
// descending into template `${...}` spans and JSX `{...}` expressions, and drops strings,
// comments, template text and JSX text. Regex literals are not recognised, so a `/` in one is
// reported as a division; anything it cannot close throws rather than passing silently.
function tokenize(fileName: string, source: string): Token[] {
  const tokens: Token[] = [];
  const jsx = fileName.endsWith(".tsx");
  let pos = 0;
  const at = (offset = 0): string => source.charAt(pos + offset);
  const fail = (what: string): never => {
    throw new Error(`${fileName}: unterminated ${what} at offset ${pos}`);
  };

  const skipQuoted = (quote: string): void => {
    pos++;
    while (at() !== quote) {
      if (pos >= source.length || (at() === "\n" && quote !== "`")) fail("string");
      pos += at() === "\\" ? 2 : 1;
    }
    pos++;
  };

  const startsJsx = (): boolean => {
    if (!jsx || at() !== "<" || !/[A-Za-z>]/.test(at(1))) return false;
    const prev = tokens[tokens.length - 1];
    if (prev === undefined) return true;
    if (prev.kind === "punct") return !")]}".includes(prev.text);
    return prev.kind === "ident" && jsxOpeners.has(prev.text);
  };

  // Scans code until the end of input or, when `inBraces`, the `}` that closes the span.
  const scanCode = (inBraces: boolean): void => {
    let depth = 0;
    while (pos < source.length) {
      const c = at();
      if (/\s/.test(c)) pos++;
      else if (c === "/" && at(1) === "/") {
        const end = source.indexOf("\n", pos);
        pos = end === -1 ? source.length : end;
      } else if (c === "/" && at(1) === "*") {
        const end = source.indexOf("*/", pos + 2);
        if (end === -1) fail("comment");
        pos = end + 2;
      } else if (c === '"' || c === "'") skipQuoted(c);
      else if (c === "`") scanTemplate();
      else if (startsJsx()) scanJsxElement();
      else if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(at(1)))) {
        const match = /^(?:0[xXbBoO][0-9a-fA-F_]+|[0-9_]*\.?[0-9_]*(?:[eE][+-]?[0-9_]+)?)n?/.exec(source.slice(pos));
        const text = match?.[0] || c;
        tokens.push({ kind: "number", text, pos });
        pos += text.length;
      } else if (/[A-Za-z_$]/.test(c)) {
        const text = /^[\w$]+/.exec(source.slice(pos))?.[0] ?? c;
        tokens.push({ kind: "ident", text, pos });
        pos += text.length;
      } else {
        if (c === "}" && inBraces && depth === 0) {
          pos++;
          return;
        }
        if (c === "{") depth++;
        if (c === "}") depth--;
        const text = c === "/" && at(1) === "=" ? "/=" : c;
        tokens.push({ kind: "punct", text, pos });
        pos += text.length;
      }
    }
    if (inBraces) fail("expression");
  };

  const scanTemplate = (): void => {
    pos++;
    while (at() !== "`") {
      if (pos >= source.length) fail("template literal");
      if (at() === "\\") pos += 2;
      else if (at() === "$" && at(1) === "{") {
        pos += 2;
        scanCode(true);
      } else pos++;
    }
    pos++;
  };

  // Called on `<`; consumes one element including its children and closing tag.
  const scanJsxElement = (): void => {
    pos++;
    for (;;) {
      if (pos >= source.length) fail("JSX tag");
      const c = at();
      if (c === "/" && at(1) === ">") {
        pos += 2;
        return;
      }
      if (c === ">") {
        pos++;
        break;
      }
      if (c === '"' || c === "'") skipQuoted(c);
      else if (c === "{") {
        pos++;
        scanCode(true);
      } else if (c === "<") scanJsxElement();
      else pos++;
    }
    for (;;) {
      if (pos >= source.length) fail("JSX element");
      const c = at();
      if (c === "<" && at(1) === "/") {
        const end = source.indexOf(">", pos);
        if (end === -1) fail("JSX closing tag");
        pos = end + 1;
        return;
      }
      if (c === "<") scanJsxElement();
      else if (c === "{") {
        pos++;
        scanCode(true);
      } else pos++;
    }
  };

  scanCode(false);
  return tokens;
}

const isOperand = (token: Token | undefined): token is Token =>
  token !== undefined && (token.kind === "ident" || token.kind === "number");

// Matches `( x - ( x % d ) ) / d` ending at the `/` token at index `i`.
function isFloorDivision(tokens: readonly Token[], i: number): boolean {
  const before = tokens.slice(i - 9, i).map((token) => token.text);
  const x = tokens[i - 8];
  const d = tokens[i - 3];
  const divisor = tokens[i + 1];
  if (!isOperand(x) || !isOperand(d) || !isOperand(divisor)) return false;
  const expected = ["(", x.text, "-", "(", x.text, "%", d.text, ")", ")"];
  return before.length === 9 && before.every((text, k) => text === expected[k]) && divisor.text === d.text;
}

function findFloatViolations(fileName: string, source: string): Violation[] {
  const tokens = tokenize(fileName, source);
  const violations: Violation[] = [];
  const report = (token: Token, rule: Rule): void => {
    const line = source.slice(0, token.pos).split("\n").length;
    violations.push({ file: fileName, line, rule });
  };
  tokens.forEach((token, i) => {
    const next = tokens[i + 1];
    const calls = next?.text === "(";
    if (token.kind === "number") {
      const decimal = !/^0[xXbBoO]/.test(token.text);
      const value = Number(token.text.replace(/_/g, "").replace(/n$/, ""));
      if (decimal && (token.text.includes(".") || !Number.isInteger(value))) report(token, "a float literal");
    } else if (token.text === "/" || token.text === "/=") {
      if (token.text === "/=" || !isFloorDivision(tokens, i)) report(token, "a division");
    } else if (token.text === "Math" && tokens[i + 1]?.text === ".") {
      const method = tokens[i + 2]?.text;
      if (tokens[i + 3]?.text === "(" && (method === "floor" || method === "round" || method === "ceil" || method === "trunc")) {
        report(token, `Math.${method}(`);
      }
    } else if (calls && (token.text === "toFixed" || token.text === "parseFloat")) {
      report(token, `${token.text}(`);
    }
  });
  return violations;
}

describe("float guard checker", () => {
  it.each([
    ["a division in a template expression", "const s = `${value / 100}`;"],
    ["a division in a later template expression", "const s = `${a}${b / 2}`;"],
    ["a leading-dot float literal", "const y = x * .5;"],
    ["a trailing-dot float literal", "const y = x * 5.;"],
    ["a negative exponent literal", "const y = 1e-2;"],
    ["a fractional exponent literal", "const y = 2.5e3;"],
    ["Math.floor", "const y = Math.floor(x);"],
    ["toFixed", "const s = x.toFixed(2);"],
    ["parseFloat", "const y = parseFloat(s);"],
    ["a division assignment", "x /= 100;"],
    ["a plain division", "const y = a / b;"],
  ])("reports %s", (_label, source) => {
    expect(findFloatViolations("case.ts", source)).not.toEqual([]);
  });

  it.each([
    ["the integer-floor division", "case.ts", "const y = (x - (x % 100)) / 100;"],
    ["a float in a double-quoted string", "case.ts", 'const s = "0.5";'],
    ["a slash in a single-quoted string", "case.ts", "const s = '1/2';"],
    ["template text with no expression", "case.ts", "const s = `1.5 / 2`;"],
    ["a line comment", "case.ts", "// 0.5 / 2\nconst y = 1;"],
    ["a block comment", "case.ts", "/* 1.5 */ const y = 1;"],
    ["JSX closing and self-closing tags", "case.tsx", "const el = <ul><li>{a}</li><br /></ul>;"],
    ["integer literals", "case.ts", "const y = [100, 0, 1_000];"],
    ["an integer exponent literal", "case.ts", "const y = 1e3;"],
  ])("does not report %s", (_label, fileName, source) => {
    expect(findFloatViolations(fileName, source)).toEqual([]);
  });
});

describe("integer-only source", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const roots = [here, join(here, "../../../apps/web/src")];
  const listSources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listSources(path);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
  const sources = roots.flatMap(listSources).map((path) => [path, readFileSync(path, "utf8")] as const);
  const violations = sources.flatMap(([path, source]) =>
    findFloatViolations(path, source).map((violation) => ({ ...violation, file: relative(here, path) })),
  );

  it("scans the package sources", () => {
    expect(sources.map(([path]) => basename(path))).toEqual(expect.arrayContaining(["money.ts", "offers.ts"]));
  });

  it("scans the web app sources", () => {
    expect(sources.map(([path]) => basename(path))).toEqual(
      expect.arrayContaining(["App.tsx", "useBasket.ts", "BasketPanel.tsx"]),
    );
  });

  it.each(rules)("uses no %s", (rule) => {
    expect(violations.filter((violation) => violation.rule === rule)).toEqual([]);
  });

  it("divides only in the integer-floor form (x - (x % d)) / d", () => {
    expect(violations.filter((violation) => violation.rule === "a division")).toEqual([]);
  });
});
