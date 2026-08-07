/**
 * Multi-pick session -> page object class.
 *
 * Generates locator properties only. Action methods and assertions are the parts
 * that require judgement about the flow, so they stay hand-written; this removes
 * the transcription work, not the design work.
 */
import { generatePageObject, fileName, withUniqueNames } from '../../core/pom.js';
import type { SessionEntry } from '../../shared/types.js';

interface Props {
  pageName: string;
  entries: SessionEntry[];
  onPageNameChange: (name: string) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onCopy: (text: string) => void;
  onDownload: (fileName: string, text: string) => void;
}

export function PomExport({
  pageName,
  entries,
  onPageNameChange,
  onRemove,
  onClear,
  onCopy,
  onDownload,
}: Props) {
  const named = withUniqueNames(entries);
  const source = generatePageObject(pageName, entries);

  return (
    <section>
      <h2>
        Page object
        <span class="count">{entries.length} element{entries.length === 1 ? '' : 's'}</span>
      </h2>
      <div class="body">
        {entries.length === 0 ? (
          <p class="hint">
            Pick elements and choose “+ page object” to collect them here, then export the class.
          </p>
        ) : (
          <>
            <input
              type="text"
              spellcheck={false}
              placeholder="Login"
              value={pageName}
              onInput={(event) => onPageNameChange((event.target as HTMLInputElement).value)}
            />

            <ol class="session">
              {named.map((entry, index) => (
                <li key={`${entry.name}-${index}`}>
                  <div class="row">
                    <code class="grow">{entry.name}</code>
                    <button class="link" onClick={() => onRemove(index)} title="Remove">
                      remove
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <pre>{source}</pre>

            <div class="row">
              <button onClick={() => onCopy(source)}>Copy class</button>
              <button onClick={() => onDownload(fileName(pageName), source)}>
                Download {fileName(pageName)}
              </button>
              <span class="grow" />
              <button class="link" onClick={onClear}>
                clear
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
