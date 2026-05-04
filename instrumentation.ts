/** Завантажує reflect-metadata до TypeORM у Node runtime (Next App Router). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("reflect-metadata");
  }
}
