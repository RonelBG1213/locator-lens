/**
 * Crop geometry for element screenshots.
 *
 * `chrome.tabs.captureVisibleTab` hands back the visible viewport as an image
 * whose pixel size is the CSS viewport multiplied by some scale — display DPR and
 * the tab's zoom level both feed into it. Rather than fetch those two numbers and
 * hope they multiply out (they disagree often enough: fractional zoom, per-tab
 * zoom, a window dragged between monitors mid-session), the scale is measured
 * from the image itself. One division, no guessing.
 *
 * Pure, so the arithmetic that decides whether a screenshot is right or subtly
 * offset is unit tested. Nothing here touches a canvas or the DOM.
 */
import type { Rect } from '../shared/types.js';

/** A little context around the element, so the crop reads as a picture of something. */
export const CROP_PADDING_CSS_PX = 4;

export interface CropInput {
  /** The element, in TOP-document viewport coordinates, CSS pixels. */
  rect: Rect;
  /** The top frame's CSS viewport — the denominator for the scale. */
  viewport: { width: number; height: number };
  /** Pixel dimensions of the image captureVisibleTab returned. */
  image: { width: number; height: number };
  /** CSS pixels of breathing room. Zero for a viewport shot, which is already whole. */
  padding?: number;
}

export interface CropRegion {
  /** Source rectangle in image pixels, clamped to the image and rounded. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Image pixels per CSS pixel. */
  scale: number;
  /** True when the element itself runs past the edge of the capture. */
  clipped: boolean;
}

/**
 * Null when there is nothing to crop — a zero-sized element, or one scrolled
 * entirely outside the captured viewport. The caller turns that into a message
 * rather than saving a blank PNG.
 */
export function cropRegion({
  rect,
  viewport,
  image,
  padding = CROP_PADDING_CSS_PX,
}: CropInput): CropRegion | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  if (image.width <= 0 || image.height <= 0) return null;

  const scale = image.width / viewport.width;

  const left = (rect.x - padding) * scale;
  const top = (rect.y - padding) * scale;
  const right = (rect.x + rect.width + padding) * scale;
  const bottom = (rect.y + rect.height + padding) * scale;

  const sx = Math.round(clamp(left, 0, image.width));
  const sy = Math.round(clamp(top, 0, image.height));
  const sw = Math.round(clamp(right, 0, image.width)) - sx;
  const sh = Math.round(clamp(bottom, 0, image.height)) - sy;

  if (sw < 1 || sh < 1) return null;

  return { sx, sy, sw, sh, scale, clipped: isClipped(rect, scale, image) };
}

/**
 * Where to draw the highlight box on the cropped canvas.
 *
 * Takes the same top-document CSS rect the crop was computed from and puts it in
 * canvas pixels, relative to the crop's own origin. Null when the element does
 * not overlap the crop at all — an element scrolled off a viewport shot gets no
 * box rather than a box jammed against the edge.
 */
export function highlightRect(rect: Rect, region: CropRegion): Rect | null {
  const { scale, sx, sy, sw, sh } = region;

  const box: Rect = {
    x: rect.x * scale - sx,
    y: rect.y * scale - sy,
    width: rect.width * scale,
    height: rect.height * scale,
  };

  const overlaps = box.x < sw && box.y < sh && box.x + box.width > 0 && box.y + box.height > 0;
  return overlaps ? box : null;
}

/**
 * Whether the ELEMENT is cut off, which is worth warning about. Padding falling
 * off the edge is not — that is just an element flush against the viewport.
 */
function isClipped(rect: Rect, scale: number, image: { width: number; height: number }): boolean {
  // A half-pixel of slack: the rect is fractional CSS px and the image is whole
  // device px, so an element sitting exactly on the edge must not read as clipped.
  const slack = 0.5;
  return (
    rect.x * scale < -slack ||
    rect.y * scale < -slack ||
    (rect.x + rect.width) * scale > image.width + slack ||
    (rect.y + rect.height) * scale > image.height + slack
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
