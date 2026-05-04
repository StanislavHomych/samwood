/**
 * Monobank інтернет-еквайринг (створення рахунку).
 * Документація: https://monobank.ua/api-docs/acquiring/methods/ia/post--api--merchant--invoice--create
 *
 * Після створення інвойсу клієнт переходить на `pageUrl` — там доступні картка,
 * Apple Pay, Google Pay тощо (залежить від браузера / пристрою).
 */

const DEFAULT_API = "https://api.monobank.ua";

export function monobankApiBase(): string {
  return (process.env.MONOBANK_API_URL ?? DEFAULT_API).replace(/\/$/, "");
}

/** Токен з кабінету https://web.monobank.ua/ — лише на сервері. */
export function monobankToken(): string | undefined {
  const t = process.env.MONOBANK_TOKEN?.trim();
  return t || undefined;
}

export function isMonobankConfigured(): boolean {
  return Boolean(monobankToken());
}

export type MonobankCreateInvoiceInput = {
  /** Сума в копійках (ціле число, UAH). */
  amountKopiyky: number;
  /** Підпис у виписці / для пошуку (наприклад id заявки). */
  reference: string;
  /** Текст призначення для клієнта. */
  destination: string;
  /** GET після завершення оплати на стороні monobank. */
  redirectUrl: string;
  /** Опційно: POST webhook при зміні статусу (крім `expired`). */
  webHookUrl?: string;
};

export type MonobankCreateInvoiceResult = {
  invoiceId: string;
  pageUrl: string;
};

type MonobankErrorBody = {
  errCode?: string;
  errText?: string;
  message?: string;
};

/**
 * POST `/api/merchant/invoice/create` — створення рахунку на оплату.
 */
export async function createMonobankInvoice(
  input: MonobankCreateInvoiceInput,
): Promise<MonobankCreateInvoiceResult> {
  const token = monobankToken();
  if (!token) {
    throw new Error(
      "MONOBANK_TOKEN не задано. Додайте токен у .env.local (лише на сервері).",
    );
  }

  const amount = Math.round(input.amountKopiyky);
  if (!Number.isFinite(amount) || amount < 100) {
    throw new Error("amountKopiyky має бути цілим числом ≥ 100 (1 ₴).");
  }

  const url = `${monobankApiBase()}/api/merchant/invoice/create`;

  const body: Record<string, unknown> = {
    amount,
    ccy: 980,
    redirectUrl: input.redirectUrl,
    merchantPaymInfo: {
      reference: input.reference.slice(0, 128),
      destination: input.destination.slice(0, 128),
    },
  };

  if (input.webHookUrl?.trim()) {
    body.webHookUrl = input.webHookUrl.trim();
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": token,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok) {
    const err = parsed as MonobankErrorBody;
    const msg =
      err.errText || err.message || err.errCode || raw || `HTTP ${res.status}`;
    throw new Error(`Monobank: ${msg}`);
  }

  const data = parsed as Partial<MonobankCreateInvoiceResult>;
  if (!data.invoiceId || !data.pageUrl) {
    throw new Error("Monobank: неочікувана відповідь (немає invoiceId або pageUrl).");
  }

  return { invoiceId: data.invoiceId, pageUrl: data.pageUrl };
}

/** @deprecated Використовуйте `createMonobankInvoice`. */
export type MonobankPayLinkInput = {
  amountKopiyky: number;
  description: string;
  redirectUrl: string;
  merchantPaymId?: string;
};

/** @deprecated Використовуйте `createMonobankInvoice`. */
export async function createMonobankPayLink(
  input: MonobankPayLinkInput,
): Promise<{ pageUrl: string }> {
  const r = await createMonobankInvoice({
    amountKopiyky: input.amountKopiyky,
    reference: input.merchantPaymId ?? "pool-booking",
    destination: input.description,
    redirectUrl: input.redirectUrl,
  });
  return { pageUrl: r.pageUrl };
}
