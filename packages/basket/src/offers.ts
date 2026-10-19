import type { Product, ProductCode } from "./catalogue";
import type { Cents } from "./money";

export interface Offer {
  readonly description: string;
  discountFor(items: readonly Product[]): Cents;
}

export interface BuyOneGetNextDiscountedOptions {
  readonly productCode: ProductCode;
  readonly percentOff: number;
  readonly description?: string;
}

export class BuyOneGetNextDiscounted implements Offer {
  readonly description: string;
  private readonly productCode: ProductCode;
  private readonly percentOff: number;

  constructor(options: BuyOneGetNextDiscountedOptions) {
    const { productCode, percentOff } = options;
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
      throw new RangeError(`percentOff must be an integer from 1 to 100, got ${percentOff}`);
    }
    this.productCode = productCode;
    this.percentOff = percentOff;
    this.description =
      options.description ??
      (percentOff === 100
        ? `Buy one ${productCode}, get the second free`
        : `Buy one ${productCode}, get the second ${percentOff}% off`);
  }

  discountFor(items: readonly Product[]): Cents {
    const matching = items.filter((item) => item.code === this.productCode);
    const first = matching[0];
    if (first === undefined) return 0;
    const price = first.price;
    // The discounted price rounds down, so the discount itself rounds up (3295 at 50% -> 1648 off).
    const discountedPrice = Math.floor((price * (100 - this.percentOff)) / 100);
    return Math.floor(matching.length / 2) * (price - discountedPrice);
  }
}
