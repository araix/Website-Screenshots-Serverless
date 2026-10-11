import { useEffect, useState } from "react";
import Head from "next/head";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

const meta = {
  title: "Website Screenshot — Free Screenshot API",
  description:
    "Capture clean PNG screenshots of any website in seconds. Free screenshot tool and API that returns a raw PNG image. Cookie consent banners are removed automatically.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Website Screenshot",
  url: siteUrl || undefined,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Capture PNG screenshots of any URL",
    "Simple GET request returns a raw PNG image",
    "Automatic cookie consent banner removal",
    "Custom viewport dimensions",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is the screenshot tool free?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes, the tool is completely free. Enter a URL on the homepage or call the API directly.",
      },
    },
    {
      "@type": "Question",
      name: "How do I take a screenshot with the API?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Send a GET request to /api?url=https://example.com. The response is a raw PNG image. You can customize it with the width, height, blockCookies, waitUntil, and timeout query parameters.",
      },
    },
    {
      "@type": "Question",
      name: "Can other websites call the API directly from a browser?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Cross-origin browser requests are restricted to an allowlist of trusted domains and rejected with HTTP 403 otherwise. Server-to-server calls without an Origin header, such as curl or backend integrations, always work.",
      },
    },
    {
      "@type": "Question",
      name: "What size are the screenshots?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "By default each screenshot captures the top visible area at 1280x720 pixels. Pass width and height parameters to capture other dimensions, for example 1200x630 for social preview images.",
      },
    },
  ],
};

const features = [
  {
    title: "One-click capture",
    text: "Paste any URL and get a PNG of its visible area instantly, rendered with real headless Chrome.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
        <circle cx="12" cy="12.5" r="3.5" />
      </svg>
    ),
  },
  {
    title: "Free to use",
    text: "The homepage and API are completely free — enter a URL and get a PNG back. No usage dashboard, no setup.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
      </svg>
    ),
  },
  {
    title: "Clean captures",
    text: "Cookie consent banners and overlays are automatically dismissed for clutter-free screenshots.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  // Read the browser origin after mount so SSR and client markup stay identical.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const exampleUrl = "https://example.com";

  async function handleSubmit(e) {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;

    setLoading(true);
    setError("");
    setScreenshot(null);

    try {
      const res = await fetch(`/api?url=${encodeURIComponent(target)}`);
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        throw new Error(data.error || "Failed to capture screenshot");
      }
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setScreenshot((prev) => {
        if (prev) URL.revokeObjectURL(prev.src);
        return { src: objectUrl, capturedUrl: target };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta
          name="keywords"
          content="website screenshot, screenshot api, url to image, page screenshot, free screenshot tool, png screenshot, website thumbnail"
        />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {siteUrl && <link rel="canonical" href={siteUrl} />}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:site_name" content="Website Screenshot" />
        {siteUrl && <meta property="og:url" content={siteUrl} />}
        {siteUrl && <meta property="og:image" content={`${siteUrl}/api?url=${siteUrl}`} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        {siteUrl && <meta name="twitter:image" content={`${siteUrl}/api?url=${siteUrl}`} />}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </Head>

      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="/">
            <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
              <rect x="18" y="4" width="12" height="10" rx="3" fill="currentColor" />
              <rect x="4" y="14" width="56" height="40" rx="8" fill="currentColor" />
              <circle cx="32" cy="34" r="13" fill="#ffffff" />
              <circle cx="32" cy="34" r="6.5" fill="currentColor" />
            </svg>
            Website Screenshot
          </a>
          <nav className="topnav" aria-label="Main">
            <a href="#features">Features</a>
            <a href="#api">API</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>Screenshot any website in seconds</h1>
          <p className="hero-sub">
            Paste a URL and capture a clean PNG of its visible area — rendered with headless Chrome, cookie banners removed.
          </p>

          <form onSubmit={handleSubmit} className="form">
            <label className="sr-only" htmlFor="url-input">
              Website URL
            </label>
            <input
              id="url-input"
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              spellCheck="false"
            />
            <button type="submit" disabled={loading || !url.trim()}>
              {loading ? "Capturing..." : "Take Screenshot"}
            </button>
          </form>

          {error && (
            <p className="message error" role="alert">
              {error}
            </p>
          )}
          {loading && <p className="message">Capturing screenshot, this may take a few seconds...</p>}

          {screenshot && (
            <figure className="result">
              <img src={screenshot.src} alt={`Screenshot of ${screenshot.capturedUrl}`} width={1280} height={720} />
              <figcaption>
                <a href={screenshot.src} download="screenshot.png" className="download">
                  Download PNG
                </a>
              </figcaption>
            </figure>
          )}
        </section>

        <section id="features" className="features" aria-label="Features">
          {features.map((f) => (
            <article className="feature" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </section>

        <section id="api" className="api-docs">
          <h2>Screenshot API</h2>
          <p>Send a GET request and receive a raw PNG image:</p>

          <pre className="code-block">
            <code>{`GET ${origin}/api?url=${exampleUrl}`}</code>
          </pre>

          <p>
            The response is a raw <strong>PNG image</strong>, ready to embed with an <code>&lt;img&gt;</code> tag or save to disk.
          </p>

          <h3>Parameters</h3>
          <div className="table-wrap">
            <table className="params-table">
              <thead>
                <tr>
                  <th scope="col">Parameter</th>
                  <th scope="col">Type</th>
                  <th scope="col">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>url</code>
                  </td>
                  <td>string</td>
                  <td>—</td>
                  <td>
                    Website URL to capture (required). <code>https://</code> is added if missing.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>width</code>
                  </td>
                  <td>number</td>
                  <td>1280</td>
                  <td>Viewport width in pixels</td>
                </tr>
                <tr>
                  <td>
                    <code>height</code>
                  </td>
                  <td>number</td>
                  <td>720</td>
                  <td>Viewport height in pixels</td>
                </tr>
                <tr>
                  <td>
                    <code>blockCookies</code>
                  </td>
                  <td>boolean</td>
                  <td>true</td>
                  <td>
                    Set to <code>false</code> to keep cookie consent banners
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>waitUntil</code>
                  </td>
                  <td>string</td>
                  <td>load</td>
                  <td>
                    Navigation event: <code>domcontentloaded</code>, <code>load</code>, <code>networkidle2</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>timeout</code>
                  </td>
                  <td>number</td>
                  <td>30000</td>
                  <td>Navigation timeout in milliseconds</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Example</h3>
          <pre className="code-block">
            <code>{`// cURL
curl "${origin}/api?url=https://example.com&width=1200&height=630" -o screenshot.png

// JavaScript (browser)
const res = await fetch(\`${origin}/api?url=\${encodeURIComponent("https://example.com")}\`);
const blob = await res.blob();
const imgUrl = URL.createObjectURL(blob);`}</code>
          </pre>

          <h3>Errors</h3>
          <p>
            On failure the API returns JSON instead of an image, e.g.{" "}
            <code>{`{"error":"Missing 'url' query parameter"}`}</code> with HTTP 400.
          </p>

          <h3>Notes</h3>
          <p>
            Browser requests from other websites are blocked by an origin allowlist (HTTP 403). Requests without an <code>Origin</code> header — curl and
            server-to-server calls — always work.
          </p>
        </section>

        <section id="faq" className="faq">
          <h2>Frequently asked questions</h2>
          {faqJsonLd.mainEntity.map((item) => (
            <details key={item.name}>
              <summary>{item.name}</summary>
              <p>{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Website Screenshot</span>
          <span>Free to use · Cookie-banner free captures</span>
        </div>
      </footer>
    </div>
  );
}
