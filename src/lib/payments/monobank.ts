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

/**
 * Позиція кошика (`merchantPaymInfo.basketOrder`). ОБОВ'ЯЗКОВА, якщо на
 * мерчанті ввімкнена фіскалізація (ПРРО) або спліт-платежі — без неї
 * invoice/create падає з «'basketOrder' cannot be empty».
 */
export type MonobankBasketItem = {
  /** Назва товару/послуги (видно в чеку). */
  name: string;
  /** Кількість. */
  qty: number;
  /** Ціна за одиницю в копійках. */
  sum: number;
  /** Загальна вартість позиції в копійках (qty × sum). */
  total: number;
  /** Код товару в системі мерчанта (потрібен для фіскалізації). */
  code: string;
  /** Одиниця виміру (напр. «шт.»). */
  unit?: string;
};

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
  /**
   * Кошик позицій для фіскального чека. Сума `total` всіх позицій має
   * дорівнювати `amountKopiyky`, інакше Monobank відхилить інвойс.
   */
  basketOrder?: MonobankBasketItem[];
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

  const merchantPaymInfo: Record<string, unknown> = {
    reference: input.reference.slice(0, 128),
    destination: input.destination.slice(0, 128),
  };

  if (input.basketOrder?.length) {
    const basketTotal = input.basketOrder.reduce((s, it) => s + it.total, 0);
    if (basketTotal !== amount) {
      // Розбіжність кошика й суми Monobank відхиляє — краще впасти з ясною
      // помилкою в нас, ніж з криптичною від банку.
      throw new Error(
        `Monobank basketOrder: сума позицій (${basketTotal}) ≠ amount (${amount}).`,
      );
    }
    merchantPaymInfo.basketOrder = input.basketOrder.map((it) => ({
      name: it.name.slice(0, 128),
      qty: it.qty,
      sum: it.sum,
      total: it.total,
      code: it.code.slice(0, 64),
      ...(it.unit ? { unit: it.unit } : {}),
    }));
  }

  const body: Record<string, unknown> = {
    amount,
    ccy: 980,
    redirectUrl: input.redirectUrl,
    merchantPaymInfo,
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

export type MonobankInvoiceStatus =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

export type MonobankInvoiceStatusResult = {
  invoiceId: string;
  status: MonobankInvoiceStatus;
  /** Сума в копійках. */
  amount?: number;
  ccy?: number;
  failureReason?: string;
  errCode?: string;
  modifiedDate?: string;
  /** Повне тіло відповіді — для аудиту в paymentPayloadJson. */
  raw: Record<string, unknown>;
};

/**
 * GET `/api/merchant/invoice/status?invoiceId=...` — статус рахунку.
 * Єдине джерело правди про те, чи оплата справді пройшла.
 */
export async function getMonobankInvoiceStatus(
  invoiceId: string,
): Promise<MonobankInvoiceStatusResult> {
  const token = monobankToken();
  if (!token) {
    throw new Error("MONOBANK_TOKEN не задано. Додайте токен у .env.local (лише на сервері).");
  }

  const url = `${monobankApiBase()}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`;
  const res = await fetch(url, {
    headers: { "X-Token": token },
    cache: "no-store",
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
    const msg = err.errText || err.message || err.errCode || raw || `HTTP ${res.status}`;
    throw new Error(`Monobank: ${msg}`);
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data.invoiceId !== "string" || typeof data.status !== "string") {
    throw new Error("Monobank: неочікувана відповідь invoice/status.");
  }

  return {
    invoiceId: data.invoiceId,
    status: data.status as MonobankInvoiceStatus,
    amount: typeof data.amount === "number" ? data.amount : undefined,
    ccy: typeof data.ccy === "number" ? data.ccy : undefined,
    failureReason: typeof data.failureReason === "string" ? data.failureReason : undefined,
    errCode: typeof data.errCode === "string" ? data.errCode : undefined,
    modifiedDate: typeof data.modifiedDate === "string" ? data.modifiedDate : undefined,
    raw: data,
  };
}

/** Тип фіскального чека (продаж/повернення). */
export type MonobankFiscalCheckType = "sale" | "return";

/** Статус фіскалізації чека. `done` — чек сформовано. */
export type MonobankFiscalCheckStatus =
  | "new"
  | "process"
  | "done"
  | "failed";

export type MonobankFiscalCheck = {
  id: string;
  type: MonobankFiscalCheckType;
  status: MonobankFiscalCheckStatus;
  /** Пояснення статусу (напр. причина `failed`). */
  statusDescription?: string;
  /** Посилання на офіційний чек (cabinet.tax.gov.ua) — з'являється, коли `done`. */
  taxUrl?: string;
  /** PDF чека у base64 (поле `file`) — з'являється, коли `done`. */
  file?: string;
  /** Джерело фіскалізації (`checkbox`, `monopay`, ...). */
  fiscalizationSource?: string;
};

export type MonobankFiscalChecksResult = {
  checks: MonobankFiscalCheck[];
  /** Повне тіло відповіді — для аудиту в paymentPayloadJson. */
  raw: Record<string, unknown>;
};

/**
 * GET `/api/merchant/invoice/fiscal-checks?invoiceId=...` — фіскальні чеки
 * інвойсу та їх статуси. Працює лише коли на мерчанті активна зв'язка з ПРРО
 * (Checkbox) у веб-кабінеті. Фіскалізація асинхронна: одразу після оплати чек
 * може бути ще `new`/`process` (без `taxUrl`/`file`).
 */
export async function getMonobankFiscalChecks(
  invoiceId: string,
): Promise<MonobankFiscalChecksResult> {
  const token = monobankToken();
  if (!token) {
    throw new Error("MONOBANK_TOKEN не задано. Додайте токен у .env.local (лише на сервері).");
  }

  const url = `${monobankApiBase()}/api/merchant/invoice/fiscal-checks?invoiceId=${encodeURIComponent(invoiceId)}`;
  const res = await fetch(url, {
    headers: { "X-Token": token },
    cache: "no-store",
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
    const msg = err.errText || err.message || err.errCode || raw || `HTTP ${res.status}`;
    throw new Error(`Monobank: ${msg}`);
  }

  const data = parsed as Record<string, unknown>;
  const rawChecks = Array.isArray(data.checks) ? data.checks : [];
  const checks: MonobankFiscalCheck[] = rawChecks
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      id: typeof c.id === "string" ? c.id : "",
      type: c.type === "return" ? "return" : "sale",
      status: (["new", "process", "done", "failed"] as const).includes(
        c.status as MonobankFiscalCheckStatus,
      )
        ? (c.status as MonobankFiscalCheckStatus)
        : "new",
      statusDescription:
        typeof c.statusDescription === "string" ? c.statusDescription : undefined,
      taxUrl: typeof c.taxUrl === "string" && c.taxUrl ? c.taxUrl : undefined,
      file: typeof c.file === "string" && c.file ? c.file : undefined,
      fiscalizationSource:
        typeof c.fiscalizationSource === "string" ? c.fiscalizationSource : undefined,
    }));

  return { checks, raw: data };
}

