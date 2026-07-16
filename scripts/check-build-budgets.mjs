import { readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BUILD_BUDGETS = {
  largestJavaScriptBytes: 450 * 1024,
  precacheBytes: 3 * 1024 * 1024,
  totalCssBytes: 150 * 1024,
  totalJavaScriptBytes: 2500 * 1024,
};

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, absolutePath));
    } else if (entry.isFile()) {
      const fileStat = await stat(absolutePath);
      files.push({
        bytes: fileStat.size,
        path: relative(root, absolutePath).replace(/\\/g, '/'),
      });
    }
  }

  return files;
}

function sumBytes(files) {
  return files.reduce((total, file) => total + file.bytes, 0);
}

export function evaluateBuildBudgets(files, budgets = BUILD_BUDGETS) {
  const javascript = files.filter((file) => extname(file.path) === '.js');
  const css = files.filter((file) => extname(file.path) === '.css');
  const precache = files.filter((file) => (
    file.path === 'index.html'
    || /^assets\/.*\.(?:js|css|svg|woff2)$/.test(file.path)
  ));
  const largestJavaScript = javascript.reduce(
    (largest, file) => file.bytes > largest.bytes ? file : largest,
    { bytes: 0, path: '' },
  );
  const totals = {
    largestJavaScript,
    precacheBytes: sumBytes(precache),
    totalCssBytes: sumBytes(css),
    totalJavaScriptBytes: sumBytes(javascript),
  };
  const failures = [];

  if (totals.largestJavaScript.bytes > budgets.largestJavaScriptBytes) {
    failures.push(`largest JavaScript chunk ${totals.largestJavaScript.path}`);
  }
  if (totals.precacheBytes > budgets.precacheBytes) {
    failures.push('estimated PWA precache');
  }
  if (totals.totalCssBytes > budgets.totalCssBytes) {
    failures.push('total CSS');
  }
  if (totals.totalJavaScriptBytes > budgets.totalJavaScriptBytes) {
    failures.push('total JavaScript');
  }

  return { failures, totals };
}

export async function checkBuildBudgets(distDirectory = 'dist') {
  const files = await listFiles(distDirectory);
  return evaluateBuildBudgets(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await checkBuildBudgets();
    console.log(JSON.stringify(result.totals, null, 2));

    if (result.failures.length > 0) {
      throw new Error(`Build budgets exceeded: ${result.failures.join(', ')}`);
    }
  } catch (error) {
    console.error(`Performance budget failed: ${error.message}`);
    process.exitCode = 1;
  }
}
