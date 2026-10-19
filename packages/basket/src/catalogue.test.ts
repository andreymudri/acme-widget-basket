import { describe, expect, it } from "vitest";
import { InMemoryCatalogue, UnknownProductError } from "./catalogue";
import type { Product } from "./catalogue";

const products: readonly Product[] = [
  { code: "R01", name: "Red Widget", price: 3295 },
  { code: "G01", name: "Green Widget", price: 2495 },
  { code: "B01", name: "Blue Widget", price: 795 },
];

describe("InMemoryCatalogue", () => {
  it("finds products by code", () => {
    const catalogue = new InMemoryCatalogue(products);
    expect(catalogue.find("G01")).toEqual({ code: "G01", name: "Green Widget", price: 2495 });
  });

  it("returns undefined for an unknown code", () => {
    expect(new InMemoryCatalogue(products).find("X99")).toBeUndefined();
  });

  it("lists products in insertion order", () => {
    expect(new InMemoryCatalogue(products).list().map((p) => p.code)).toEqual(["R01", "G01", "B01"]);
  });

  it("throws on duplicate codes", () => {
    expect(
      () =>
        new InMemoryCatalogue([
          { code: "R01", name: "Red Widget", price: 3295 },
          { code: "R01", name: "Other Red", price: 100 },
        ]),
    ).toThrow(/R01/);
  });

  it("validates prices as cents", () => {
    expect(() => new InMemoryCatalogue([{ code: "R01", name: "Red Widget", price: 32.95 }])).toThrow(
      RangeError,
    );
    expect(() => new InMemoryCatalogue([{ code: "R01", name: "Red Widget", price: -1 }])).toThrow(/R01/);
  });

  it("is not affected by later changes to the input array", () => {
    const input: Product[] = [...products];
    const catalogue = new InMemoryCatalogue(input);
    input.push({ code: "Y01", name: "Yellow Widget", price: 100 });
    expect(catalogue.list()).toHaveLength(3);
  });
});

describe("UnknownProductError", () => {
  it("carries the code, message and name", () => {
    const error = new UnknownProductError("X99");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnknownProductError);
    expect(error.code).toBe("X99");
    expect(error.message).toBe("Unknown product code: X99");
    expect(error.name).toBe("UnknownProductError");
  });
});
