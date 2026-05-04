"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { BookCta } from "./book-cta";

function enc(name: string) {
  return encodeURIComponent(name);
}

const heroImage = `/images/${enc("Image(11).jpg")}`;
const splitImg = `/images/${enc("Image(22).jpg")}`;
const stayImg = `/images/${enc("12345.jpg")}`;

const gallery = [
  { file: enc("123.jpg"), label: "Велнес" },
  { file: enc("Image(9).jpg"), label: "Декор території" },
  { file: enc("1234.jpg"), label: "Атмосфера" },
  { file: enc("Image(14).jpg"), label: "Деталі" },
  { file: enc("12314.jpg"), label: "Сервіс" },
];

const easeLux = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15, margin: "0px 0px -60px 0px" },
  transition: { duration: 0.95, ease: easeLux },
};

const fadeUpStrong = {
  initial: { opacity: 0, y: 56 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12, margin: "0px 0px -40px 0px" },
  transition: { duration: 1, ease: easeLux },
};

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-svh min-h-[100svh] w-[56px] flex-col justify-between border-r border-[#c9a962]/20 bg-[#0a0a0a] py-7 md:w-[72px] md:py-8">
      <button
        type="button"
        className="mx-auto flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center gap-1 rounded border border-[#c9a962]/40 text-[#c9a962] transition hover:bg-[#c9a962]/10 md:h-11 md:w-11"
        aria-label="Меню"
      >
        <span className="h-px w-5 bg-current md:w-[22px]" />
        <span className="h-px w-5 bg-current md:w-[22px]" />
        <span className="h-px w-5 bg-current md:w-[22px]" />
      </button>

      <div className="flex min-h-0 flex-1 items-center justify-center py-10">
        <span
          className="origin-center font-[family-name:var(--font-cormorant)] text-sm font-normal tracking-[0.48em] text-[#d4bc7a]/90 [writing-mode:vertical-rl] md:text-[15px] md:tracking-[0.52em]"
          style={{ textOrientation: "mixed" }}
        >
          RIVERA
        </span>
      </div>

      <div className="flex flex-shrink-0 flex-col items-center gap-4 pb-1">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black text-[11px] font-semibold uppercase leading-none tracking-tighter text-white md:h-9 md:w-9"
          aria-hidden
        >
          N
        </div>
      </div>
    </aside>
  );
}

