/**
 * Freeze: holds transient page UI open long enough to pick inside it.
 *
 * A popup list of values, an autocomplete, a menu — they all dismiss themselves
 * the moment attention moves elsewhere. Clicking the side panel blurs the page,
 * which is enough, so the pane is gone before picking even starts. Freeze blocks
 * the events those panes close on, at `window` in the capture phase: that runs
 * before anything listening on `document`, which is where dropdown libraries put
 * their outside-click and focus handlers.
 *
 * What it deliberately does NOT block:
 *
 *   - pointer events while merely frozen. The user still has to reach the row
 *     they want, and that often means typing in the pane's own search box.
 *   - `click`. The picker's own handler is on `document`, so swallowing clicks
 *     here would stop the pick itself. Suppressing `mousedown` is enough for the
 *     panes this is aimed at, and it also stops the focus move that would
 *     otherwise fire `focusout` a moment later.
 *
 * This changes how the page behaves for as long as it is on, which is why the
 * caller pairs it with a visible badge and why the watchdog below exists.
 */

/** Dismissal events blocked for as long as freeze is on. */
const ALWAYS_BLOCKED = ['focusout', 'blur'] as const;

/**
 * Blocked only while the picker is also armed, when the page is not supposed to
 * react to the pointer at all.
 */
const BLOCKED_WHILE_PICKING = ['pointerdown', 'mousedown'] as const;

/**
 * How long a freeze may last untouched.
 *
 * A forgotten freeze leaves the page quietly unable to run its own focus
 * handling, which is a far worse outcome than a pane closing too early. Any
 * picker activity pushes the deadline back; five minutes of nothing releases it.
 */
export const FREEZE_MAX_MS = 5 * 60 * 1000;

export interface FreezeHooks {
  /** True while the picker is armed. */
  isPicking(): boolean;
  /** Escape arrived while frozen: cancel the pick, or release the freeze. */
  onEscape(): void;
  /** The watchdog released the freeze; the caller re-syncs badge and panel. */
  onExpire(): void;
}

let hooks: FreezeHooks | null = null;
let frozen = false;
let watchdog = 0;

/** Install the shield. Listeners go on immediately and no-op until frozen. */
export function initFreeze(next: FreezeHooks): void {
  hooks = next;

  // Registered once, at injection time, rather than on each freeze: the earlier a
  // capture-phase listener is registered the better its odds against a page that
  // listens on window itself.
  for (const type of ALWAYS_BLOCKED) window.addEventListener(type, shield, true);
  for (const type of BLOCKED_WHILE_PICKING) window.addEventListener(type, shield, true);
  window.addEventListener('keydown', shield, true);
}

export function isFrozen(): boolean {
  return frozen;
}

export function setFrozen(value: boolean): void {
  frozen = value;
  window.clearTimeout(watchdog);
  if (!value) return;

  watchdog = window.setTimeout(() => {
    frozen = false;
    hooks?.onExpire();
  }, FREEZE_MAX_MS);
}

/** Push the watchdog back. Called whenever the picker does something. */
export function keepAlive(): void {
  if (frozen) setFrozen(true);
}

function shield(event: Event): void {
  if (!frozen) return;

  if (event.type === 'keydown') {
    if ((event as KeyboardEvent).key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hooks?.onEscape();
    return;
  }

  if (isBlockedWhilePicking(event.type) && !hooks?.isPicking()) return;

  // preventDefault on mousedown is the half that matters: it stops the focus
  // moving, so the focusout that would close the pane never happens at all.
  if (event.cancelable) event.preventDefault();
  event.stopImmediatePropagation();
}

function isBlockedWhilePicking(type: string): boolean {
  return (BLOCKED_WHILE_PICKING as readonly string[]).includes(type);
}
