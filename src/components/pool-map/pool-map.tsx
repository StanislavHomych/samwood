"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { priceForSeatId } from "@/lib/pool/seat-pricing";
import { Seat } from "./seat";
import { SeatPricingLegend } from "./seat-pricing-legend";

const MAP_W = 704;
const PLAN_H = 892;

const SCALE_MIN = 0.5;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const DRAG_THRESHOLD_PX = 5;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function VipCluster({ index }: { index: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="grid grid-cols-3 place-items-center gap-0.5">
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="flex h-4 w-4 items-center justify-center rounded-sm border border-[#c9a962]/25 bg-[#2a2622] text-[7px] font-bold text-[#c9a962]">
          {index + 1}
        </div>
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
        <div className="h-1.5 w-1.5 rotate-45 bg-[#6a6358]" />
      </div>
    </div>
  );
}

function LadderIcon() {
  return (
    <div
      className="flex h-10 w-[18px] flex-col justify-between rounded border border-[#4a4540] bg-[#2a2724] px-0.5 py-0.5"
      aria-hidden
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[2px] w-full rounded-sm bg-[#c9a962]/25" />
      ))}
      <div className="mx-auto h-[3px] w-[3px] rounded-full bg-[#c9a962]/40" />
    </div>
  );
}

type PoolMapProps = {
  /** Додати клас до кореня */
  className?: string;
  /** Займати всю ширину батьківської колонки (бронювання 70%) */
  wideLayout?: boolean;
  /** Світлий «курортний» хром панелі масштабу та рамки огляду */
  resortChrome?: boolean;
  /** Вибрані місця (ключ — id місця). Батько тримає `{}` за замовчуванням. */
  selectedSeats: Record<string, boolean>;
  onSeatToggle: (seatId: string) => void;
  /** Підтверджені заявки з БД (ключ — id місця). */
  bookedSeatIds?: Record<string, boolean>;
  /** Чернетка іншого клієнта (WebSocket). */
  remoteDraftSeatIds?: Record<string, boolean>;
  /** Підказки в легенді: заброньовано / хтось обирає. */
  showOccupancyLegend?: boolean;
};

