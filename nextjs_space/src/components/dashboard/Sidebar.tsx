'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { InstallDesktopButton } from '@/components/InstallDesktopButton';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-16 lg:w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full">
      {/* Brand */}
      <div className="p-3 lg:p-4 border-b border-[var(--border-color)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl text-brand-400">⬡</span>
          <span className="hidden lg:block font-bold text-brand-400">
            DiviDen
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-[var(--brand-primary)]/15 text-brand-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="hidden lg:block">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Install Desktop */}
      <div className="px-2 pb-1">
        <InstallDesktopButton
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-[var(--text-secondary)] hover:text-brand-400 hover:bg-[var(--bg-surface)] w-full text-left"
        />
      </div>

      {/* User */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="hidden lg:block mb-2">
          <div className="text-sm font-medium truncate">
            {user.name || 'User'}
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            {user.email}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors px-1 py-1"
        >
          <span className="lg:hidden text-lg">→</span>
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
