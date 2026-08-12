/** Ranked locator list — the panel's primary screen. */
import { grade } from '../../core/rank.js';
import { KIND_RATIONALE } from '../../core/rules.js';
import type { Candidate, FrameHop, Language, Retarget } from '../../shared/types.js';
import { frameLocatorName, pageExpression } from '../../shared/expression.js';

interface Props {
  candidates: Candidate[];
  frameChain: FrameHop[];
  language: Language;
  frameChainWarning?: string;
  retarget?: Retarget;
  onCopy: (text: string) => void;
  onHighlight: (selector: string | null) => void;
  onAddToSession: (candidate: Candidate) => void;
}

export function Candidates({
  candidates,
  frameChain,
  language,
  frameChainWarning,
  retarget,
  onCopy,
  onHighlight,
  onAddToSession,
}: Props) {
  if (candidates.length === 0) return null;

  return (
    <section>
      <h2>
        Locators
        <span class="count">{candidates.length} candidates</span>
      </h2>
      <div class="body">
        {frameChain.length > 0 && (
          <p class="hint">
            Inside {frameChain.length} frame{frameChain.length > 1 ? 's' : ''} — the{' '}
            <code>{frameLocatorName(language)}()</code> prefix is included.
          </p>
        )}
        {frameChainWarning && <p class="warn">{frameChainWarning}</p>}
        {retarget && <p class="warn">{retarget.note}</p>}

        {candidates.map((candidate, index) => {
          const expression = pageExpression(frameChain, candidate.locators, language);
          const tier = grade(candidate.score);

          return (
            <div
              key={candidate.selector}
              class={index === 0 ? 'candidate best' : 'candidate'}
              onMouseEnter={() => onHighlight(candidate.selector)}
              onMouseLeave={() => onHighlight(null)}
            >
              <div class="top">
                <span class={`badge ${tier}`} title="Reliability score out of 100">
                  {candidate.score}
                </span>
                <code
                  title="Click to copy"
                  onClick={() => onCopy(expression)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && onCopy(expression)}
                >
                  {expression}
                </code>
              </div>

              <div class="row wrap" style="margin-top:6px">
                <span class="badge plain">{candidate.kind}</span>
                <span class="badge plain">
                  {candidate.matchCount} match{candidate.matchCount === 1 ? '' : 'es'}
                </span>
                {candidate.isCodegenDefault && (
                  <span class="badge plain" title="What `npx playwright codegen` would emit">
                    codegen default
                  </span>
                )}
                <span class="grow" />
                <button class="link" onClick={() => onCopy(expression)}>
                  copy
                </button>
                <button class="link" onClick={() => onAddToSession(candidate)}>
                  + page object
                </button>
              </div>

              <ul class="why">
                {candidate.penalties.length === 0 ? (
                  <li style="color:var(--muted)" title={KIND_RATIONALE[candidate.kind]}>
                    {KIND_RATIONALE[candidate.kind]}
                  </li>
                ) : (
                  candidate.penalties.map((penalty) => (
                    <li key={penalty.id}>
                      {penalty.reason} (−{penalty.cost})
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
