import { describe, expect, it } from 'vitest';
import { getManualChunk } from './manualChunks';

describe('Vite manual chunk strategy', () => {
  it.each([
    ['C:/repo/node_modules/react/index.js', 'vendor-react'],
    ['C:/repo/node_modules/react-dom/client.js', 'vendor-react'],
    ['C:/repo/node_modules/react-router-dom/dist/index.js', 'vendor-router'],
    ['C:/repo/node_modules/@tanstack/react-query/build/index.js', 'vendor-query'],
    ['C:/repo/node_modules/@supabase/supabase-js/dist/module/index.js', 'vendor-supabase'],
    ['C:/repo/node_modules/recharts/es6/chart/BarChart.js', 'vendor-charts'],
    ['C:/repo/node_modules/d3-scale/src/index.js', 'vendor-charts'],
    ['C:/repo/node_modules/lucide-react/dist/esm/icons/bell.js', 'vendor-icons'],
    ['C:/repo/node_modules/@radix-ui/react-dialog/dist/index.js', 'vendor-ui'],
    ['C:/repo/node_modules/date-fns/format.js', 'vendor-date'],
    ['C:/repo/node_modules/@vercel/analytics/dist/react/index.js', 'vendor-analytics'],
    ['C:/repo/node_modules/zod/lib/index.js', 'vendor-forms'],
  ])('places %s in %s', (id, chunkName) => {
    expect(getManualChunk(id)).toBe(chunkName);
  });

  it('leaves application modules to route-level code splitting', () => {
    expect(getManualChunk('C:/repo/src/pages/Index.tsx')).toBeUndefined();
  });

  it('keeps unmatched node_modules out of route chunks with a misc vendor fallback', () => {
    expect(getManualChunk('C:/repo/node_modules/clsx/dist/clsx.mjs')).toBe('vendor-misc');
  });
});
