# Acme Widget Co basket

A proof of concept of the Acme Widget Co sales basket. It prices an order from a product
catalogue, delivery charge rules and special offers. It comes with a command-line runner and a
small React UI.

## Layout

```
packages/basket   Pure TypeScript domain: money, catalogue, delivery, offers, basket, receipt, CLI
apps/web          React + Vite UI; imports the domain only through the @acme/basket package entry
```

The domain has no UI or framework code, so it can be tested and reused on its own. The web app
is one client of it; the CLI is another.

## Running it

Requires Node 20 or later and pnpm 11.

```sh
pnpm install          # install dependencies
pnpm test             # Vitest, both packages
pnpm typecheck        # tsc, both packages
pnpm build            # production build of the UI
pnpm dev              # UI at http://localhost:5173
```

Price a basket from the command line (codes are case-insensitive):

```sh
pnpm basket B01 B01 R01 R01 R01
```

```
2 x Blue Widget (B01)                             $15.90
3 x Red Widget (R01)                              $98.85
--------------------------------------------------------
Subtotal                                         $114.75
Buy one red widget, get the second half price    -$16.48
Delivery                                            FREE
Total                                             $98.27
```

An unknown code prints `Unknown product code: X99` and exits with status 1.

## How it works

A `Basket` is built with its rules injected:

```ts
const basket = new Basket({ catalogue, delivery, offers });
basket.add("R01");
basket.add("R01");
basket.total(); // 5437 (cents)
```

The total is:

```
total = subtotal - discounts + delivery(subtotal - discounts)
```

| Interface      | Method                                 | Implementations                                   |
| -------------- | -------------------------------------- | ------------------------------------------------- |
| `Catalogue`    | `find(code)`, `list()`                 | `InMemoryCatalogue`                               |
| `DeliveryRule` | `chargeFor(orderValue): Cents`         | `TieredDelivery` (price bands), `FlatDelivery`    |
| `Offer`        | `discountFor(items): Cents`, `description` | `BuyOneGetNextDiscounted` (`productCode`, `percentOff`) |

Design choices:

- **Strategies for offers and delivery.** A new offer or delivery scheme is a new class that
  implements `Offer` or `DeliveryRule`. `Basket` does not change. This is where a real shop's
  rules change most often.
- **Configuration in one place.** `packages/basket/src/acme.ts` holds Acme's products, delivery
  bands and offer, and `createAcmeBasket()` wires them together. Pricing logic does not know
  about Acme.
- **`total()` and `summary()`.** `total()` is the interface the brief asks for and returns cents.
  `summary()` returns the full breakdown (grouped lines, subtotal, each applied discount, total
  discount, delivery, total) so the receipt and the UI can show where the number comes from.
  `total()` is `summary().total`, so the two cannot disagree.
- **The UI receives its rules as props.** `App` takes a `catalogue` and a `createBasket`
  factory. `apps/web/src/main.tsx` is the composition root: outside the tests, it is the only
  web file that imports the Acme configuration. A test renders `App` with a different catalogue and rules to
  check this.

## Money

Money is an integer number of cents end to end (`type Cents = number`). No float is ever
created, not even as an intermediate value and not for display. Floats cannot represent most
decimal amounts exactly, and an error of one cent in a total is a real bug.

- Every price, charge and discount is checked by `assertCents`: a non-negative safe integer,
  otherwise `RangeError`.
- Percentages use `percentOfFloor(amount, percent)`, which computes `amount * percent` and
  divides with integer floor division `(x - (x % 100)) / 100`. It throws if the product leaves
  the safe-integer range or if `percent` is not an integer from 0 to 100.
- `formatCents` formats the whole units as a `BigInt` through `Intl.NumberFormat` and splices
  in the cents digits as text. It throws for currencies that do not have exactly 2 minor
  digits (for example JPY or KWD), because cents could not be formatted exactly for them.
- A test in `money.test.ts` scans `packages/basket/src` and `apps/web/src` and fails if
  float-producing code comes back. It reports calls to `Math.floor`, `Math.round`, `Math.ceil`,
  `Math.trunc`, `toFixed` and `parseFloat`, float literals (`0.5`, `.5`, `5.`, `1e-2`), and
  divisions, including inside template-literal and JSX expressions, unless they are written as
  `(x - (x % d)) / d`. It is a backstop, not a proof. The primary guarantee is the money
  functions' own tests: `percentOfFloor` is checked across a range of inputs, and a test checks
  that `formatCents` never hands a non-integer to `Intl`.

## Assumptions

The brief leaves some rules open. These are the choices made, and why.

- **The half-price item rounds down to the cent.** Half of 3295 is 1647.5, so the second red
  widget costs 1647 and the discount is 1648. The `R01, R01` example needs this: 6590 - 1648 +
  495 = 5437 ($54.37). Rounding the half price up, or to nearest, gives $54.38. Truncating the
  final total instead (keeping the half cent until the end) would also fit all four examples;
  rounding the item price was chosen because it keeps every amount whole cents.
- **Delivery is charged on the value after offers.** Two red widgets are 6590 before the offer
  and 4942 after. Only the post-offer value (under $50, so $4.95) gives $54.37.
- **The offer applies once per pair.** 3 red widgets get one discounted, 4 get two. "Buy one,
  get the second half price" reads as a repeating pair, and the five-item example ($98.27)
  matches it.
- **Multiple offers are summed, and the total discount is capped at the goods subtotal.** A
  basket can never go below its delivery charge.
- **An empty basket costs 0.** No delivery is charged when there is nothing to deliver.
- **Delivery bands are strictly below.** 4999 pays $4.95, 5000 pays $2.95, 9000 is free. The
  brief says "under $50" and "under $90".
- **Unknown product codes throw.** `add` throws `UnknownProductError` and leaves the basket
  unchanged. Silently ignoring a bad code would under-charge without anyone noticing.

## What I left out

- **Removing items.** The brief's interface is `add` and `total` only. The UI has a "Clear"
  button, which starts a new basket.
- **Persistence and an API.** The basket lives in memory; the brief asks for a proof of
  concept of the pricing model.
- **Multiple currencies.** Everything is USD in `en-US`.

Known limitations:

- `formatCents` writes the cents with Latin digits. A locale with another numbering system,
  such as `ar-EG`, would mix scripts in one amount. All output today is `en-US`.
- No removing items from a basket, and no persistence or API, as above.
- The float guard is a tokenizer, not a parser, so some shapes get past it: a negative
  exponent such as `x * 10 ** -2`, or a call wrapped around the floor form, such as
  `f(x - (x % d)) / d`. It does not understand regex literals (it reports the slashes as
  divisions) or generic arrow functions in `.tsx` files (it fails with an unterminated JSX
  error), so code using them would need the guard extended.
