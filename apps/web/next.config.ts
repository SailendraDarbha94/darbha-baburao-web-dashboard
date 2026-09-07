import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages are consumed as raw TypeScript (no build step); Next must compile them.
  transpilePackages: ["@claims/shared", "@claims/supabase"],
};

export default nextConfig;
