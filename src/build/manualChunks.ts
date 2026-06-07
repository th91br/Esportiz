type ManualChunkRule = {
  chunkName: string;
  packages: string[];
};

const manualChunkRules: ManualChunkRule[] = [
  {
    chunkName: 'vendor-react',
    packages: ['react', 'react-dom', 'scheduler', 'use-sync-external-store'],
  },
  {
    chunkName: 'vendor-router',
    packages: ['react-router', 'react-router-dom', '@remix-run/router'],
  },
  {
    chunkName: 'vendor-query',
    packages: ['@tanstack/react-query'],
  },
  {
    chunkName: 'vendor-supabase',
    packages: ['@supabase'],
  },
  {
    chunkName: 'vendor-charts',
    packages: ['recharts', 'd3-', 'victory-vendor', 'decimal.js-light'],
  },
  {
    chunkName: 'vendor-icons',
    packages: ['lucide-react'],
  },
  {
    chunkName: 'vendor-ui',
    packages: [
      '@radix-ui',
      'cmdk',
      'embla-carousel-react',
      'input-otp',
      'next-themes',
      'react-day-picker',
      'sonner',
      'tailwind-merge',
      'vaul',
    ],
  },
  {
    chunkName: 'vendor-date',
    packages: ['date-fns'],
  },
  {
    chunkName: 'vendor-analytics',
    packages: ['@vercel/analytics', 'web-vitals'],
  },
  {
    chunkName: 'vendor-forms',
    packages: ['@hookform', 'react-hook-form', 'zod'],
  },
];

function normalizeModuleId(id: string) {
  return id.replace(/\\/g, '/');
}

function packageMatcher(packageName: string) {
  if (packageName.endsWith('-')) {
    return `/node_modules/${packageName}`;
  }

  return `/node_modules/${packageName}/`;
}

export function getManualChunk(id: string) {
  const normalizedId = normalizeModuleId(id);

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  const matchingRule = manualChunkRules.find((rule) => (
    rule.packages.some((packageName) => normalizedId.includes(packageMatcher(packageName)))
  ));

  return matchingRule?.chunkName ?? 'vendor-misc';
}
