/**
 * Відправка листів через Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Використовуємо HTTP API напряму (fetch) — без додаткової залежності.
 *
 * Потрібні змінні середовища (лише на сервері):
 *   RESEND_API_KEY — ключ з кабінету Resend.
 *   EMAIL_FROM     — адреса відправника на підтвердженому домені,
 *                    напр. "Samwood <bron@samwood.com.ua>".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function resendApiKey(): string | undefined {
  const k = process.env.RESEND_API_KEY?.trim();
  return k || undefined;
}

function emailFrom(): string | undefined {
  const f = process.env.EMAIL_FROM?.trim();
  return f || undefined;
}

export function isEmailConfigured(): boolean {
  return Boolean(resendApiKey() && emailFrom());
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Текстова версія (fallback для поштових клієнтів без HTML). */
  text?: string;
};

/**
 * Надсилає лист. Кидає помилку при збої — викликати варто у try/catch,
 * щоб відправка пошти не ламала основний потік бронювання.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const key = resendApiKey();
  const from = emailFrom();
  if (!key || !from) {
    throw new Error(
      "Пошта не налаштована: задайте RESEND_API_KEY та EMAIL_FROM.",
    );
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}
