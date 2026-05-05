import { PayReturnClient } from "./pay-return-client";

export const metadata = {
  title: "Оплата · Rivera",
  description: "Повернення після оплати Monobank",
};

export default function BronPayReturnPage() {
  return <PayReturnClient />;
}
