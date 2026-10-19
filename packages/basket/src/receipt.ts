import type { BasketSummary } from "./basket";
import { formatCents } from "./money";

const WIDTH = 56;

function row(label: string, amount: string): string {
  const gap = Math.max(1, WIDTH - label.length - amount.length);
  return `${label}${" ".repeat(gap)}${amount}`;
}

export function formatReceipt(summary: BasketSummary): string {
  if (summary.lines.length === 0) {
    return ["Basket is empty.", row("Total", formatCents(0))].join("\n");
  }
  const rows = summary.lines.map((line) =>
    row(`${line.quantity} x ${line.product.name} (${line.product.code})`, formatCents(line.lineTotal)),
  );
  rows.push("-".repeat(WIDTH), row("Subtotal", formatCents(summary.subtotal)));
  for (const discount of summary.discounts) {
    rows.push(row(discount.description, `-${formatCents(discount.amount)}`));
  }
  rows.push(
    row("Delivery", summary.delivery === 0 ? "FREE" : formatCents(summary.delivery)),
    row("Total", formatCents(summary.total)),
  );
  return rows.join("\n");
}
