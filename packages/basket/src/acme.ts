import { Basket } from "./basket";
import { InMemoryCatalogue } from "./catalogue";
import type { Catalogue, Product } from "./catalogue";
import { TieredDelivery } from "./delivery";
import type { DeliveryRule } from "./delivery";
import { BuyOneGetNextDiscounted } from "./offers";
import type { Offer } from "./offers";

export const acmeProducts: readonly Product[] = [
  { code: "R01", name: "Red Widget", price: 3295 },
  { code: "G01", name: "Green Widget", price: 2495 },
  { code: "B01", name: "Blue Widget", price: 795 },
];

export const acmeCatalogue: Catalogue = new InMemoryCatalogue(acmeProducts);

export const acmeDelivery: DeliveryRule = new TieredDelivery([
  { below: 5000, charge: 495 },
  { below: 9000, charge: 295 },
  { charge: 0 },
]);

export const acmeOffers: readonly Offer[] = [
  new BuyOneGetNextDiscounted({
    productCode: "R01",
    percentOff: 50,
    description: "Buy one red widget, get the second half price",
  }),
];

export function createAcmeBasket(): Basket {
  return new Basket({ catalogue: acmeCatalogue, delivery: acmeDelivery, offers: acmeOffers });
}
