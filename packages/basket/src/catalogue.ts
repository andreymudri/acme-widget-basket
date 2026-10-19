import { assertCents } from "./money";
import type { Cents } from "./money";

export type ProductCode = string;

export interface Product {
  readonly code: ProductCode;
  readonly name: string;
  readonly price: Cents;
}

export interface Catalogue {
  find(code: ProductCode): Product | undefined;
  list(): readonly Product[];
}

export class UnknownProductError extends Error {
  override readonly name = "UnknownProductError";
  readonly code: ProductCode;

  constructor(code: ProductCode) {
    super(`Unknown product code: ${code}`);
    this.code = code;
  }
}

export class InMemoryCatalogue implements Catalogue {
  private readonly byCode = new Map<ProductCode, Product>();

  constructor(products: readonly Product[]) {
    for (const product of products) {
      if (this.byCode.has(product.code)) {
        throw new Error(`Duplicate product code: ${product.code}`);
      }
      assertCents(product.price, `price of ${product.code}`);
      this.byCode.set(product.code, product);
    }
  }

  find(code: ProductCode): Product | undefined {
    return this.byCode.get(code);
  }

  list(): readonly Product[] {
    return [...this.byCode.values()];
  }
}
