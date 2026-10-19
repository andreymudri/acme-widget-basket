import { describe, expect, it } from "vitest";
import { createAcmeBasket } from "./acme";
import type { BasketSummary } from "./basket";
import { formatReceipt } from "./receipt";

function basketOf(...codes: string[]) {
  const basket = createAcmeBasket();
  for (const code of codes) basket.add(code);
  return basket;
}

describe("formatReceipt", () => {
  it("prints the five-item example basket", () => {
    expect(formatReceipt(basketOf("B01", "B01", "R01", "R01", "R01").summary())).toMatchInlineSnapshot(`
      "2 x Blue Widget (B01)                             $15.90
      3 x Red Widget (R01)                              $98.85
      --------------------------------------------------------
      Subtotal                                         $114.75
      Buy one red widget, get the second half price    -$16.48
      Delivery                                            FREE
      Total                                             $98.27"
    `);
  });

  it("prints an empty basket with a zero total", () => {
    const receipt = formatReceipt(createAcmeBasket().summary());
    expect(receipt).toContain("Basket is empty.");
    expect(receipt.split("\n").at(-1)).toBe(`Total${" ".repeat(56 - "Total".length - "$0.00".length)}$0.00`);
  });

  it("keeps at least one space between a long label and its amount", () => {
    const name = "A".repeat(60);
    const summary: BasketSummary = {
      lines: [{ product: { code: "L01", name, price: 100 }, quantity: 1, lineTotal: 100 }],
      subtotal: 100,
      discounts: [],
      discount: 0,
      delivery: 0,
      total: 100,
    };
    expect(formatReceipt(summary).split("\n")[0]).toBe(`1 x ${name} (L01) $1.00`);
  });

  it("shows paid delivery as an amount", () => {
    expect(formatReceipt(basketOf("B01", "G01").summary())).toMatch(/^Delivery +\$4\.95$/m);
  });
});
