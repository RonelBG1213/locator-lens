/**
 * Turning a visible-tab capture into the requested picture.
 *
 * `chrome.tabs.captureVisibleTab` is the only screenshot API that costs nothing
 * in permissions — `activeTab` already covers it, so the install prompt stays
 * clean — but it photographs the viewport and nothing else. An element shot is
 * therefore a crop of one.
 *
 * There is deliberately no full-page option. Going beyond the viewport needs
 * either `chrome.debugger` — which adds an install warning and puts a permanent
 * "being debugged" banner on the page — or a scroll-and-stitch loop that fights
 * sticky headers, lazy loading and a 2-per-second capture quota. Neither is a
 * trade a locator picker should make; see the repo notes.
 *
 * All of it happens here in the panel. The image never crosses a message
 * boundary: several megabytes of base64 through chrome.runtime would be slow for
 * no reason. Only the geometry travels, and it travels the other way.
 */
import { CROP_PADDING_CSS_PX, cropRegion, highlightRect, type CropRegion } from '../core/crop.js';
import type { CaptureGeometry, CaptureTarget, Rect } from '../shared/types.js';

/**
 * The highlight box, drawn onto the image rather than left to the page's own
 * overlay.
 *
 * Compositing here wins on every count: no dependence on what the overlay
 * happens to be showing (it tracks the selector being edited, which is not
 * necessarily the picked element), no rAF race between painting a box and
 * opening the shutter, and no risk of the overlay's "N matches" label ending up
 * in the picture. The colour matches the picker's hover outline so the two read
 * as the same thing.
 */
const HIGHLIGHT_COLOR = '#2d7ff9';
/** A white halo underneath, so the box survives a dark page as well as a light one. */
const HIGHLIGHT_HALO = 'rgba(255, 255, 255, 0.9)';
const HIGHLIGHT_WIDTH_CSS_PX = 2;

export interface Shot {
  blob: Blob;
  /** For display. Revoke it when the shot is replaced — these are not collected. */
  url: string;
  /** Pixel dimensions of the crop, which are device pixels, not CSS pixels. */
  width: number;
  height: number;
  /** True when the element ran past the edge of the viewport and got cut off. */
  clipped: boolean;
  target: CaptureTarget;
  /** A box was drawn. */
  highlighted: boolean;
  /** One was asked for and could not be drawn — the element is not in the shot. */
  highlightMissed: boolean;
}

export interface CropOptions {
  target: CaptureTarget;
  /** What the user asked for; whether it was possible is `Shot.highlighted`. */
  highlight: boolean;
}

/**
 * Crop `dataUrl` down to `geometry`. Throws with a message fit for the panel when
 * there is nothing left to crop.
 */
export async function crop(
  dataUrl: string,
  geometry: CaptureGeometry,
  { target, highlight }: CropOptions,
): Promise<Shot> {
  const bitmap = await createImageBitmap(await dataUrlToBlob(dataUrl));

  try {
    const region = cropRegion({
      rect: geometry.rect,
      viewport: geometry.viewport,
      image: { width: bitmap.width, height: bitmap.height },
      // A viewport shot is already whole; padding it would only add empty edges.
      padding: target === 'element' ? CROP_PADDING_CSS_PX : 0,
    });

    if (!region) throw new Error('The element is outside the visible part of the page.');

    const canvas = new OffscreenCanvas(region.sw, region.sh);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not open a canvas to crop with.');

    context.drawImage(
      bitmap,
      region.sx,
      region.sy,
      region.sw,
      region.sh,
      0,
      0,
      region.sw,
      region.sh,
    );

    const box = geometry.highlight ? highlightRect(geometry.highlight, region) : null;
    if (box) drawHighlight(context, box, region.scale);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return {
      blob,
      url: URL.createObjectURL(blob),
      width: region.sw,
      height: region.sh,
      clipped: region.clipped,
      target,
      highlighted: box !== null,
      highlightMissed: highlight && box === null,
    };
  } finally {
    bitmap.close();
  }
}

/** Halo first, then the line over it, both centred on the element's edge. */
function drawHighlight(
  context: OffscreenCanvasRenderingContext2D,
  box: Rect,
  scale: CropRegion['scale'],
): void {
  const width = HIGHLIGHT_WIDTH_CSS_PX * scale;

  context.lineJoin = 'miter';
  for (const [color, lineWidth] of [
    [HIGHLIGHT_HALO, width * 2],
    [HIGHLIGHT_COLOR, width],
  ] as const) {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.strokeRect(box.x, box.y, box.width, box.height);
  }
}

/** fetch handles data: URLs and does the base64 decode in native code. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
