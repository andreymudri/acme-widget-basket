import { UnknownProductError } from "./catalogue";
import type { Catalogue, Product, ProductCode } from "./catalogue";
import type { DeliveryRule } from "./delivery";
import { assertCents } from "./money";
import type { Cents } from "./money";
import type { Offer } from "./offers";

export interface BasketOptions {
  readonly catalogue: Catalogue;
  readonly delivery: DeliveryRule;
  readonly offers?: readonly Offer[];
}

export interface BasketLine {
  readonly product: Product;
  readonly quantity: number;
  readonly lineTotal: Cents;
}

export interface AppliedDiscount {
  readonly description: string;
  readonly amount: Cents;
}

export interface BasketSummary {
  readonly lines: readonly BasketLine[];
  readonly subtotal: Cents;
  readonly discounts: readonly AppliedDiscount[];
  readonly discount: Cents;
  readonly delivery: Cents;
  readonly total: Cents;
}

export class Basket {
  private readonly catalogue: Catalogue;
  private readonly delivery: DeliveryRule;
  private readonly offers: readonly Offer[];
  private readonly products: Product[] = [];

  constructor(options: BasketOptions) {
    this.catalogue = options.catalogue;
    this.delivery = options.delivery;
    this.offers = options.offers ?? [];
  }

  add(code: ProductCode): void {
    const product = this.catalogue.find(code);
    if (product === undefined) throw new UnknownProductError(code);
    this.products.push(product);
  }

  items(): readonly ProductCode[] {
    return this.products.map((product) => product.code);
  }

  summary(): BasketSummary {
    const grouped = new Map<ProductCode, { product: Product; quantity: number }>();
    for (const product of this.products) {
      const entry = grouped.get(product.code);
      if (entry) entry.quantity += 1;
      else grouped.set(product.code, { product, quantity: 1 });
    }
    const lines: BasketLine[] = [...grouped.values()].map(({ product, quantity }) => ({
      product,
      quantity,
      lineTotal: product.price * quantity,
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    const discounts: AppliedDiscount[] = [];
    for (const offer of this.offers) {
      const amount = assertCents(offer.discountFor(this.products), `discount of "${offer.description}"`);
      if (amount > 0) discounts.push({ description: offer.description, amount });
    }
    const discount = Math.min(
      discounts.reduce((sum, d) => sum + d.amount, 0),
      subtotal,
    );
    const delivery = this.products.length === 0 ? 0 : this.delivery.chargeFor(subtotal - discount);
    return { lines, subtotal, discounts, discount, delivery, total: subtotal - discount + delivery };
  }

  total(): Cents {
    return this.summary().total;
  }
}
