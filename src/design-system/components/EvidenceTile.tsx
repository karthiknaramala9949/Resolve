import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Image as ImageIcon, Download, ShieldAlert, Fingerprint, Trash2 } from 'lucide-react';

export interface EvidenceItem {
  id: string;
  name: string;
  mime: string;
  size: number;
  addedAt: string;
  sha256?: string;
  redactionHint?: string;
}

interface EvidenceTileProps {
  item: EvidenceItem;
  onDownload?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const EvidenceTile: React.FC<EvidenceTileProps> = ({
  item,
  onDownload,
  onDelete,
  className,
}) => {
  const isImage = item.mime.startsWith('image/');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl p-4 bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 shadow-subtle hover:border-neutral-300 dark:hover:border-neutral-700 transition-all',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
          {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={item.name}>
            {item.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{formatBytes(item.size)}</span>
            <span>•</span>
            <span className="uppercase">{item.mime.split('/')[1] || 'DOC'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
              title="Download evidence"
            >
              <Download className="w-4 h-4 shrink-0" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors inline-flex items-center justify-center shrink-0 min-w-[36px] min-h-[36px]"
              title="Remove evidence"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Redaction Warning if detected */}
      {item.redactionHint && (
        <div className="mt-3 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <span>{item.redactionHint}</span>
        </div>
      )}

      {/* SHA-256 Cryptographic Fingerprint */}
      {item.sha256 && (
        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
          <Fingerprint className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate" title={`SHA-256: ${item.sha256}`}>
            SHA-256: {item.sha256.slice(0, 8)}...{item.sha256.slice(-8)}
          </span>
        </div>
      )}
    </div>
  );
};

