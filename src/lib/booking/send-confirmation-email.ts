import type { DataSource } from "typeorm";
import { isEmailConfigured } from "@/lib/email/mailer";
import { sendBookingConfirmationEmail } from "@/lib/email/booking-confirmation";

export type ConfirmationEmailBooking = {
  id: string;
  email: string | null;
  fullName: string;
  phone: string;
  visitDateKey: string;
  seatIds: string[];
  amountKopiyky: number | null;
  paymentMethod: string;
  details?: string | null;
};

/**
 * Надсилає лист-підтвердження клієнту РІВНО ОДИН РАЗ на бронь.
 *
 * Ідемпотентність: атомарно проставляє `confirmationEmailSentAt` умовним UPDATE
 * (лише якщо ще NULL). Тільки той виклик, що «виграв» гонку (webhook vs confirm),
 * реально шле лист. При збої відправки прапорець скидається — щоб інший шлях
 * (або повторний вебхук) міг спробувати ще раз.
 *
 * Ніколи не кидає — відправка пошти не має ламати основний потік бронювання.
 */
export async function deliverBookingConfirmationOnce(
  ds: DataSource,
  booking: ConfirmationEmailBooking,
): Promise<void> {
  try {
    const email = booking.email?.trim();
    if (!email) return;
    if (!isEmailConfigured()) {
      console.warn(
        "[booking-email] пошта не налаштована (RESEND_API_KEY / EMAIL_FROM) — лист не надіслано",
      );
      return;
    }
    if (!booking.seatIds.length) return;

    // Атомарний «claim»: тільки перший виклик отримає рядок назад.
    const claimed: Array<{ id: string }> = await ds.query(
      `UPDATE "booking_requests"
         SET "confirmationEmailSentAt" = NOW()
       WHERE "id" = $1 AND "confirmationEmailSentAt" IS NULL
       RETURNING "id"`,
      [booking.id],
    );
    if (!claimed.length) return; // Лист уже надіслано іншим шляхом.

    try {
      await sendBookingConfirmationEmail({
        to: email,
        fullName: booking.fullName,
        phone: booking.phone,
        visitDateKey: booking.visitDateKey,
        seatIds: booking.seatIds,
        amountKopiyky: booking.amountKopiyky,
        paymentMethod: booking.paymentMethod,
        details: booking.details ?? null,
      });
    } catch (sendError) {
      // Відкатуємо прапорець, щоб можна було повторити.
      await ds
        .query(
          `UPDATE "booking_requests"
             SET "confirmationEmailSentAt" = NULL
           WHERE "id" = $1`,
          [booking.id],
        )
        .catch(() => {});
      console.error("[booking-email] не вдалося надіслати лист", sendError);
    }
  } catch (e) {
    console.error("[booking-email] неочікувана помилка", e);
  }
}
