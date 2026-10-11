// Origins allowed to call the screenshot API from a browser (cross-origin
// fetch/XHR). Any browser request arriving with an Origin not listed here —
// and not matching the server's own host or the ALLOWED_ORIGINS env var —
// is rejected with HTTP 403.
//
// Use full origins including the protocol, e.g. "https://example.com".
const allowedDomains = [
  // Local development
  "http://localhost:3000",
  "http://localhost:4321",

  // Production origins — add your domains below
  "https://bookllo.com",
  "https://toolslash.com",
];

export default allowedDomains;
