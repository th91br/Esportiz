import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://www.esportiz.com.br";
const DEFAULT_TIMEOUT_MS = 15_000;
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/pagamentos",
  "/manifest.webmanifest",
  "/sw.js",
];

function createTimeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

async function fetchChecked(url, timeoutMs) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      "user-agent": "Esportiz-production-monitor/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}`);
  }

  return response;
}

export function extractModuleScript(html) {
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];

  for (const tag of scriptTags) {
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];

    if (type === "module" && src?.endsWith(".js")) {
      return src;
    }
  }

  throw new Error("The production HTML does not reference a JavaScript module bundle");
}

export function assertBundleEnvironment(
  bundle,
  expectedProjectRef,
  forbiddenProjectRef,
) {
  if (!expectedProjectRef || !forbiddenProjectRef) {
    throw new Error(
      "EXPECTED_SUPABASE_PROJECT_REF and FORBIDDEN_SUPABASE_PROJECT_REF are required",
    );
  }

  if (!bundle.includes(expectedProjectRef)) {
    throw new Error(
      `The production bundle does not contain the expected Supabase project ${expectedProjectRef}`,
    );
  }

  if (bundle.includes(forbiddenProjectRef)) {
    throw new Error(
      `The production bundle contains the forbidden Supabase project ${forbiddenProjectRef}`,
    );
  }
}

export async function verifyProduction({
  baseUrl = DEFAULT_BASE_URL,
  expectedProjectRef,
  forbiddenProjectRef,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const origin = new URL(baseUrl);
  const checks = [];
  let rootHtml;

  for (const path of PUBLIC_PATHS) {
    const url = new URL(path, origin);
    const response = await fetchChecked(url, timeoutMs);
    const body = await response.text();

    if (path === "/") {
      rootHtml = body;
    }

    checks.push({
      path,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes: Buffer.byteLength(body),
    });
  }

  const bundlePath = extractModuleScript(rootHtml);
  const bundleUrl = new URL(bundlePath, origin);

  if (bundleUrl.origin !== origin.origin) {
    throw new Error("The production JavaScript bundle is hosted on an unexpected origin");
  }

  const bundleResponse = await fetchChecked(bundleUrl, timeoutMs);
  const bundle = await bundleResponse.text();
  assertBundleEnvironment(bundle, expectedProjectRef, forbiddenProjectRef);

  return {
    baseUrl: origin.href,
    checkedAt: new Date().toISOString(),
    checks,
    bundle: {
      path: bundleUrl.pathname,
      status: bundleResponse.status,
      bytes: Buffer.byteLength(bundle),
    },
  };
}

async function main() {
  const result = await verifyProduction({
    baseUrl: process.env.PRODUCTION_BASE_URL,
    expectedProjectRef: process.env.EXPECTED_SUPABASE_PROJECT_REF,
    forbiddenProjectRef: process.env.FORBIDDEN_SUPABASE_PROJECT_REF,
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Production verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
