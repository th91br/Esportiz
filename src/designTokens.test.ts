import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Rgb = [number, number, number];

function getHslToken(css: string, token: string): Rgb {
  const match = css.match(new RegExp(`--${token}:\\s*(\\d+)\\s+(\\d+)%\\s+(\\d+)%`));

  if (!match) {
    throw new Error(`Missing HSL token: --${token}`);
  }

  const [, hue, saturation, lightness] = match;
  return hslToRgb(Number(hue), Number(saturation), Number(lightness));
}

function hslToRgb(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const saturation = saturationPercent / 100;
  const lightness = lightnessPercent / 100;
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - (chroma / 2);

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return [red + m, green + m, blue + m].map((channel) => Math.round(channel * 255)) as Rgb;
}

function luminance(rgb: Rgb) {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('design tokens', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');

  it('keeps action and status colors readable at WCAG AA body-text contrast', () => {
    expect(contrastRatio(getHslToken(css, 'primary-foreground'), getHslToken(css, 'primary'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(getHslToken(css, 'success-foreground'), getHslToken(css, 'success'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(getHslToken(css, 'warning-foreground'), getHslToken(css, 'warning'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(getHslToken(css, 'muted-foreground'), getHslToken(css, 'background'))).toBeGreaterThanOrEqual(4.5);
  });

  it('provides a reduced-motion fallback for global entrance animations', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/\.animate-fade-up[\s\S]*animation:\s*none/);
    expect(css).toMatch(/\.animate-scale-in[\s\S]*animation:\s*none/);
  });
});
