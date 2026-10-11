# Website Screenshots Serverless

Next.js app that renders a clean PNG thumbnail screenshot of any website. The homepage has a URL input; submitting it calls the screenshot API and displays the captured image. Cookie consent banners are automatically removed for clutter-free captures.

The homepage is SEO-friendly: descriptive meta tags, Open Graph and Twitter cards, and JSON-LD structured data (`WebApplication` and `FAQPage`). Set `NEXT_PUBLIC_SITE_URL` to your deployed URL to enable the canonical link and social sharing URLs:

```bash
NEXT_PUBLIC_SITE_URL="https://screenshot.example.com" pnpm dev
```

## Usage

The API takes a `url` parameter and returns a **PNG screenshot** of the top visible area (default 1280×720).

```
/api?url=https://bookllo.com
```

Or open the homepage at `http://localhost:3000/`, enter a URL, and click **Take Screenshot**.

## Local Development

```bash
pnpm install
pnpm dev
```

Then open or curl the endpoint:

- **Default Thumbnail (1280×720)**:  
  `http://localhost:3000/api?url=https://bookllo.com`
- **Custom Dimensions (e.g. 1200×630 for Social / OG image)**:  
  `http://localhost:3000/api?url=https://bookllo.com&width=1200&height=630`

Locally, the API launches a system Chrome installation (searched in the usual macOS/Linux/Windows locations). To use a custom binary, set its path:

```bash
CHROME_EXECUTABLE_PATH="/path/to/chrome" pnpm dev
```

---

## Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `url` | string | *(required)* | Website URL to capture. `https://` is added automatically if no protocol is given |
| `width` | number | `1280` | Viewport width in pixels |
| `height` | number | `720` | Viewport height in pixels |
| `blockCookies` | boolean | `true` | Automatically dismiss cookie consent banners |
| `waitUntil` | string | `load` | Navigation event (`domcontentloaded`, `load`, `networkidle2`) |
| `timeout` | number | `30000` | Navigation timeout in ms |

---

## Error Responses

On failure the API returns JSON instead of an image:

| Status | `error` | Cause |
|---|---|---|
| `400` | `Missing 'url' query parameter` | No `url` parameter supplied |
| `403` | `Origin not allowed` | Browser request from a non-allowlisted origin |
| `405` | `Method not allowed. Use GET.` | Request used a method other than GET/OPTIONS |
| `500` | *(browser/launch error message)* | Chrome launch failure or page capture error |

Navigation timeouts are non-fatal: the screenshot is captured in whatever state the page has rendered.

---

## Security (CORS)

The API enforces an origin allowlist: browser requests (`fetch`/XHR) coming from
cross-origin websites get **HTTP 403 `{"error":"Origin not allowed"}`** with no
`Access-Control-Allow-Origin` header, so the browser blocks the response.

Allowed browser origins are listed in [`allowed-domains.js`](./allowed-domains.js):

```js
const allowedDomains = [
  // Local development
  "http://localhost:3000",
  "http://localhost:4321",

  // Production origins — add your domains below
  "https://bookllo.com",
];
```

- Same-origin requests (this app's own origin) always work
- Requests **without** an `Origin` header (curl, server-to-server) always work —
  CORS is a browser-enforced policy and cannot restrict them
- Extra origins can also be supplied at runtime via the `ALLOWED_ORIGINS`
  environment variable:

```bash
ALLOWED_ORIGINS="https://mysite.com,https://app.example.com" pnpm dev
```

---

## Deployment

```bash
pnpm dlx vercel
```

The API route runs Chromium through `@sparticuz/chromium` + `puppeteer-core`
(the maintained successor to `chrome-aws-lambda`, which is archived and whose
47 MB binary plus untraceable dynamic requires break serverless bundling).

Deployment requirements:

- **Node.js 22.17+** on Vercel (pinned via `package.json` `engines`; Vercel's
  default is 24.x and 20.x is deprecated). The screenshot API returns HTTP 500
  or fails at launch on older runtimes.
- `next.config.js` keeps both packages external (`serverExternalPackages`) and
  explicitly includes the Chromium archives (`outputFileTracingIncludes`),
  because they are loaded through runtime-built paths that file tracing cannot
  discover. Without this the function deploys but throws
  `ENOENT .../bin/chromium.br` or `MODULE_NOT_FOUND` on first request.
- The `/api` serverless function ships a ~70 MB Chromium archive, well within
  Vercel's 250 MB uncompressed bundle limit. Screenshots of slow pages need up
  to the 300 s Hobby default `maxDuration`, which is already sufficient.

Locally the API uses a system Chrome installation (see
[Local Development](#local-development)) and only falls back to the bundled
Linux Chromium when none is found, so `pnpm dev` works on macOS without any
extra setup.