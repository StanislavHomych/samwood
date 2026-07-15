import { formatSeatLineUk } from "@/lib/pool/seat-pricing";
import { sendEmail } from "@/lib/email/mailer";

export type BookingConfirmationInput = {
  to: string;
  fullName: string;
  phone: string;
  visitDateKey: string;
  seatIds: string[];
  /** Місця з дитячим тарифом (спец-дні) — позначаються в переліку. */
  childSeatIds?: string[];
  amountKopiyky: number | null;
  paymentMethod: string;
  details?: string | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  monobank: "Онлайн-оплата (Monobank)",
  cash: "Готівка при заїзді",
  on_site: "Оплата на місці",
};

function formatVisitDateUk(visitDateKey: string): string {
  const d = new Date(`${visitDateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return visitDateKey;
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatMoneyKop(kop: number | null): string {
  if (kop == null) return "—";
  return (kop / 100).toLocaleString("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Формує тему, HTML та text листа-підтвердження бронювання. */
export function buildBookingConfirmationEmail(input: BookingConfirmationInput): {
  subject: string;
  html: string;
  text: string;
} {
  const dateUk = formatVisitDateUk(input.visitDateKey);
  const paymentLabel = PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod;
  const childSet = new Set(input.childSeatIds ?? []);
  const seatLines = input.seatIds.map(
    (id) => formatSeatLineUk(id) + (childSet.has(id) ? " — дитячий" : ""),
  );
  const total = formatMoneyKop(input.amountKopiyky);
  const name = input.fullName?.trim() || "гостю";

  const subject = `Samwood — бронювання на ${dateUk}`;

  const seatRowsHtml = seatLines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eef2f4;color:#152025;font-size:14px;">${escapeHtml(
          line,
        )}</td></tr>`,
    )
    .join("");

  const detailsHtml = input.details?.trim()
    ? `<p style="margin:16px 0 0;font-size:13px;color:#5b6b72;"><strong style="color:#152025;">Ваші деталі:</strong> ${escapeHtml(
        input.details.trim(),
      )}</p>`
    : "";

  const html = `<!-- Samwood booking confirmation -->
<div style="margin:0;padding:24px;background:#f4f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8ea;border-radius:18px;overflow:hidden;">
    <div style="padding:22px 26px;background:#152025;">
      <p style="margin:0;color:#c5d9e2;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Бронювання підтверджено</p>
      <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">SAMWOOD</p>
    </div>
    <div style="padding:26px;">
      <p style="margin:0 0 16px;font-size:15px;color:#152025;">Вітаємо, ${escapeHtml(
        name,
      )}! Дякуємо за бронювання. Нижче — деталі вашого візиту.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#152025;">
        <tr><td style="padding:6px 0;color:#5b6b72;">Дата візиту</td><td style="padding:6px 0;text-align:right;font-weight:600;text-transform:capitalize;">${escapeHtml(
          dateUk,
        )}</td></tr>
        <tr><td style="padding:6px 0;color:#5b6b72;">Ім'я</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(
          input.fullName || "—",
        )}</td></tr>
        <tr><td style="padding:6px 0;color:#5b6b72;">Телефон</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(
          input.phone || "—",
        )}</td></tr>
        <tr><td style="padding:6px 0;color:#5b6b72;">Спосіб оплати</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(
          paymentLabel,
        )}</td></tr>
      </table>

      <p style="margin:20px 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5b6b72;">Місця</p>
      <table style="width:100%;border-collapse:collapse;">${seatRowsHtml}</table>

      <div style="margin-top:18px;padding-top:14px;border-top:2px solid #152025;display:flex;justify-content:space-between;">
        <span style="font-size:15px;font-weight:700;color:#152025;">Разом</span>
        <span style="font-size:15px;font-weight:700;color:#152025;float:right;">${escapeHtml(
          total,
        )}</span>
      </div>

      ${detailsHtml}

      <p style="margin:22px 0 0;font-size:13px;color:#5b6b72;line-height:1.5;">До зустрічі у Samwood!</p>
    </div>
  </div>
</div>`;

  const text = [
    `SAMWOOD — бронювання підтверджено`,
    ``,
    `Вітаємо, ${name}!`,
    ``,
    `Дата візиту: ${dateUk}`,
    `Ім'я: ${input.fullName || "—"}`,
    `Телефон: ${input.phone || "—"}`,
    `Спосіб оплати: ${paymentLabel}`,
    ``,
    `Місця:`,
    ...seatLines.map((l) => `  - ${l}`),
    ``,
    `Разом: ${total}`,
    ...(input.details?.trim() ? [``, `Ваші деталі: ${input.details.trim()}`] : []),
    ``,
    `До зустрічі у Samwood!`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Будує та надсилає лист-підтвердження. Кидає помилку при збої —
 * викликати у try/catch, щоб не ламати основний потік бронювання.
 */
export async function sendBookingConfirmationEmail(
  input: BookingConfirmationInput,
): Promise<void> {
  const { subject, html, text } = buildBookingConfirmationEmail(input);
  await sendEmail({ to: input.to, subject, html, text });
}
