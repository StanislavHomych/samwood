"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Seat } from "./seat";

const MAP_W = 704;
const PLAN_H = 892;

const SCALE_MIN = 0.5;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const DRAG_THRESHOLD_PX = 5;

const S2_GREY = new Set([
  36, 37, 44, 58, 59, 72, 73, 81, 82, 95, 96, 105, 106,
]);
const S3_GREY = new Set([
  124, 125, 134, 135, 148, 149, 158, 159, 168, 169,
]);

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
};

export function PoolMap({
  className = "",
  wideLayout = false,
  resortChrome = false,
}: PoolMapProps) {
  const [booked, setBooked] = useState<Record<string, boolean>>({});
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

  const toggle = useCallback((id: string) => {
    setBooked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => clamp(Number((s + SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => clamp(Number((s - SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
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
      className={`font-[family-name:var(--font-montserrat)] mx-auto flex w-full flex-col items-center gap-6 ${resortChrome ? "font-semibold text-[#2c3d47]" : "text-[#d4d0c8]"} ${wideLayout ? "max-w-none" : "max-w-5xl"} ${className}`}
    >
      <div className="flex w-full max-w-[920px] flex-wrap items-center justify-center gap-4 text-sm">
        <div
          className={[
            "flex items-center gap-1 rounded-lg p-0.5",
            resortChrome
              ? "border border-[#1f3744]/18 bg-[#c7d9e3] shadow-[0_8px_24px_-10px_rgba(6,16,22,0.28),inset_0_1px_0_rgba(255,255,255,0.42)]"
              : "rounded-md border border-[#c9a962]/25 bg-[#141312] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.9)]",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={zoomOut}
            className={[
              "flex h-9 min-w-9 items-center justify-center rounded px-3 text-lg transition",
              resortChrome
                ? "font-semibold text-[#143038] hover:bg-[#aabfc9]/92 hover:text-teal-950"
                : "font-light text-[#e8e4dc] hover:bg-[#c9a962]/12 hover:text-[#c9a962]",
            ].join(" ")}
            aria-label="Зменшити масштаб"
          >
            −
          </button>
          <span
            className={[
              "min-w-[3.5rem] text-center tabular-nums text-[11px] uppercase tracking-[0.2em]",
              resortChrome
                ? "font-semibold text-[#3b525f]"
                : "text-[#9a968c]",
            ].join(" ")}
          >
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className={[
              "flex h-9 min-w-9 items-center justify-center rounded px-3 text-lg transition",
              resortChrome
                ? "font-semibold text-[#143038] hover:bg-[#aabfc9]/92 hover:text-teal-950"
                : "font-light text-[#e8e4dc] hover:bg-[#c9a962]/12 hover:text-[#c9a962]",
            ].join(" ")}
            aria-label="Збільшити масштаб"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={resetView}
          className={[
            "rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition",
            resortChrome
              ? "border border-[#213c48]/24 bg-[#bed1db] text-[#15252d] shadow-sm hover:border-teal-900/45 hover:text-teal-950"
              : "rounded-md border border-[#c9a962]/30 bg-transparent text-[#b8b4a8] hover:border-[#c9a962]/50 hover:text-[#c9a962]",
          ].join(" ")}
        >
          Скинути вигляд
        </button>
        <span
          className={[
            "max-w-[min(100%,20rem)] text-center text-[11px]",
            resortChrome
              ? "font-semibold text-[#3b4e59]"
              : "font-light text-[#6a6862]",
          ].join(" ")}
        >
          Тягніть карту мишею / пальцем · колесо — масштаб
        </span>
      </div>

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
                  {leftNums.map((n) => (
                    <Seat
                      key={n}
                      id={`L-${n}`}
                      label={n}
                      variant="yellow"
                      size="compact"
                      unavailable={false}
                      booked={!!booked[`L-${n}`]}
                      onToggle={toggle}
                    />
                  ))}
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
                        {block.map((n) => (
                          <Seat
                            key={n}
                            id={`S2-${n}`}
                            label={n}
                            variant="pink"
                            size="slim"
                            unavailable={S2_GREY.has(n)}
                            booked={!!booked[`S2-${n}`]}
                            onToggle={toggle}
                          />
                        ))}
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
                        {block.map((n) => (
                          <Seat
                            key={n}
                            id={`S3-${n}`}
                            label={n}
                            variant="orange"
                            size="slim"
                            unavailable={S3_GREY.has(n)}
                            booked={!!booked[`S3-${n}`]}
                            onToggle={toggle}
                          />
                        ))}
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
                      {bottomGreen.map((n) => (
                        <Seat
                          key={n}
                          id={`G-${n}`}
                          label={n}
                          variant="green"
                          size="normal"
                          booked={!!booked[`G-${n}`]}
                          onToggle={toggle}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {bottomBlue.map((n) => (
                        <Seat
                          key={n}
                          id={`B-${n}`}
                          label={n}
                          variant="blue"
                          size="large"
                          booked={!!booked[`B-${n}`]}
                          onToggle={toggle}
                        />
                      ))}
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
                    booked={!!booked["R-8"]}
                    onToggle={toggle}
                  />
                  <LadderIcon />
                  <Seat
                    id="R-10"
                    label={10}
                    variant="blue"
                    size="large"
                    booked={!!booked["R-10"]}
                    onToggle={toggle}
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
