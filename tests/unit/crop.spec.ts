import { describe, expect, it } from 'vitest';
import {
  CROP_PADDING_CSS_PX,
  cropRegion,
  highlightRect,
  type CropInput,
} from '../../src/core/crop.js';

/** A 1000x800 CSS viewport captured at 1x, unless a case says otherwise. */
function input(overrides: Partial<CropInput> = {}): CropInput {
  return {
    rect: { x: 100, y: 200, width: 80, height: 40 },
    viewport: { width: 1000, height: 800 },
    image: { width: 1000, height: 800 },
    padding: 0,
    ...overrides,
  };
}

describe('cropRegion', () => {
  it('crops to the element at 1x', () => {
    expect(cropRegion(input())).toMatchObject({ sx: 100, sy: 200, sw: 80, sh: 40, scale: 1 });
  });

  it('scales the rect by the ratio the image implies, not by devicePixelRatio', () => {
    // Same CSS viewport, image twice the size: a 2x display, or 200% page zoom,
    // or both at once — the caller never has to know which.
    const region = cropRegion(input({ image: { width: 2000, height: 1600 } }));
    expect(region).toMatchObject({ sx: 200, sy: 400, sw: 160, sh: 80, scale: 2 });
  });

  it('handles a fractional scale without drifting off the element', () => {
    // 125% zoom.
    const region = cropRegion(input({ image: { width: 1250, height: 1000 } }));
    expect(region).toMatchObject({ sx: 125, sy: 250, sw: 100, sh: 50, scale: 1.25 });
  });

  it('adds padding around the element', () => {
    const region = cropRegion(input({ padding: CROP_PADDING_CSS_PX }));
    expect(region).toMatchObject({ sx: 96, sy: 196, sw: 88, sh: 48 });
  });

  it('scales the padding too', () => {
    const region = cropRegion(input({ padding: 4, image: { width: 2000, height: 1600 } }));
    expect(region).toMatchObject({ sx: 192, sy: 392, sw: 176, sh: 96 });
  });

  it('clamps padding that falls off the edge without calling the element clipped', () => {
    const region = cropRegion(input({ rect: { x: 0, y: 0, width: 50, height: 50 }, padding: 4 }));
    expect(region).toMatchObject({ sx: 0, sy: 0, sw: 54, sh: 54, clipped: false });
  });

  it('flags an element that runs past the bottom of the viewport', () => {
    const region = cropRegion(input({ rect: { x: 10, y: 700, width: 100, height: 400 } }));
    expect(region).toMatchObject({ sx: 10, sy: 700, sw: 100, sh: 100, clipped: true });
  });

  it('flags an element that starts above the viewport', () => {
    const region = cropRegion(input({ rect: { x: 10, y: -50, width: 100, height: 200 } }));
    expect(region).toMatchObject({ sx: 10, sy: 0, sw: 100, sh: 150, clipped: true });
  });

  it('returns null for an element scrolled entirely out of the capture', () => {
    expect(cropRegion(input({ rect: { x: 10, y: 900, width: 100, height: 40 } }))).toBeNull();
    expect(cropRegion(input({ rect: { x: 10, y: -300, width: 100, height: 40 } }))).toBeNull();
  });

  it('returns null for a zero-sized element', () => {
    expect(cropRegion(input({ rect: { x: 10, y: 10, width: 0, height: 0 } }))).toBeNull();
  });

  it('returns the whole image for a viewport-sized rect', () => {
    const region = cropRegion(input({ rect: { x: 0, y: 0, width: 1000, height: 800 } }));
    expect(region).toMatchObject({ sx: 0, sy: 0, sw: 1000, sh: 800, clipped: false });
  });

  it('returns null rather than dividing by a zero viewport', () => {
    expect(cropRegion(input({ viewport: { width: 0, height: 0 } }))).toBeNull();
    expect(cropRegion(input({ image: { width: 0, height: 0 } }))).toBeNull();
  });

  it('rounds to whole device pixels so the crop is not resampled', () => {
    const region = cropRegion(
      input({ rect: { x: 10.4, y: 20.6, width: 30.3, height: 40.7 }, padding: 0 }),
    );
    for (const value of [region!.sx, region!.sy, region!.sw, region!.sh])
      expect(Number.isInteger(value)).toBe(true);
  });
});

describe('highlightRect', () => {
  /** The region a viewport shot produces: the whole image, no padding. */
  const viewportShot = (scale = 1) =>
    cropRegion(input({ rect: { x: 0, y: 0, width: 1000, height: 800 }, image: { width: 1000 * scale, height: 800 * scale } }))!;

  it('places the box at the element, in canvas pixels', () => {
    const box = highlightRect({ x: 100, y: 200, width: 80, height: 40 }, viewportShot());
    expect(box).toEqual({ x: 100, y: 200, width: 80, height: 40 });
  });

  it('scales with the capture', () => {
    const box = highlightRect({ x: 100, y: 200, width: 80, height: 40 }, viewportShot(2));
    expect(box).toEqual({ x: 200, y: 400, width: 160, height: 80 });
  });

  it('is relative to the crop origin, not the page', () => {
    // An element crop starts partway into the image; the box must follow.
    const region = cropRegion(input({ rect: { x: 100, y: 200, width: 80, height: 40 } }))!;
    const box = highlightRect({ x: 100, y: 200, width: 80, height: 40 }, region);
    expect(box).toEqual({ x: 0, y: 0, width: 80, height: 40 });
  });

  it('still returns a box when the element only partly overlaps, for the canvas to clip', () => {
    const box = highlightRect({ x: -20, y: 700, width: 100, height: 300 }, viewportShot());
    expect(box).toEqual({ x: -20, y: 700, width: 100, height: 300 });
  });

  it('returns null for an element scrolled out of the shot', () => {
    expect(highlightRect({ x: 10, y: 900, width: 50, height: 50 }, viewportShot())).toBeNull();
    expect(highlightRect({ x: 10, y: -200, width: 50, height: 50 }, viewportShot())).toBeNull();
    expect(highlightRect({ x: 1200, y: 10, width: 50, height: 50 }, viewportShot())).toBeNull();
  });
});
