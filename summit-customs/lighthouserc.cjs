/** Lighthouse CI: mobile preset (default), 5 runs per URL; assertions use the MEDIAN run (lhci defaults to the best run). */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "node node_modules/next/dist/bin/next start -p 3400",
      startServerReadyPattern: "Ready",
      url: [
        "http://localhost:3400/",
        "http://localhost:3400/bespoke-suits",
        "http://localhost:3400/custom-wedding-suits-salt-lake-city",
        "http://localhost:3400/faq",
      ],
      numberOfRuns: 5,
      chromePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
      settings: { chromeFlags: "--no-sandbox --headless=new --disable-dev-shm-usage" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:best-practices": ["error", { minScore: 1, aggregationMethod: "median" }],
        "categories:seo": ["error", { minScore: 1, aggregationMethod: "median" }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
