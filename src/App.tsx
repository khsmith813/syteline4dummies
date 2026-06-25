import { useState, useCallback } from 'react';
import { parseItems, parseOperations, parseMaterials } from './domain/parse.ts';
import { buildStore } from './domain/store.ts';
import { validate } from './domain/validate.ts';
import type { DataStore, ValidationIssue } from './domain/types.ts';
import { BomTree } from './components/BomTree.tsx';

type LoadedFiles = { items?: File; ops?: File; mats?: File };
type AppState =
  | { phase: 'loading' }
  | { phase: 'ready'; store: DataStore; issues: ValidationIssue[] };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ phase: 'loading' });
  const [files, setFiles] = useState<LoadedFiles>({});
  const [showIssues, setShowIssues] = useState(false);

  const tryLoad = useCallback(async (next: LoadedFiles) => {
    if (!next.items || !next.ops || !next.mats) return;
    const [itemsCsv, opsCsv, matsCsv] = await Promise.all([
      next.items.text(),
      next.ops.text(),
      next.mats.text(),
    ]);
    const { headers: ih, rows: items } = parseItems(itemsCsv);
    const { headers: oh, rows: ops } = parseOperations(opsCsv);
    const { headers: mh, rows: mats } = parseMaterials(matsCsv);
    const store = buildStore(ih, items, oh, ops, mh, mats);
    setAppState({ phase: 'ready', store, issues: validate(store) });
  }, []);

  function handleFile(key: keyof LoadedFiles, file: File) {
    const next = { ...files, [key]: file };
    setFiles(next);
    tryLoad(next);
  }

  if (appState.phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 bg-zinc-900 text-zinc-300 font-mono">
        <h1 className="text-xl font-semibold tracking-tight">SyteLine BOM Editor</h1>
        <p className="text-sm text-zinc-500">Load all three CSVs to begin.</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <FileCard label="Items"              file={files.items} onChange={f => handleFile('items', f)} />
          <FileCard label="Current Operations" file={files.ops}   onChange={f => handleFile('ops',   f)} />
          <FileCard label="Current Materials"  file={files.mats}  onChange={f => handleFile('mats',  f)} />
        </div>
      </div>
    );
  }

  const { store, issues } = appState;
  const errors   = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-900 text-zinc-300 font-mono text-[13px]">
      {issues.length > 0 && (
        <>
          <div className="flex items-center gap-3 px-3 py-1 bg-red-950 border-b border-red-900 text-[12px] shrink-0">
            <span className="font-semibold text-red-400">
              {issues.length} validation issue{issues.length !== 1 ? 's' : ''}
            </span>
            <span className="text-zinc-500">
              {errors.length > 0 && `${errors.length} error${errors.length !== 1 ? 's' : ''}`}
              {errors.length > 0 && warnings.length > 0 && ' · '}
              {warnings.length > 0 && `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
            </span>
            <button
              className="ml-auto text-[#9cdcfe] hover:underline cursor-pointer bg-transparent border-0 text-[11px]"
              onClick={() => setShowIssues(v => !v)}
            >
              {showIssues ? 'hide' : 'show details'}
            </button>
          </div>
          {showIssues && (
            <div className="max-h-36 overflow-y-auto bg-red-950/40 border-b border-red-900 px-3 py-1.5 text-[11px] shrink-0">
              {issues.map((issue, i) => (
                <div key={i} className={issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  [{issue.code}] {issue.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <BomTree store={store} />
    </div>
  );
}

function FileCard({ label, file, onChange }: {
  label: string;
  file?: File;
  onChange: (f: File) => void;
}) {
  return (
    <div className={`flex flex-col gap-1.5 p-3 bg-zinc-800 border rounded min-w-44 ${file ? 'border-teal-700' : 'border-zinc-700'}`}>
      <span className="text-[11px] font-semibold text-[#9cdcfe] uppercase tracking-widest">{label}</span>
      <input
        type="file"
        accept=".csv"
        className="text-[12px] text-zinc-300 cursor-pointer"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
      />
      {file && <span className="text-[11px] text-teal-400 truncate">✓ {file.name}</span>}
    </div>
  );
}
