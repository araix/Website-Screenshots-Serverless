/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverExternalPackages keeps these CJS/binary packages out of the
  // server bundle, so Node resolves them from node_modules at runtime
  // (the pnpm .pnpm layout) instead of being bundled and rewritten.
  serverExternalPackages: ["chrome-aws-lambda", "puppeteer-core"],
};

export default nextConfig;
