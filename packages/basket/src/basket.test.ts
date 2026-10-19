import { describe, expect, it } from "vitest";
import { createAcmeBasket } from "./acme";
import { Basket } from "./basket";
import { InMemoryCatalogue, UnknownProductError } from "./catalogue";
import type { Product } from "./catalogue";
import { FlatDelivery } from "./delivery";
import type { Offer } from "./offers";

function totalOf(codes: readonly string[]): number {
  const basket = createAcmeBasket();
  for (const code of codes) basket.add(code);
  return basket.total();
}

describe("Acme example baskets", () => {
  it.each([
    [["B01", "G01"], 3785],
    [["R01", "R01"], 5437],
    [["R01", "G01"], 6085],
    [["B01", "B01", "R01", "R01", "R01"], 9827],
  ])("%j totals %i cents", (codes, expected) => {
    expect(totalOf(codes)).toBe(expected);
  });

  it("charges delivery on the value after offers", () => {
    const basket = createAcmeBasket();
    basket.add("R01");
    basket.add("R01");
    expect(basket.summary()).toMatchObject({
      subtotal: 6590,
      discount: 1648,
      delivery: 495,
      total: 5437,
    });
  });

  it("totals an empty basket at 0", () => {
    expect(createAcmeBasket().total()).toBe(0);
  });
});

const apple: Product = { code: "A", name: "Apple", price: 100 };
const pear: Product = { code: "P", name: "Pear", price: 250 };
const catalogue = new InMemoryCatalogue([apple, pear]);

function stubOffer(description: string, amount: number): Offer {
  return { description, discountFor: () => amount };
}

describe("Basket", () => {
  it("throws for an unknown code and adds nothing", () => {
    const basket = new Basket({ catalogue, delivery: new FlatDelivery(300) });
    expect(() => basket.add("X")).toThrow(UnknownProductError);
    expect(basket.items()).toEqual([]);
  });

  it("uses the injected delivery and offers, leaving zero-amount offers out", () => {
    const basket = new Basket({
      catalogue,
      delivery: new FlatDelivery(300),
      offers: [stubOffer("Ten off", 10), stubOffer("Nothing", 0), stubOffer("Five off", 5)],
    });
    basket.add("A");
    basket.add("P");
    expect(basket.summary()).toEqual({
      lines: [
        { product: apple, quantity: 1, lineTotal: 100 },
        { product: pear, quantity: 1, lineTotal: 250 },
      ],
      subtotal: 350,
      discounts: [
        { description: "Ten off", amount: 10 },
        { description: "Five off", amount: 5 },
      ],
      discount: 15,
      delivery: 300,
      total: 635,
    });
    expect(basket.total()).toBe(635);
  });

  it("groups repeated products into one line in first-added order", () => {
    const basket = new Basket({ catalogue, delivery: new FlatDelivery(0) });
    for (const code of ["P", "A", "P", "A", "P"]) basket.add(code);
    expect(basket.items()).toEqual(["P", "A", "P", "A", "P"]);
    expect(basket.summary().lines).toEqual([
      { product: pear, quantity: 3, lineTotal: 750 },
      { product: apple, quantity: 2, lineTotal: 200 },
    ]);
  });

  it("caps discounts at the subtotal", () => {
    const basket = new Basket({
      catalogue,
      delivery: new FlatDelivery(300),
      offers: [stubOffer("Big", 80), stubOffer("Bigger", 90)],
    });
    basket.add("A");
    expect(basket.summary()).toMatchObject({ subtotal: 100, discount: 100, delivery: 300, total: 300 });
  });

  it("throws naming the offer when its amount is negative", () => {
    const basket = new Basket({
      catalogue,
      delivery: new FlatDelivery(0),
      offers: [stubOffer("Broken offer", -1)],
    });
    basket.add("A");
    expect(() => basket.summary()).toThrow(/Broken offer/);
  });
});
