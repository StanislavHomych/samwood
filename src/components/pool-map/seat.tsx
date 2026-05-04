"use client";

type SeatVariant = "pink" | "orange" | "yellow" | "blue" | "green" | "grey";

type SeatSize = "compact" | "slim" | "normal" | "large";

type SeatProps = {
  id: string;
  label: number;
  variant?: SeatVariant;
  unavailable?: boolean;
  booked: boolean;
  onToggle: (id: string) => void;
  size?: SeatSize;
};

/** Преміум-палітра Rivera: приглушені тони замість насичених базових */
const variantIdle: Record<SeatVariant, string> = {
  pink: "bg-[#8f6674] shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:brightness-110",
  orange:
    "bg-[#9c724e] shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:brightness-110",
  yellow:
    "bg-[#9a8660] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] hover:brightness-110",
  blue: "bg-[#4d6b86] hover:brightness-110",
  green: "bg-[#4d6550] hover:brightness-110",
  grey: "bg-[#4a4a4a]",
};

const variantBooked: Record<SeatVariant, string> = {
  pink:
    "bg-[#5c3d4a] ring-2 ring-[#c9a962]/60 ring-offset-2 ring-offset-white",
  orange:
    "bg-[#5c4028] ring-2 ring-[#c9a962]/60 ring-offset-2 ring-offset-white",
  yellow:
    "bg-[#5c4f32] ring-2 ring-[#c9a962]/60 ring-offset-2 ring-offset-white",
  blue:
    "bg-[#2e3f50] ring-2 ring-[#c9a962]/60 ring-offset-2 ring-offset-white",
  green:
    "bg-[#2f3f32] ring-2 ring-[#c9a962]/60 ring-offset-2 ring-offset-white",
  grey: "bg-[#3d3d3d]",
};

const sizeClass: Record<SeatSize, string> = {
  compact: "h-[18px] w-[14px] text-[7px]",
  slim: "h-[22px] w-[15px] text-[8px] leading-none",
  normal: "h-8 w-7 text-[9px]",
  large: "h-11 w-11 text-sm",
};

export function Seat({
  id,
  label,
  variant = "pink",
  unavailable = false,
  booked,
  onToggle,
  size = "slim",
}: SeatProps) {
  const disabled = unavailable;

  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? "Недоступно" : booked ? "Зняти бронь" : "Обрати місце"}
      onClick={() => !disabled && onToggle(id)}
      className={[
        "flex select-none items-center justify-center rounded font-semibold text-white/95 transition duration-200",
        sizeClass[size],
        disabled
          ? "cursor-not-allowed opacity-55 " + variantIdle.grey
          : booked
            ? variantBooked[variant]
            : variantIdle[variant],
      ].join(" ")}
    >
      {label}
    </button>
  );
}
