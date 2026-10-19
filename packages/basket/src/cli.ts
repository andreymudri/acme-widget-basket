import { createAcmeBasket } from "./acme";
import { UnknownProductError } from "./catalogue";
import { formatReceipt } from "./receipt";

const basket = createAcmeBasket();
try {
  for (const code of process.argv.slice(2)) basket.add(code.toUpperCase());
  console.log(formatReceipt(basket.summary()));
} catch (error) {
  if (!(error instanceof UnknownProductError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
