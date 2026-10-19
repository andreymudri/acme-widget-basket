import { describe, expect, it } from "vitest";
import { FlatDelivery, TieredDelivery } from "./delivery";

describe("TieredDelivery", () => {
  const acme = new TieredDelivery([
    { charge: 0 },
    { below: 9000, charge: 295 },
    { below: 5000, charge: 495 },
  ]);

  it.each([
    [0, 495],
    [4999, 495],
    [5000, 295],
    [8999, 295],
    [9000, 0],
    [100000, 0],
  ])("an order of %i cents pays %i cents", (orderValue, charge) => {
    expect(acme.chargeFor(orderValue)).toBe(charge);
  });

  it("throws when no band is open-ended", () => {
    expect(
      () =>
        new TieredDelivery([
          { below: 5000, charge: 495 },
          { below: 9000, charge: 295 },
        ]),
    ).toThrow(/open-ended/);
  });

  it("throws when more than one band is open-ended", () => {
    expect(() => new TieredDelivery([{ below: 5000, charge: 495 }, { charge: 295 }, { charge: 0 }])).toThrow(
      /open-ended/,
    );
  });

  it("rejects amounts that are not whole cents", () => {
    expect(() => new TieredDelivery([{ below: 50.5, charge: 495 }, { charge: 0 }])).toThrow(RangeError);
    expect(() => new TieredDelivery([{ below: 5000, charge: -1 }, { charge: 0 }])).toThrow(RangeError);
  });
});

describe("FlatDelivery", () => {
  it("always returns the same charge", () => {
    const flat = new FlatDelivery(395);
    expect(flat.chargeFor(0)).toBe(395);
    expect(flat.chargeFor(100000)).toBe(395);
  });

  it("rejects an invalid charge", () => {
    expect(() => new FlatDelivery(1.5)).toThrow(RangeError);
  });
});
