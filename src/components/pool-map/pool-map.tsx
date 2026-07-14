"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loungerPriceForVisit } from "@/lib/pool/seat-pricing";
import { Seat } from "./seat";
import { SeatPricingLegend } from "./seat-pricing-legend";

const MAP_W = 704;
const PLAN_H = 560;

const SCALE_MIN = 0.3;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const DRAG_THRESHOLD_PX = 5;
/** Відступ від країв при авто-вписуванні карти у видиму область. */
const FIT_MARGIN = 0.96;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type PoolMapProps = {
  /** Додати клас до кореня */
  className?: string;
  /** Займати всю ширину батьківської колонки (бронювання 70%) */
  wideLayout?: boolean;
  /** День візиту `YYYY-MM-DD` — для денного тарифу на плитках/легенді. */
  visitDateKey?: string;
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
  visitDateKey,
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
  /** Розмір самої карти (для авто-вписування у видиму область). */
  const contentRef = useRef<HTMLDivElement>(null);
  /** Користувач сам змінив масштаб — більше не перебиваємо авто-fit'ом. */
  const userZoomedRef = useRef(false);

  /** Активні вказівники (палець/миша) для pinch-zoom на телефоні. */
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  const zoomIn = useCallback(() => {
    userZoomedRef.current = true;
    setScale((s) => clamp(Number((s + SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    userZoomedRef.current = true;
    setScale((s) => clamp(Number((s - SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  /** Вписати всю карту у видиму область (масштаб + центрування). */
  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    // offsetWidth/Height — розмір ДО transform-scale, тож рахунок коректний.
    const cw = content.offsetWidth || MAP_W;
    const ch = content.offsetHeight || PLAN_H;
    if (!vw || !vh || !cw || !ch) return;
    const fit = Math.min(vw / cw, vh / ch) * FIT_MARGIN;
    setScale(clamp(Number(fit.toFixed(3)), SCALE_MIN, SCALE_MAX));
    setPanX(0);
    setPanY(0);
  }, []);

  // 60 лежаків навколо басейну (дзеркальне розташування).
  // Ліворуч — дві колонки (1–8 зовні, 9–16 всередині), низ 17–30,
  // праворуч — дві колонки (31–39 всередині, 40–45 зовні), верх 46–60.
  const topRow = useMemo(() => range(46, 60), []); // 46 → 60 (зліва направо)
  const bottomRow = useMemo(() => range(17, 30), []); // 17 → 30 (зліва направо)
  const leftInner = useMemo(() => range(31, 39).reverse(), []); // 39 → 31 (згори вниз)
  const leftOuterTop = useMemo(() => [45, 44], []);
  const leftOuterBottom = useMemo(() => [43, 42, 41, 40], []);
  const rightInnerTop = useMemo(() => [9, 10, 11, 12], []);
  const rightInnerBottom = useMemo(() => [13, 14, 15, 16], []);
  const rightOuterTop = useMemo(() => [1, 2, 3, 4], []);
  const rightOuterBottom = useMemo(() => [5, 6, 7, 8], []);

  const loungerPrice = visitDateKey
    ? loungerPriceForVisit(visitDateKey)
    : undefined;

  const seatEl = useCallback(
    (n: number) => {
      const sid = `L-${n}`;
      return (
        <Seat
          key={n}
          id={sid}
          label={n}
          variant="yellow"
          size="normal"
          selected={!!selectedSeats[sid]}
          booked={!!bookedSeatIds[sid]}
          heldByOther={!!remoteDraftSeatIds[sid] && !selectedSeats[sid]}
          priceUah={loungerPrice}
          onToggle={onSeatToggle}
        />
      );
    },
    [selectedSeats, bookedSeatIds, remoteDraftSeatIds, onSeatToggle, loungerPrice],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2) {
        // Другий палець — починаємо pinch-zoom, панораму призупиняємо.
        const [a, b] = [...pointersRef.current.values()];
        pinchRef.current = {
          startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          startScale: scale,
        };
        panStart.current = null;
        dragMoved.current = true; // після pinch не віддаємо «клік» місцю
      } else {
        dragMoved.current = false;
        panStart.current = { clientX: e.clientX, clientY: e.clientY, panX, panY };
        setDragging(true);
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [panX, panY, scale],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Двопальцевий pinch — масштаб від відношення відстаней між пальцями.
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      userZoomedRef.current = true;
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const next = clamp(
        pinchRef.current.startScale * (dist / pinchRef.current.startDist),
        SCALE_MIN,
        SCALE_MAX,
      );
      setScale(Number(next.toFixed(3)));
      return;
    }

    const start = panStart.current;
    if (!start) return;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragMoved.current = true;
    setPanX(start.panX + dx);
    setPanY(start.panY + dy);
  }, []);

  const endPan = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;

      if (pointersRef.current.size === 0) {
        panStart.current = null;
        setDragging(false);
      } else {
        // Лишився один палець — продовжуємо панораму від його позиції.
        const [p] = [...pointersRef.current.values()];
        panStart.current = { clientX: p.x, clientY: p.y, panX, panY };
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [panX, panY],
  );

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
      userZoomedRef.current = true;
      const delta = e.deltaY > 0 ? -SCALE_STEP * 0.8 : SCALE_STEP * 0.8;
      setScale((s) =>
        clamp(Number((s + delta).toFixed(2)), SCALE_MIN, SCALE_MAX),
      );
    };
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler);
  }, []);

  /** Стартовий масштаб — уся карта у видимій області; повтор при зміні розміру/повороті. */
  useLayoutEffect(() => {
    fitToViewport();
    const onResize = () => {
      if (!userZoomedRef.current) fitToViewport();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [fitToViewport]);

  const stripCol = "flex flex-col justify-between rounded-lg bg-zinc-100/90 px-1.5 py-2 ring-1 ring-zinc-200/70";
  const stripRow = "flex items-center gap-1.5 rounded-lg bg-zinc-100/90 px-2 py-1.5 ring-1 ring-zinc-200/70";
  const seatGroupCol = "flex flex-col items-center gap-1.5";

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
          "relative mx-auto h-[min(62vh,620px)] w-full max-w-[920px] overflow-hidden rounded-xl border select-none touch-none sm:h-[min(78vh,820px)]",
          resortChrome
            ? "border-[#1b303d]/34 bg-[#a8bcc8]/88 shadow-[0_22px_50px_-16px_rgba(5,12,18,0.38)] ring-2 ring-teal-950/14"
            : "border-[#c9a962]/20 bg-[#0d0c0b] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(201,169,98,0.06)] ring-1 ring-white/[0.04]",
          dragging ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={[
            "pointer-events-auto absolute left-1.5 right-1.5 top-1.5 z-20 flex items-start gap-1 rounded-lg p-1 shadow-sm sm:left-2 sm:right-2 sm:top-2 sm:gap-2 sm:rounded-xl sm:p-1.5",
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
            loungerPriceUah={loungerPrice}
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
              ref={contentRef}
              className="relative overflow-hidden bg-white shadow-md ring-1 ring-black/[0.06]"
              style={{
                width: MAP_W,
                minHeight: PLAN_H,
              }}
            >
              {/* План: 60 лежаків навколо басейну */}
              <div
                className="relative z-10 flex w-full flex-col items-center justify-center gap-3 bg-white px-5 py-6"
                style={{ minHeight: PLAN_H }}
              >
                {/* Верхній ряд: 60 → 46 */}
                <div className={stripRow}>{topRow.map(seatEl)}</div>

                {/* Середня смуга (дзеркально): 1–16 ліворуч · басейн · 31–45 праворуч */}
                <div className="flex w-full items-stretch justify-center gap-2.5">
                  {/* Зовнішня колонка 1–4 / 5–8 (ліворуч) */}
                  <div className={stripCol}>
                    <div className={seatGroupCol}>{rightOuterTop.map(seatEl)}</div>
                    <div className={seatGroupCol}>
                      {rightOuterBottom.map(seatEl)}
                    </div>
                  </div>

                  {/* Внутрішня колонка 9–12 / 13–16 (ліворуч) */}
                  <div className={stripCol}>
                    <div className={seatGroupCol}>{rightInnerTop.map(seatEl)}</div>
                    <div className={seatGroupCol}>
                      {rightInnerBottom.map(seatEl)}
                    </div>
                  </div>

                  {/* Басейн */}
                  <div className="relative flex min-h-[260px] min-w-[260px] flex-1 items-center justify-center overflow-hidden rounded-lg border-[2px] border-[#1a2a32] shadow-[0_0_0_1px_rgba(201,169,98,0.22),0_12px_40px_-12px_rgba(0,0,0,0.6)]">
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
                    <span className="relative z-[1] text-center font-[family-name:var(--font-cormorant)] text-[18px] font-normal uppercase tracking-[0.2em] text-[#f0ebe3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                      БАСЕЙН
                    </span>
                  </div>

                  {/* Внутрішня колонка 39 → 31 (праворуч) */}
                  <div className={`${stripCol} justify-center`}>
                    <div className={seatGroupCol}>{leftInner.map(seatEl)}</div>
                  </div>

                  {/* Зовнішня колонка 45→40 (праворуч, менший блок; підняті догори, вільне місце лишається знизу) */}
                  <div className={`${stripCol} justify-start`}>
                    <div className={seatGroupCol}>
                      {leftOuterTop.map(seatEl)}
                      {leftOuterBottom.map(seatEl)}
                    </div>
                  </div>
                </div>

                {/* Нижній ряд: 30 → 17 */}
                <div className={stripRow}>{bottomRow.map(seatEl)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
