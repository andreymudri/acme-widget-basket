import { formatCents } from "@acme/basket";
import type { BasketSummary } from "@acme/basket";

export interface BasketPanelProps {
  readonly summary: BasketSummary;
  readonly onClear: () => void;
}

export function BasketPanel({ summary, onClear }: BasketPanelProps) {
  const empty = summary.lines.length === 0;

  return (
    <aside className="card basket" aria-labelledby="basket-heading">
      <div className="basket-head">
        <h2 id="basket-heading">Your basket</h2>
        {!empty && (
          <button type="button" className="button ghost" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {empty ? (
        <p className="empty">Your basket is empty. Add a widget to get started.</p>
      ) : (
        <ul className="lines">
          {summary.lines.map((line) => (
            <li key={line.product.code} className="row">
              <span>
                {line.quantity} × {line.product.name}
              </span>
              <span className="amount">{formatCents(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="totals">
        <div className="row">
          <dt>Subtotal</dt>
          <dd className="amount">{formatCents(summary.subtotal)}</dd>
        </div>
        {summary.discounts.map((discount) => (
          <div key={discount.description} className="row discount">
            <dt>{discount.description}</dt>
            <dd className="amount">−{formatCents(discount.amount)}</dd>
          </div>
        ))}
        <div className="row">
          <dt>Delivery</dt>
          <dd className="amount">{summary.delivery === 0 ? "Free" : formatCents(summary.delivery)}</dd>
        </div>
      </dl>

      <div className="row grand-total">
        <span>Total</span>
        <output className="amount" aria-label="Basket total">
          {formatCents(summary.total)}
        </output>
      </div>
    </aside>
  );
}
