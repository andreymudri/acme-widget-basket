import { describe, expect, it } from "vitest";
import { BuyOneGetNextDiscounted } from "./offers";
import type { Product } from "./catalogue";

const red: Product = { code: "R01", name: "Red Widget", price: 3295 };
const green: Product = { code: "G01", name: "Green Widget", price: 2495 };
const blue: Product = { code: "B01", name: "Blue Widget", price: 795 };

const reds = (n: number): Product[] => Array.from({ length: n }, () => red);

describe("BuyOneGetNextDiscounted", () => {
  const halfPriceRed = new BuyOneGetNextDiscounted({ productCode: "R01", percentOff: 50 });

  it.each([
    [0, 0],
    [1, 0],
    [2, 1648],
    [3, 1648],
    [4, 3296],
  ])("discounts %i red widgets by %i cents", (count, expected) => {
    expect(halfPriceRed.discountFor(reds(count))).toBe(expected);
  });

  it("ignores other products wherever they sit in the list", () => {
    expect(halfPriceRed.discountFor([blue, red, green, blue, red, green])).toBe(1648);
    expect(halfPriceRed.discountFor([green, blue, red])).toBe(0);
    expect(halfPriceRed.discountFor([blue, blue, green])).toBe(0);
  });

  it("gives the second item free at 100% off", () => {
    const offer = new BuyOneGetNextDiscounted({ productCode: "B01", percentOff: 100 });
    expect(offer.discountFor([blue, blue])).toBe(795);
  });

  it("builds a default description", () => {
    expect(halfPriceRed.description).toBe("Buy one R01, get the second 50% off");
    expect(new BuyOneGetNextDiscounted({ productCode: "B01", percentOff: 100 }).description).toBe(
      "Buy one B01, get the second free",
    );
  });

  it("uses a custom description when given", () => {
    const offer = new BuyOneGetNextDiscounted({
      productCode: "R01",
      percentOff: 50,
      description: "Red widgets: second one half price",
    });
    expect(offer.description).toBe("Red widgets: second one half price");
  });

  it.each([0, 150, 12.5])("rejects %d percent off", (percentOff) => {
    expect(() => new BuyOneGetNextDiscounted({ productCode: "R01", percentOff })).toThrow(RangeError);
  });
});
