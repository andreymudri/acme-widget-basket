import type { Cents } from "./money";
import { assertCents } from "./money";

export interface DeliveryRule {
  /** `orderValue` is the goods value after offers. */
  chargeFor(orderValue: Cents): Cents;
}

/** Applies to orders strictly below `below`; the band without `below` is the open-ended top band. */
export interface DeliveryBand {
  readonly below?: Cents;
  readonly charge: Cents;
}

interface BoundedBand {
  readonly below: Cents;
  readonly charge: Cents;
}

export class TieredDelivery implements DeliveryRule {
  private readonly bounded: readonly BoundedBand[];
  private readonly topCharge: Cents;

  constructor(bands: readonly DeliveryBand[]) {
    const bounded: BoundedBand[] = [];
    const open: Cents[] = [];
    for (const band of bands) {
      const charge = assertCents(band.charge, "delivery charge");
      if (band.below === undefined) {
        open.push(charge);
      } else {
        bounded.push({ below: assertCents(band.below, "delivery band limit"), charge });
      }
    }
    const [topCharge] = open;
    if (open.length !== 1 || topCharge === undefined) {
      throw new Error(`Exactly one open-ended delivery band is required, got ${open.length}`);
    }
    this.bounded = bounded.sort((a, b) => a.below - b.below);
    this.topCharge = topCharge;
  }

  chargeFor(orderValue: Cents): Cents {
    const band = this.bounded.find((b) => orderValue < b.below);
    return band ? band.charge : this.topCharge;
  }
}

export class FlatDelivery implements DeliveryRule {
  private readonly charge: Cents;

  constructor(charge: Cents) {
    this.charge = assertCents(charge, "delivery charge");
  }

  chargeFor(_orderValue: Cents): Cents {
    return this.charge;
  }
}
