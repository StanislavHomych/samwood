import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** `reflect-metadata` не виносити в externals — інакше TypeORM не знаходить метадані сутностей (EntityMetadataNotFoundError). */
  serverExternalPackages: ["typeorm", "pg"],
};

export default nextConfig;
