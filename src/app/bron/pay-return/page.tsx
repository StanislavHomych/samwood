import { PayReturnClient } from "./pay-return-client";

export const metadata = {
  title: "Оплата · Samwood",
  description: "Повернення після оплати Monobank",
};

export default function BronPayReturnPage() {
  return <PayReturnClient />;
}
