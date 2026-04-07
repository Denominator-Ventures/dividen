'use client';

import { useState } from 'react';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import type { CenterTab } from '@/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');

  return (
    <div className="h-full flex gap-3 p-3">
      {/* NOW Panel - Left */}
      <div className="w-72 flex-shrink-0">
        <NowPanel
          onNewTask={() => {
            // Refresh is handled internally by NowPanel
          }}
          onQuickChat={() => {
            setActiveTab('chat');
          }}
        />
      </div>

      {/* Center Panel - Main */}
      <div className="flex-1 min-w-0">
        <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Queue Panel - Right */}
      <div className="w-72 flex-shrink-0">
        <QueuePanel />
      </div>
    </div>
  );
}
