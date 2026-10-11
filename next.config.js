/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep CJS/binary packages external so Node resolves them from node_modules
  // at runtime instead of bundling and relocating them. @sparticuz/chromium
  // derives its binary path from the module's own location, so it must not be
  // bundled (esbuild/webpack would move it and executablePath() would throw
  // "The input directory ... does not exist").
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // @sparticuz/chromium loads its .br archives through paths built at runtime
  // (import.meta.url + join()), which file tracing cannot follow statically.
  // The archives must be included explicitly or the Lambda throws
  // MODULE_NOT_FOUND / ENOENT at executablePath() time.
  outputFileTracingIncludes: {
    "/api": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
