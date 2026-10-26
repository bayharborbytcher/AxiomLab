import { useState } from 'react';
import { tableToText } from '../../engine/truthTable';
import type { TruthTable } from '../../engine/truthTable';
import { downloadBlob } from '../../lib/files';
import { useUIStore } from '../../store/uiStore';
import { IconButton } from '../shared/IconButton';

/** Copy the table to the clipboard (tab-separated, ready to paste into a spreadsheet) or download it as CSV. Both are always visible. */
export function ExportBar({ table }: { table: TruthTable }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tableToText(table, '\t'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      useUIStore.getState().showToast('Could not copy to the clipboard', 'error');
    }
  };
  const download = () => {
    downloadBlob('axiomlab-truth-table.csv', new Blob([tableToText(table, ',')], { type: 'text/csv' }));
    useUIStore.getState().showToast('Truth table saved as CSV');
  };

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <IconButton still label="Copy the table to the clipboard" active={copied ? true : undefined} onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </IconButton>
      <IconButton still label="Download the table as a CSV file" onClick={download}>
        Download CSV
      </IconButton>
    </div>
  );
}
