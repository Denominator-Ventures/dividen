import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-shell">
      {/* Settings top bar */}
      <header className="flex-shrink-0 px-3 md:px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl text-brand-400">⬡</span>
            <span className="font-bold text-brand-400 text-lg tracking-tight">DiviDen</span>
          </Link>
          <div className="w-px h-5 bg-[var(--border-color)]" />
          <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Settings</span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
