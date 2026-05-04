"use client";

import { seatZonePalette } from "@/lib/pool/seat-zone-palette";

type SeatVariant = "pink" | "orange" | "yellow" | "blue" | "green" | "grey";

type SeatSize = "compact" | "slim" | "normal" | "large";

type SeatProps = {
  id: string;
  label: number;
  variant?: SeatVariant;
  unavailable?: boolean;
  /** Обрано користувачем (локальний вибір до відправки форми). */
  selected: boolean;
  /** Уже в заявці в БД — не можна обрати. */
  booked?: boolean;
  /** Інший відвідувач зараз тримає місце в чернетці (WebSocket). */
  heldByOther?: boolean;
  /** Ціна за місце, грн — у підказці та для доступності. */
  priceUah?: number;
  onToggle: (id: string) => void;
  size?: SeatSize;
};

const variantIdle: Record<SeatVariant, string> = {
  pink: seatZonePalette.pink.idle,
  orange: seatZonePalette.orange.idle,
  yellow: seatZonePalette.yellow.idle,
  blue: seatZonePalette.blue.idle,
  green: seatZonePalette.green.idle,
  grey: seatZonePalette.grey.idle,
};

const variantSelected: Record<SeatVariant, string> = {
  pink: seatZonePalette.pink.selected,
  orange: seatZonePalette.orange.selected,
  yellow: seatZonePalette.yellow.selected,
  blue: seatZonePalette.blue.selected,
  green: seatZonePalette.green.selected,
  grey: seatZonePalette.grey.selected,
};

const sizeClass: Record<SeatSize, string> = {
  compact: "h-[18px] w-[14px] text-[7px]",
  slim: "h-[22px] w-[15px] text-[8px] leading-none",
  normal: "h-8 w-7 text-[9px]",
  large: "h-11 w-11 text-sm",
};

/** Жовтий ряд — темні цифри для читабельності */
const variantLabelClass: Record<SeatVariant, string> = {
  pink: "text-white/95",
  orange: "text-white/95",
  yellow: "text-slate-900",
  blue: "text-white/95",
  green: "text-white/95",
  grey: "text-white/90",
};

/** Підтверджене бронювання — дуже темно-сіре, суцільна заливка. */
const bookedVisual =
  "cursor-not-allowed border border-slate-950/55 bg-slate-900 text-white shadow-inner";

/** Чернетка іншого користувача — легке сіре. */
const heldByOtherVisual =
  "cursor-not-allowed border border-slate-300/95 bg-slate-200 text-slate-800 shadow-sm";

export function Seat({
  id,
  label,
  variant = "pink",
  unavailable = false,
  selected,
  booked = false,
  heldByOther = false,
  priceUah,
  onToggle,
  size = "slim",
}: SeatProps) {
  const blockedByOther = heldByOther && !selected;
  const disabled = unavailable || booked || blockedByOther;
  const pricePart =
    priceUah != null ? ` · ${priceUah.toLocaleString("uk-UA")} ₴` : "";
  const title = unavailable
    ? "Недоступно"
    : booked
      ? `Заброньовано${pricePart}`
      : blockedByOther
        ? `Хтось інший зараз обирає це місце${pricePart}`
        : selected
          ? `Зняти з вибору${pricePart}`
          : `Обрати місце${pricePart}`;

  const toneClass = unavailable
    ? "text-white/90 opacity-55 " + variantIdle.grey
    : booked
      ? bookedVisual
      : blockedByOther
        ? heldByOtherVisual
        : [
            variantLabelClass[variant],
            selected ? variantSelected[variant] : variantIdle[variant],
          ].join(" ");

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={`Місце ${id}${pricePart}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => !disabled && onToggle(id)}
      className={[
        "flex select-none flex-col items-center justify-center rounded font-semibold transition duration-200",
        sizeClass[size],
        toneClass,
      ].join(" ")}
    >
      <span className="leading-none">{label}</span>
      {priceUah != null && (size === "normal" || size === "large") ? (
        <span
          className={[
            "mt-0.5 text-[6px] font-bold leading-none",
            booked
              ? "text-white/85"
              : blockedByOther
                ? "text-slate-700"
                : variant === "yellow"
                  ? "text-slate-800"
                  : "text-white/80",
          ].join(" ")}
        >
          {priceUah} ₴
        </span>
      ) : null}
    </button>
  );
}
