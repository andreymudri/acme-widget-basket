import type { Basket, BasketSummary, ProductCode } from "@acme/basket";
import { useCallback, useRef, useState } from "react";

export interface UseBasket {
  readonly summary: BasketSummary;
  add(code: ProductCode): void;
  load(codes: readonly ProductCode[]): void;
  clear(): void;
}

export function useBasket(createBasket: () => Basket): UseBasket {
  const basketRef = useRef<Basket | null>(null);
  if (basketRef.current === null) basketRef.current = createBasket();
  const [summary, setSummary] = useState<BasketSummary>(() => basketRef.current!.summary());

  const add = useCallback((code: ProductCode) => {
    const basket = basketRef.current!;
    basket.add(code);
    setSummary(basket.summary());
  }, []);

  const load = useCallback(
    (codes: readonly ProductCode[]) => {
      // Build the new basket fully before swapping it in, so a bad code leaves the old one intact.
      const basket = createBasket();
      for (const code of codes) basket.add(code);
      basketRef.current = basket;
      setSummary(basket.summary());
    },
    [createBasket],
  );

  const clear = useCallback(() => load([]), [load]);

  return { summary, add, load, clear };
}
