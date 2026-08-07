/**
 * Element details — the "why was it ranked that way" pane.
 *
 * Role and accessible name matter most: they are the inputs getByRole depends on,
 * so seeing them explains a suggestion better than any score does.
 */
import type { ElementInfo, RawSelectors } from '../../shared/types.js';

interface Props {
  info: ElementInfo;
  raw: RawSelectors;
  onCopy: (text: string) => void;
}

export function Inspector({ info, raw, onCopy }: Props) {
  return (
    <>
      <section>
        <h2>Element</h2>
        <div class="body">
          <dl class="kv">
            <dt>Tag</dt>
            <dd>&lt;{info.tagName}&gt;</dd>

            <dt>Role</dt>
            <dd>{info.role ?? <span class="hint">none</span>}</dd>

            <dt>Name</dt>
            <dd>{info.accessibleName || <span class="hint">(empty)</span>}</dd>

            {info.accessibleDescription && (
              <>
                <dt>Description</dt>
                <dd>{info.accessibleDescription}</dd>
              </>
            )}

            <dt>State</dt>
            <dd>{describeState(info)}</dd>

            {info.text && (
              <>
                <dt>Text</dt>
                <dd>{info.text}</dd>
              </>
            )}
          </dl>

          {info.ancestry.length > 0 && (
            <p class="breadcrumb">{info.ancestry.join(' › ')} › {info.tagName}</p>
          )}
        </div>
      </section>

      <section>
        <h2>
          Attributes
          <span class="count">{info.attributes.length}</span>
        </h2>
        <div class="body attrs">
          {info.attributes.length === 0 ? (
            <p class="hint">No attributes.</p>
          ) : (
            <dl class="kv">
              {info.attributes.map((attr) => (
                <>
                  <dt key={`${attr.name}-k`}>{attr.name}</dt>
                  <dd key={`${attr.name}-v`}>{attr.value || <span class="hint">(empty)</span>}</dd>
                </>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section>
        <h2>CSS &amp; XPath</h2>
        <div class="body">
          <p class="hint">
            Reference only — for DevTools or non-Playwright tools. Prefer the ranked locators above.
          </p>
          <div class="row">
            <code class="grow" style="font-size:11.5px;word-break:break-all">{raw.css}</code>
            <button class="link" onClick={() => onCopy(raw.css)}>copy</button>
          </div>
          <div class="row">
            <code class="grow" style="font-size:11.5px;word-break:break-all">{raw.xpath}</code>
            <button class="link" onClick={() => onCopy(raw.xpath)}>copy</button>
          </div>
        </div>
      </section>
    </>
  );
}

function describeState(info: ElementInfo): string {
  const flags = [
    info.visible ? 'visible' : 'hidden',
    info.enabled ? 'enabled' : 'disabled',
    info.editable ? 'editable' : null,
    info.checked === null ? null : info.checked === 'mixed' ? 'mixed' : info.checked ? 'checked' : 'unchecked',
  ].filter(Boolean);
  return flags.join(', ');
}