export function PoolMap({
  className = "",
  wideLayout = false,
  resortChrome = false,
  selectedSeats,
  onSeatToggle,
  bookedSeatIds = {},
  remoteDraftSeatIds = {},
  showOccupancyLegend = false,
}: PoolMapProps) {
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dragMoved = useRef(false);
  const panStart = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const zoomIn = useCallback(() => {
    setScale((s) => clamp(Number((s + SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => clamp(Number((s - SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  const s2Blocks = useMemo(() => chunk(range(29, 112), 28), []);
  const s3Blocks = useMemo(() => chunk(range(119, 178), 20), []);

  const leftNums = range(217, 234);
  const bottomGreen = range(349, 354);
  const bottomBlue = range(16, 20);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragMoved.current = false;
      panStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX,
        panY,
      };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [panX, panY],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = panStart.current;
    if (!start) return;

    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragMoved.current = true;

    setPanX(start.panX + dx);
    setPanY(start.panY + dy);
  }, []);

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    panStart.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  /** Після перетягування не віддаємо «клік» місцю під курсором */
  const onViewportClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragMoved.current) {
        e.preventDefault();
        e.stopPropagation();
        dragMoved.current = false;
      }
    },
    [],
  );

  /** Колесо — як на картах (потрібен non-passive listener) */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP * 0.8 : SCALE_STEP * 0.8;
      setScale((s) =>
        clamp(Number((s + delta).toFixed(2)), SCALE_MIN, SCALE_MAX),
      );
    };
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler);
  }, []);

  return (
    <div
      className={`font-[family-name:var(--font-montserrat)] mx-auto flex w-full flex-col items-center ${resortChrome ? "font-semibold text-[#2c3d47]" : "text-[#d4d0c8]"} ${wideLayout ? "max-w-none" : "max-w-5xl"} ${className}`}
    >
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onClickCapture={onViewportClickCapture}
        className={[
          "relative mx-auto h-[min(78vh,820px)] w-full max-w-[920px] overflow-hidden rounded-xl border select-none touch-none",
          resortChrome
            ? "border-[#1b303d]/34 bg-[#a8bcc8]/88 shadow-[0_22px_50px_-16px_rgba(5,12,18,0.38)] ring-2 ring-teal-950/14"
            : "border-[#c9a962]/20 bg-[#0d0c0b] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(201,169,98,0.06)] ring-1 ring-white/[0.04]",
          dragging ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={[
            "pointer-events-auto absolute left-2 right-2 top-2 z-20 flex items-start gap-1.5 rounded-lg p-1 shadow-sm sm:gap-2 sm:rounded-xl sm:p-1.5",
            resortChrome
              ? "border border-slate-300/50 bg-white/95"
              : "border border-white/12 bg-zinc-900/95",
          ].join(" ")}
        >
          <div
            className={[
              "flex shrink-0 flex-col gap-0.5 rounded-md p-0.5",
              resortChrome
                ? "border border-slate-300/40 bg-slate-100"
                : "border border-white/10 bg-black/50",
            ].join(" ")}
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              disabled={scale <= SCALE_MIN}
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-sm font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-35",
                resortChrome
                  ? "text-slate-800 hover:bg-white active:scale-[0.97]"
                  : "text-zinc-200 hover:bg-white/10 active:scale-[0.97]",
              ].join(" ")}
              aria-label="Зменшити масштаб"
            >
              −
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              disabled={scale >= SCALE_MAX}
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-sm font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-35",
                resortChrome
                  ? "text-slate-800 hover:bg-white active:scale-[0.97]"
                  : "text-zinc-200 hover:bg-white/10 active:scale-[0.97]",
              ].join(" ")}
              aria-label="Збільшити масштаб"
            >
              +
            </button>
          </div>
          <SeatPricingLegend
            resortChrome={resortChrome}
            variant="mapOverlay"
            occupancyLegend={showOccupancyLegend}
          />
        </div>

        {/* pointer-events-none: кліки проходять до карти/seat; viewport ловить bubble */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="pointer-events-auto"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
          >
            <div
              className="relative overflow-hidden bg-white shadow-md ring-1 ring-black/[0.06]"
              style={{
                width: MAP_W,
                minHeight: PLAN_H,
              }}
            >
              <div className="relative z-10 flex min-h-[892px] w-full bg-white">
                <div className="flex w-[32px] shrink-0 flex-col items-center justify-between border-r border-zinc-200/80 py-10 pr-0.5">
                  {leftNums.map((n) => {
                    const sid = `L-${n}`;
                    return (
                      <Seat
                        key={n}
                        id={sid}
                        label={n}
                        variant="yellow"
                        size="compact"
                        unavailable={false}
                        selected={!!selectedSeats[sid]}
                        booked={!!bookedSeatIds[sid]}
                        heldByOther={
                          !!remoteDraftSeatIds[sid] && !selectedSeats[sid]
                        }
                        priceUah={priceForSeatId(sid)}
                        onToggle={onSeatToggle}
                      />
                    );
                  })}
                </div>

                <div className="flex min-w-0 flex-1 flex-col px-1.5">
                  <div className="flex justify-center gap-5 pb-1 pt-2">
                    {[0, 1, 2, 3].map((i) => (
                      <VipCluster key={i} index={i} />
                    ))}
                  </div>

                  <div className="pb-0.5 text-center font-[family-name:var(--font-cormorant)] text-[10px] font-normal tracking-[0.35em] text-[#7a4858]">
                    СЕКТОР 2
                  </div>
                  <div className="mx-auto flex gap-1.5 pb-1.5">
                    {s2Blocks.map((block, bi) => (
                      <div
                        key={bi}
                        className="grid grid-cols-7 gap-x-[2px] gap-y-[2px]"
                      >
                        {block.map((n) => {
                          const sid = `S2-${n}`;
                          return (
                            <Seat
                              key={n}
                              id={sid}
                              label={n}
                              variant="pink"
                              size="slim"
                              selected={!!selectedSeats[sid]}
                              booked={!!bookedSeatIds[sid]}
                              heldByOther={
                                !!remoteDraftSeatIds[sid] && !selectedSeats[sid]
                              }
                              priceUah={priceForSeatId(sid)}
                              onToggle={onSeatToggle}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="relative mx-0.5 my-1 flex h-[108px] items-center justify-center overflow-hidden rounded border-[2px] border-[#1a2a32] shadow-[0_0_0_1px_rgba(201,169,98,0.22),0_12px_40px_-12px_rgba(0,0,0,0.6)]">
                    <div
                      className="absolute inset-0 bg-[#1e3a4a]"
                      style={{
                        backgroundImage: `
                          radial-gradient(ellipse 60% 50% at 20% 30%, rgba(201,169,98,0.12) 0%, transparent 45%),
                          radial-gradient(ellipse 50% 40% at 70% 60%, rgba(255,255,255,0.08) 0%, transparent 40%),
                          repeating-linear-gradient(125deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 7px)
                        `,
                      }}
                    />
                    <span className="relative z-[1] text-center font-[family-name:var(--font-cormorant)] text-[13px] font-normal uppercase leading-tight tracking-[0.18em] text-[#f0ebe3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                      ДОРОСЛИЙ
                      <br />
                      БАСЕЙН
                    </span>
                  </div>

                  <div className="pb-0.5 pt-2 text-center font-[family-name:var(--font-cormorant)] text-[10px] font-normal tracking-[0.35em] text-[#7a5838]">
                    СЕКТОР 3
                  </div>
                  <div className="mx-auto flex gap-1.5 pb-1.5">
                    {s3Blocks.map((block, bi) => (
                      <div
                        key={bi}
                        className="grid grid-cols-5 gap-x-[2px] gap-y-[2px]"
                      >
                        {block.map((n) => {
                          const sid = `S3-${n}`;
                          return (
                            <Seat
                              key={n}
                              id={sid}
                              label={n}
                              variant="orange"
                              size="slim"
                              selected={!!selectedSeats[sid]}
                              booked={!!bookedSeatIds[sid]}
                              heldByOther={
                                !!remoteDraftSeatIds[sid] && !selectedSeats[sid]
                              }
                              priceUah={priceForSeatId(sid)}
                              onToggle={onSeatToggle}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div
                    className="mx-0.5 mb-1.5 h-2 rounded-sm border border-[#3d4a38]/50"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #4a5c44 0 4px, #3d4f3a 4px 8px)",
                    }}
                  />
                  <div className="flex items-end justify-between gap-2 px-0.5 pb-3">
                    <div className="flex gap-1.5">
                      {bottomGreen.map((n) => {
                        const sid = `G-${n}`;
                        return (
                          <Seat
                            key={n}
                            id={sid}
                            label={n}
                            variant="green"
                            size="normal"
                            selected={!!selectedSeats[sid]}
                            booked={!!bookedSeatIds[sid]}
                            heldByOther={
                              !!remoteDraftSeatIds[sid] && !selectedSeats[sid]
                            }
                            priceUah={priceForSeatId(sid)}
                            onToggle={onSeatToggle}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      {bottomBlue.map((n) => {
                        const sid = `B-${n}`;
                        return (
                          <Seat
                            key={n}
                            id={sid}
                            label={n}
                            variant="blue"
                            size="large"
                            selected={!!selectedSeats[sid]}
                            booked={!!bookedSeatIds[sid]}
                            heldByOther={
                              !!remoteDraftSeatIds[sid] && !selectedSeats[sid]
                            }
                            priceUah={priceForSeatId(sid)}
                            onToggle={onSeatToggle}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex w-[36px] shrink-0 flex-col items-center gap-1 border-l border-zinc-200/80 py-4 pl-0.5">
                  <LadderIcon />
                  <Seat
                    id="R-8"
                    label={8}
                    variant="blue"
                    size="large"
                    selected={!!selectedSeats["R-8"]}
                    booked={!!bookedSeatIds["R-8"]}
                    heldByOther={
                      !!remoteDraftSeatIds["R-8"] && !selectedSeats["R-8"]
                    }
                    priceUah={priceForSeatId("R-8")}
                    onToggle={onSeatToggle}
                  />
                  <LadderIcon />
                  <Seat
                    id="R-10"
                    label={10}
                    variant="blue"
                    size="large"
                    selected={!!selectedSeats["R-10"]}
                    booked={!!bookedSeatIds["R-10"]}
                    heldByOther={
                      !!remoteDraftSeatIds["R-10"] && !selectedSeats["R-10"]
                    }
                    priceUah={priceForSeatId("R-10")}
                    onToggle={onSeatToggle}
                  />
                  <LadderIcon />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
