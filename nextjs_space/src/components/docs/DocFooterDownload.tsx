'use client';

import { DocDownloadButton } from './DocDownloadButton';

interface DocFooterDownloadProps {
  /** Pre-built markdown (optional — falls back to DOM extraction) */
  markdown?: string;
  /** DOM container ID to extract from */
  containerId?: string;
  filename: string;
  lastUpdated?: string;
}

/**
 * Renders a download section just above the footer of a doc page.
 */
export function DocFooterDownload({ markdown, containerId, filename, lastUpdated }: DocFooterDownloadProps) {
  return (
    <div className="mt-12 pt-6 border-t border-white/[0.06]" data-no-download>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            📄 Download a plain-text copy of this page
          </p>
          {lastUpdated && (
            <p className="text-xs text-[var(--text-muted)] mt-1">Last updated: {lastUpdated}</p>
          )}
        </div>
        <DocDownloadButton markdown={markdown} containerId={containerId} filename={filename} />
      </div>
    </div>
  );
}
