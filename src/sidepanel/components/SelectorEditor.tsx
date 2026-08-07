/**
 * Live selector editor: type anything Playwright accepts and see, against the
 * real page, how many elements it resolves to and where they are.
 *
 * Accepts both locator source (`getByRole('button', { name: 'Save' })`) and raw
 * selector syntax (`internal:role=button[name="Save"i]`, `#id`, `text=Save`),
 * because you paste both kinds in practice.
 */
import type { EvaluationResult } from '../../shared/types.js';

interface Props {
  value: string;
  result: EvaluationResult | null;
  onChange: (value: string) => void;
}

export function SelectorEditor({ value, result, onChange }: Props) {
  return (
    <section>
      <h2>Try a selector</h2>
      <div class="body">
        <input
          type="text"
          spellcheck={false}
          placeholder="getByRole('button', { name: 'Save' })"
          value={value}
          onInput={(event) => onChange((event.target as HTMLInputElement).value)}
        />
        <Status result={result} hasInput={value.trim().length > 0} />
      </div>
    </section>
  );
}

function Status({ result, hasInput }: { result: EvaluationResult | null; hasInput: boolean }) {
  if (!hasInput)
    return (
      <p class="hint">
        Matches are highlighted on the page as you type. Locator source and raw selector syntax both
        work.
      </p>
    );

  if (!result) return <p class="hint">Evaluating…</p>;
  if (result.error) return <p class="error">{result.error}</p>;
  if (result.matchCount === null) return <p class="hint">Evaluating…</p>;

  if (result.matchCount === 0) return <p class="error">No matches.</p>;

  return (
    <>
      <p class={result.strictViolation ? 'warn' : 'hint'}>
        {result.matchCount} match{result.matchCount === 1 ? '' : 'es'}
        {result.strictViolation && ' — Playwright strict mode would throw here'}
      </p>
      {result.previews.length > 0 && (
        <pre>{result.previews.join('\n')}</pre>
      )}
    </>
  );
}
