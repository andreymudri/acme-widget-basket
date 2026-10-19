import type { Basket, Catalogue } from "@acme/basket";
import { BasketPanel } from "./components/BasketPanel";
import { ExampleBaskets, examples } from "./components/ExampleBaskets";
import { ProductList } from "./components/ProductList";
import { useBasket } from "./useBasket";

export interface AppProps {
  readonly catalogue: Catalogue;
  readonly createBasket: () => Basket;
}

export function App({ catalogue, createBasket }: AppProps) {
  const { summary, add, load, clear } = useBasket(createBasket);
  const products = catalogue.list();
  // The brief's examples only make sense when the catalogue stocks every code in them.
  const available = examples.filter((example) =>
    example.codes.every((code) => catalogue.find(code) !== undefined),
  );

  return (
    <div className="page">
      <header className="masthead">
        <h1>Acme Widget Co</h1>
        <p className="subtitle">Widgets, priced honestly. Offers and delivery applied as you shop.</p>
      </header>
      <main className="layout">
        <div className="stack">
          <section className="card" aria-labelledby="products-heading">
            <h2 id="products-heading">Products</h2>
            <ProductList products={products} onAdd={add} />
          </section>
          {available.length > 0 && (
            <section className="card" aria-labelledby="examples-heading">
              <h2 id="examples-heading">Example baskets</h2>
              <ExampleBaskets examples={available} onLoad={load} />
            </section>
          )}
        </div>
        <BasketPanel summary={summary} onClear={clear} />
      </main>
    </div>
  );
}
