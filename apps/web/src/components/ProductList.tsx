import { formatCents } from "@acme/basket";
import type { Product, ProductCode } from "@acme/basket";

const swatches: Readonly<Record<ProductCode, string>> = {
  R01: "#d9483b",
  G01: "#3f9a5a",
  B01: "#3b6fd9",
};
const fallbackSwatch = "#9a8f84";

export interface ProductListProps {
  readonly products: readonly Product[];
  readonly onAdd: (code: ProductCode) => void;
}

export function ProductList({ products, onAdd }: ProductListProps) {
  return (
    <ul className="products">
      {products.map((product) => (
        <li key={product.code} className="product">
          <span
            className="swatch"
            style={{ background: swatches[product.code] ?? fallbackSwatch }}
            aria-hidden="true"
          />
          <div className="product-info">
            <span className="product-name">{product.name}</span>
            <span className="code">{product.code}</span>
          </div>
          <span className="price amount">{formatCents(product.price)}</span>
          <button
            type="button"
            className="button primary"
            aria-label={`Add ${product.name}`}
            onClick={() => onAdd(product.code)}
          >
            Add
          </button>
        </li>
      ))}
    </ul>
  );
}