export function LandingPage() {
  const [galleryHover, setGalleryHover] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-[family-name:var(--font-montserrat)] text-white">
      <Sidebar />

      <div className="pl-[56px] md:pl-[72px]">
        {/* Hero */}
        <header className="relative min-h-[100svh] overflow-hidden">
          {/* Перший вхід: «занавіс» і повільний паралакс фону */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-30 bg-[#070707]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.33, 0, 0.2, 1] }}
          />
          <motion.div
            className="absolute inset-0 z-0"
            initial={{ scale: 1.09 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_40%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/52 to-black/28" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/84 via-transparent to-[#0a0a0a]/38" />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0 z-20 opacity-35 mix-blend-overlay"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0.32 }}
            transition={{ duration: 1.35, ease: "easeOut" }}
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 18% 32%, rgba(201,169,98,0.25) 0%, transparent 45%)",
            }}
          />

          <div className="relative z-10 flex min-h-[100svh] flex-col px-6 pb-16 pt-9 md:px-14 md:pb-24 md:pt-12">
            <div className="flex shrink-0 justify-end">
              <BookCta />
            </div>

            <div className="mt-auto flex max-w-lg flex-col gap-7 md:max-w-[34rem] md:gap-8 lg:max-w-[40rem]">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.62em", y: 10 }}
                animate={{ opacity: 1, letterSpacing: "0.5em", y: 0 }}
                transition={{ duration: 1.05, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="font-[family-name:var(--font-cormorant)] text-base tracking-[0.5em] text-[#cdb87a] md:text-lg md:tracking-[0.52em]"
              >
                ЗАТИШОК І ВОДА
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 48, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.35, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="font-[family-name:var(--font-cormorant)] text-[2.3rem] font-light leading-[1.06] tracking-tight text-white sm:text-[2.75rem] md:text-[3.85rem] md:leading-[1.04] lg:text-[4.35rem]"
              >
                Місце де час сповільнюється
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.05, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl text-base font-light leading-[1.8] tracking-wide text-[#d8d8d8]/93 md:text-lg md:leading-[1.78]"
              >
                <strong className="font-medium text-[#f5f5dc]">Rivera</strong> — простір із дорослим басейном, авторським
                ландшафтом і приватними зонами відпочинку. Ми створили атмосферу дорогої тиші — без зайвого шуму, лише ритм води й світла.
              </motion.p>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-28 px-6 py-24 md:px-14 md:py-36">
          <motion.section {...fadeUpStrong}>
            <motion.div
              className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.85, ease: easeLux }}
            >
              <h2 className="font-[family-name:var(--font-cormorant)] text-[2rem] font-light md:text-[2.45rem] lg:text-[2.85rem]">
                Простори, які вас чекають
              </h2>
              <p className="max-w-md text-sm font-light uppercase tracking-[0.28em] text-[#c9a962]/90 md:text-[15px] md:tracking-[0.32em]">
                Від першого променя до вечірньої лампи над водою
              </p>
            </motion.div>

            <div className="grid gap-px overflow-hidden rounded-sm border border-[#c9a962]/15 bg-[#c9a962]/15 md:grid-cols-2">
              <motion.div
                className="space-y-6 bg-[#e8e2d8] p-10 text-[#1a1814] md:p-14 md:pr-12 md:pb-16"
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.9, delay: 0.08, ease: easeLux }}
              >
                <div className="h-px w-12 bg-[#c9a962]" aria-hidden />
                <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light md:text-[2.05rem]">
                  Усе для відновлення без поспіху
                </p>
                <p className="font-[family-name:var(--font-montserrat)] text-[16px] font-light leading-[1.8] tracking-wide opacity-92 md:text-[17px]">
                  Тераси з навісами, дорослий басейн із чітко відведеними зонами й увага до вашого простору. Rivera поєднує клубний
                  підхід із відкритим горизонтом — аби ви відчули спокій, як у дорогій резиденції біля води.
                </p>
              </motion.div>
              <motion.div
                className="relative min-h-[320px] md:min-h-[420px]"
                initial={{ opacity: 0, x: 36 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.95, delay: 0.12, ease: easeLux }}
              >
                <motion.div
                  initial={{ opacity: 0.5, scale: 1.06 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 1.1, delay: 0.05, ease: easeLux }}
                  className="relative h-full w-full overflow-hidden bg-[#1a1814]"
                >
                  <Image
                    src={splitImg}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-[1.8s]"
                  />
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section {...fadeUpStrong}>
            <motion.h2
              className="mb-14 font-[family-name:var(--font-cormorant)] text-[2rem] font-light md:text-[2.55rem] lg:text-[2.95rem]"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: easeLux }}
            >
              Світ Rivera
            </motion.h2>
            {/* lg+: горизонтальний акордеон — hover розширює одну колонку, інші звужуються */}
            <div
              role="presentation"
              className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:flex lg:h-[min(52vh,580px)] lg:min-h-[340px] lg:max-h-[620px] lg:gap-2 lg:gap-3"
              onMouseLeave={() => setGalleryHover(null)}
            >
              {gallery.map(({ file, label }, i) => {
                const isExpanded =
                  galleryHover !== null && galleryHover === i;

                const lgFlexClass =
                  galleryHover === null
                    ? "lg:flex-1"
                    : isExpanded
                      ? "lg:flex-[2.35]"
                      : "lg:flex-[0.66]";

                return (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, y: 48 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{
                      once: true,
                      amount: 0.15,
                      margin: "0px 0px -80px 0px",
                    }}
                    transition={{
                      duration: 0.82,
                      delay: i * 0.075,
                      ease: easeLux,
                    }}
                    onMouseEnter={() => setGalleryHover(i)}
                    style={{
                      transition:
                        "flex-grow 680ms cubic-bezier(0.22, 1, 0.36, 1), flex-shrink 680ms cubic-bezier(0.22, 1, 0.36, 1), flex-basis 680ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 400ms ease, border-color 400ms ease",
                    }}
                    className={[
                      "group relative min-h-0 cursor-pointer overflow-hidden rounded-md bg-[#141412] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]",
                      /* мобільна сітка: фіксовані пропорції */
                      "aspect-[3/5] lg:aspect-auto lg:h-full",
                      lgFlexClass,
                      "lg:min-w-[52px]",
                      isExpanded &&
                        "z-10 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)] ring-[#c9a962]/30",
                      galleryHover !== null && !isExpanded
                        ? "lg:opacity-[0.88]"
                        : "lg:opacity-100",
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 overflow-hidden">
                      <Image
                        src={`/images/${file}`}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 22vw, (min-width:768px) 33vw, 50vw"
                        className="object-cover opacity-93 transition-[transform,opacity] duration-[0.7s] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:scale-[1.08] group-hover:opacity-100 lg:group-hover:scale-[1.06]"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent opacity-95 transition-opacity duration-500 group-hover:from-black/92" />
                    <p
                      className={[
                        "pointer-events-none absolute bottom-3 left-3 right-3 text-[11px] uppercase tracking-[0.28em] text-white md:bottom-4 md:left-4 md:text-xs",
                        "transition-opacity duration-500",
                        galleryHover !== null && !isExpanded
                          ? "opacity-85"
                          : "opacity-100",
                      ].join(" ")}
                    >
                      {label}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            {...fadeUpStrong}
            className="grid gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-20"
          >
            <motion.div
              className="group relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-sm md:max-w-none"
              initial={{ opacity: 0, scale: 0.92, rotate: -0.25 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 1, ease: easeLux }}
            >
              <Image
                src={stayImg}
                alt=""
                fill
                sizes="(min-width:768px) 45vw, 90vw"
                className="object-cover transition-transform duration-[0.7s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, delay: 0.12, ease: easeLux }}
            >
              <div className="mx-auto mb-8 h-px w-24 bg-[#c9a962]/55" aria-hidden />
              <p className="mb-6 font-[family-name:var(--font-cormorant)] text-xs uppercase tracking-[0.45em] text-[#c9a962] md:text-[13px]">
                Rivera experience
              </p>
              <h2 className="mb-8 font-[family-name:var(--font-cormorant)] text-[2rem] font-light leading-tight md:text-[2.55rem]">
                Залишайтесь у просторі, де все враховано
              </h2>
              <p className="mb-10 max-w-xl text-[16px] font-light leading-[1.85] tracking-wide text-[#cfcfcf]/95 md:text-lg">
                Персональне супроводження, чистота й готовність просторів — без зборів у чергах та без перевантажених локацій. Оберіть дату й
                закріпть лежаки чи столик: інтерактивна карта дозволяє наочно обрати ряд і час візиту.
              </p>
              <p className="text-sm uppercase tracking-[0.28em] text-[#9a9a9a]">
                Бронювання —{" "}
                <Link href="/bron" className="text-[#c9a962]/90 underline-offset-4 transition hover:text-[#c9a962] hover:underline">
                  відкрити карту місць
                </Link>
              </p>
            </motion.div>
          </motion.section>
        </div>

        <footer className="border-t border-[#c9a962]/15 bg-black/40 px-6 py-12 md:px-14 md:py-16">
          <motion.div {...fadeUp} className="mx-auto flex max-w-[1400px] flex-col gap-10 md:flex-row md:justify-between md:gap-14">
            <div>
              <p className="font-[family-name:var(--font-cormorant)] text-[2rem] tracking-wide text-[#f5f5dc] md:text-[2.35rem]">
                Rivera
              </p>
              <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#aaa] md:text-base">
                Закритий комплекс дорослого басейну та просторів відпочинку. Тиша як стандарт, світло як акцент, ваша зона — без компромісів.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-14 gap-y-6 text-[11px] uppercase tracking-[0.28em] text-[#c9a962]/70">
              <Link href="/bron" className="transition hover:text-[#c9a962]">
                Забронювати
              </Link>
              <span className="cursor-default hover:text-[#f5f5dc]/50">Instagram</span>
              <span className="cursor-default hover:text-[#f5f5dc]/50">Telegram</span>
            </div>
          </motion.div>
          <div className="mx-auto mt-14 max-w-[1400px] border-t border-white/5 pt-8 text-[11px] text-[#666]">
            © {new Date().getFullYear()} Rivera. Усі права захищено.
          </div>
        </footer>
      </div>
    </div>
  );
}

