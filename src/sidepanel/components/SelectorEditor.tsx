/**
 * Live selector editor: type anything Playwright accepts and see, against the
 * real page, how many elements it resolves to and where.
 *
 * The count shown is the one for the frame the expression actually addresses —
 * NOT a total across frames. `page.getByRole(...)` does not search iframes in
 * real Playwright, so a summed total would be a number no test could reproduce.
 * Matches in other frames are listed separately, each with the prefix needed to
 * reach it, which turns the common "why is this 0?" moment into an answer.
 */
import { useRef } from 'preact/hooks';

import type { EvaluationResult, FrameEvaluation } from '../../shared/types.js';

interface Props {
  value: string;
  result: EvaluationResult | null;
  onChange: (value: string) => void;
  onUse: (expression: string) => void;
}

export function SelectorEditor({ value, result, onChange, onUse }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Emptying the box is the reset signal the panel already listens for: it drops
  // the evaluation and tells the content script to unpaint every frame.
  const clear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <section>
      <h2>Try a selector</h2>
      <div class="body">
        <div class="row">
          <input
            ref={inputRef}
            class="grow"
            type="text"
            spellcheck={false}
            placeholder="getByRole('button', { name: 'Save' })"
            value={value}
            onInput={(event) => onChange((event.target as HTMLInputElement).value)}
          />
          <button
            onClick={clear}
            disabled={value.length === 0}
            title="Clear the expression and remove page highlights"
          >
            Clear
          </button>
        </div>
        <Status result={result} hasInput={value.trim().length > 0} onUse={onUse} />
      </div>
    </section>
  );
}

function Status({
  result,
  hasInput,
  onUse,
}: {
  result: EvaluationResult | null;
  hasInput: boolean;
  onUse: (expression: string) => void;
}) {
  if (!hasInput)
    return (
      <p class="hint">
        Matches are highlighted on the page as you type — in iframes too. Locator source
        (<code>getByRole(…)</code>, with or without <code>page.</code>) and raw selector syntax both
        work.
      </p>
    );

  if (!result) return <p class="hint">Evaluating…</p>;
  if (result.error) return <p class="error">{result.error}</p>;

  const target = result.target;

  return (
    <>
      {target && <TargetLine target={target} strictViolation={result.strictViolation} />}

      {target && target.previews.length > 0 && <pre>{target.previews.join('\n')}</pre>}

      {result.otherFrames.length > 0 && (
        <>
          <p class="hint" style="margin-top:4px">
            Also matches inside {result.otherFrames.length} frame
            {result.otherFrames.length === 1 ? '' : 's'} — Playwright needs the prefix to reach
            there:
          </p>
          {result.otherFrames.map((frame, index) => (
            <OtherFrame
              key={index}
              frame={frame}
              selector={result.selector ?? ''}
              onUse={onUse}
            />
          ))}
        </>
      )}

      {result.unreachableFrames > 0 && (
        <p class="warn">
          {result.unreachableFrames} frame{result.unreachableFrames === 1 ? '' : 's'} did not
          respond — likely cross-origin. Grant all-sites access in Settings to include them.
        </p>
      )}
    </>
  );
}

function TargetLine({
  target,
  strictViolation,
}: {
  target: FrameEvaluation;
  strictViolation: boolean;
}) {
  const where = target.frameChain.length > 0 ? 'in the addressed frame' : 'in the main frame';

  // A rejected selector is not an empty page — say which it is.
  if (target.error) return <p class="error">{target.error}</p>;
  if (target.matchCount === 0) return <p class="error">No matches {where}.</p>;

  return (
    <p class={strictViolation ? 'warn' : 'hint'}>
      {target.matchCount} match{target.matchCount === 1 ? '' : 'es'} {where}
      {strictViolation && ' — Playwright strict mode would throw here'}
    </p>
  );
}

/** A frame the selector matches in, but which the current expression misses. */
function OtherFrame({
  frame,
  selector,
  onUse,
}: {
  frame: FrameEvaluation;
  selector: string;
  onUse: (expression: string) => void;
}) {
  const prefix = frame.frameChain.map((hop) => hop.locator).join('.');
  const expression = `page.${prefix}${prefix ? '.' : ''}${selector}`;

  return (
    <div class="row">
      <code class="grow" style="font-size:11.5px;word-break:break-all">
        {prefix || 'main frame'}
      </code>
      <span class="badge plain">
        {frame.matchCount} match{frame.matchCount === 1 ? '' : 'es'}
      </span>
      <button class="link" onClick={() => onUse(expression)}>
        use
      </button>
    </div>
  );
}
