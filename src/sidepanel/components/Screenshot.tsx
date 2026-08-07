/**
 * Element and viewport screenshots.
 *
 * Two buttons, because those are the two pictures `activeTab` can take without
 * asking the user for anything more — see sidepanel/capture.ts for why full-page
 * is not a third one. The shot is a picture of the element as the picker last
 * measured it, with the picker's own highlight boxes hidden for the exposure.
 */
import type { CaptureTarget, ElementInfo } from '../../shared/types.js';
import type { Shot } from '../capture.js';

interface Props {
  /** Without a pick there is nothing to crop to; the viewport shot still works. */
  info: ElementInfo | null;
  shot: Shot | null;
  busy: boolean;
  error: string | null;
  /** Mark the picked element on a viewport shot. */
  highlight: boolean;
  onHighlightChange: (highlight: boolean) => void;
  onCapture: (target: CaptureTarget) => void;
  onCopy: (blob: Blob) => void;
  onDownload: (fileName: string, blob: Blob) => void;
  onClear: () => void;
}

export function Screenshot({
  info,
  shot,
  busy,
  error,
  highlight,
  onHighlightChange,
  onCapture,
  onCopy,
  onDownload,
  onClear,
}: Props) {
  return (
    <section>
      <h2>
        Screenshot
        {shot && (
          <span class="count">
            {shot.width} × {shot.height}
          </span>
        )}
      </h2>
      <div class="body">
        <div class="row">
          <button disabled={busy || !info} onClick={() => onCapture('element')}>
            Element
          </button>
          <button disabled={busy} onClick={() => onCapture('viewport')}>
            Viewport
          </button>
          <span class="grow" />
          {shot && (
            <button class="link" onClick={onClear}>
              clear
            </button>
          )}
        </div>

        {info ? (
          <label class="check">
            <input
              type="checkbox"
              checked={highlight}
              disabled={busy}
              onChange={(event) => onHighlightChange((event.target as HTMLInputElement).checked)}
            />
            Outline the picked element on the viewport shot
          </label>
        ) : (
          <p class="hint">Pick an element to crop a shot of it. Viewport works either way.</p>
        )}

        {busy && <p class="hint">Capturing…</p>}
        {error && <p class="error">{error}</p>}

        {shot && (
          <>
            {shot.clipped && (
              <p class="warn">
                The element is bigger than the window, so the shot is cut off. Only the visible
                part can be captured.
              </p>
            )}

            {shot.highlightMissed && (
              <p class="warn">
                The picked element is scrolled out of view, so there was nothing to outline. A
                viewport shot photographs the page as it stands — scroll the element in and
                capture again.
              </p>
            )}

            <img
              class="shot"
              src={shot.url}
              alt={
                shot.target === 'element'
                  ? 'Screenshot of the picked element'
                  : 'Screenshot of the visible page'
              }
            />

            <div class="row">
              <button onClick={() => onCopy(shot.blob)}>Copy image</button>
              <button onClick={() => onDownload(shotFileName(shot, info), shot.blob)}>
                Download
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * A filename you can recognise in a downloads folder a week later. Falls back
 * through accessible name, then role, then tag; a viewport shot is named for
 * what it is, even when an element happens to be picked.
 */
function shotFileName(shot: Shot, info: ElementInfo | null): string {
  if (shot.target !== 'element' || !info) return 'viewport.png';
  const stem = slug(info.accessibleName) || slug(info.role ?? '') || slug(info.tagName);
  return `${stem || 'element'}.png`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
