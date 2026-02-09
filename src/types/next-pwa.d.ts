declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPWAOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    [key: string]: any;
  };

  export default function withPWA(
    options?: WithPWAOptions,
  ): (nextConfig: NextConfig) => NextConfig;
}
