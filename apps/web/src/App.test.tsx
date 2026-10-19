import { Basket, FlatDelivery, InMemoryCatalogue, acmeCatalogue, createAcmeBasket } from "@acme/basket";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

function renderAcme() {
  render(<App catalogue={acmeCatalogue} createBasket={createAcmeBasket} />);
  return userEvent.setup();
}

function total(): string {
  return screen.getByRole("status", { name: "Basket total" }).textContent ?? "";
}

describe("App", () => {
  it("starts with an empty basket totalling $0.00", () => {
    renderAcme();
    expect(total()).toBe("$0.00");
  });

  it("applies the red widget offer and delivery when adding two red widgets", async () => {
    const user = renderAcme();
    const add = screen.getByRole("button", { name: "Add Red Widget" });
    await user.click(add);
    await user.click(add);

    expect(screen.getByText("2 × Red Widget")).toBeTruthy();
    expect(screen.getByText("Buy one red widget, get the second half price")).toBeTruthy();
    expect(total()).toBe("$54.37");
  });

  it("clears the basket back to $0.00", async () => {
    const user = renderAcme();
    await user.click(screen.getByRole("button", { name: "Add Blue Widget" }));
    expect(total()).not.toBe("$0.00");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(total()).toBe("$0.00");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("loads an example basket from the brief", async () => {
    const user = renderAcme();
    await user.click(screen.getByRole("button", { name: /B01, B01, R01, R01, R01/ }));
    expect(total()).toBe("$98.27");
  });

  it("is not tied to the Acme configuration", async () => {
    const catalogue = new InMemoryCatalogue([{ code: "T01", name: "Test Gadget", price: 1000 }]);
    const createBasket = () => new Basket({ catalogue, delivery: new FlatDelivery(100) });
    render(<App catalogue={catalogue} createBasket={createBasket} />);
    const user = userEvent.setup();

    expect(screen.queryByRole("button", { name: "Add Red Widget" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Add Test Gadget" }));
    expect(screen.getByText("1 × Test Gadget")).toBeTruthy();
    expect(total()).toBe("$11.00");
  });
});
