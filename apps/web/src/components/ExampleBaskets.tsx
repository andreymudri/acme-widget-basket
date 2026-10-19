import { formatCents } from "@acme/basket";
import type { Cents, ProductCode } from "@acme/basket";

export interface ExampleBasket {
  readonly codes: readonly ProductCode[];
  readonly expected: Cents;
}

// The example baskets and totals given in the brief.
export const examples: readonly ExampleBasket[] = [
  { codes: ["B01", "G01"], expected: 3785 },
  { codes: ["R01", "R01"], expected: 5437 },
  { codes: ["R01", "G01"], expected: 6085 },
  { codes: ["B01", "B01", "R01", "R01", "R01"], expected: 9827 },
];

export interface ExampleBasketsProps {
  readonly onLoad: (codes: readonly ProductCode[]) => void;
  readonly examples?: readonly ExampleBasket[];
}

export function ExampleBaskets({ onLoad, examples: shown = examples }: ExampleBasketsProps) {
  return (
    <ul className="examples">
      {shown.map((example) => {
        const label = example.codes.join(", ");
        return (
          <li key={label}>
            <button type="button" className="example" onClick={() => onLoad(example.codes)}>
              <span className="code">{label}</span>
              <span className="expect">expect {formatCents(example.expected)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
