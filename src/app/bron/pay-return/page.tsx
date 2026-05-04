import Link from "next/link";

export const metadata = {
  title: "Оплата · Rivera",
  description: "Повернення після оплати Monobank",
};

export default function BronPayReturnPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center font-[family-name:var(--font-montserrat)]">
      <h1 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#152025]">
        Дякуємо!
      </h1>
      <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#2d3b44]">
        Якщо оплату завершено успішно, заявку буде підтверджено найближчим часом. У
        разі питань зв&apos;яжіться з адміністрацією Rivera.
      </p>
      <Link
        href="/bron"
        className="mt-8 rounded-xl border border-teal-800/40 bg-[#c5d9e2] px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-[#b9d4df]"
      >
        Повернутись до бронювання
      </Link>
    </div>
  );
}