/**
 * Найрелевантніший чек продажу для показу клієнту: спершу готовий (`done`),
 * інакше — перший чек продажу (щоб показати статус «формується»).
 */
export function pickPrimarySaleCheck(
  checks: MonobankFiscalCheck[],
): MonobankFiscalCheck | null {
  const sales = checks.filter((c) => c.type === "sale");
  return sales.find((c) => c.status === "done") ?? sales[0] ?? null;
}

/**
 * Полегшена версія чеків для збереження в БД (`paymentPayloadJson`): без важкого
 * base64 `file`, лише метадані (id/status/taxUrl тощо). PDF клієнт отримує свіжим
 * з відповіді API, а в базі його тримати не треба — інакше роздуває рядки.
 */
export function fiscalChecksForAudit(
  checks: MonobankFiscalCheck[],
): { checks: Omit<MonobankFiscalCheck, "file">[] } {
  return {
    checks: checks.map(({ file: _file, ...rest }) => rest),
  };
}

let cachedPubKeyPem: string | null = null;

/**
 * GET `/api/merchant/pubkey` — ECDSA-ключ для перевірки підпису вебхуків.
 * Відповідь: `{ key: <base64 від PEM> }`. Кешується на процес.
 */
export async function getMonobankWebhookPublicKeyPem(): Promise<string> {
  if (cachedPubKeyPem) return cachedPubKeyPem;

  const token = monobankToken();
  if (!token) {
    throw new Error("MONOBANK_TOKEN не задано — неможливо отримати ключ вебхука.");
  }

  const res = await fetch(`${monobankApiBase()}/api/merchant/pubkey`, {
    headers: { "X-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Monobank: не вдалося отримати pubkey (HTTP ${res.status}).`);
  }

  const data = (await res.json().catch(() => null)) as { key?: string } | null;
  if (!data?.key) {
    throw new Error("Monobank: неочікувана відповідь pubkey.");
  }

  cachedPubKeyPem = Buffer.from(data.key, "base64").toString("utf8");
  return cachedPubKeyPem;
}

/**
 * Перевірка `X-Sign` вебхука: base64 ECDSA(SHA-256) підпис сирого тіла запиту.
 */
export async function verifyMonobankWebhookSignature(
  rawBody: string,
  xSignBase64: string,
): Promise<boolean> {
  if (!xSignBase64.trim()) return false;
  const { createVerify } = await import("node:crypto");
  const pem = await getMonobankWebhookPublicKeyPem();
  try {
    const verifier = createVerify("SHA256");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(pem, Buffer.from(xSignBase64, "base64"));
  } catch {
    return false;
  }
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
