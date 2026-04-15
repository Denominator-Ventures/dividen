'use client';

import Link from 'next/link';

interface Agent {
  id: string; name: string; slug: string; description: string | null;
  category: string; pricingModel: string; price: number | null;
  avgRating: number; totalRatings: number; totalExecutions: number;
  version: string; tags: string[];
  supportsA2A: boolean; supportsMCP: boolean;
}

interface Capability {
  id: string; name: string; slug: string; description: string;
  category: string; icon: string; pricingModel: string;
  price: number | null; avgRating: number; totalPurchases: number;
}

interface FederatedDeveloperViewProps {
  developer: {
    name: string;
    url: string | null;
    instanceName: string;
    instanceUrl: string;
    instanceType: string;
    instanceDescription: string | null;
    instanceAgentCount: number;
    memberSince: string | null;
  };
  agents: Agent[];
  capabilities: Capability[];
}

const CATEGORY_ICONS: Record<string, string> = {
  research: '🔬', coding: '💻', writing: '✍️', analysis: '📊',
  operations: '⚙️', creative: '🎨', general: '🤖', finance: '💰',
  hr: '👥', sales: '📈', engineering: '🔧', legal: '⚖️', custom: '⚡',
};

export default function FederatedDeveloperView({ developer, agents, capabilities }: FederatedDeveloperViewProps) {
  const hostname = (() => { try { return new URL(developer.instanceUrl).hostname; } catch { return developer.instanceName; } })();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start gap-5">
            {/* Avatar placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/20 flex items-center justify-center text-3xl shrink-0">
              🌐
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{developer.name}</h1>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 text-xs font-medium border border-purple-500/20 flex items-center gap-1.5">
                  🌐 Federated via {developer.instanceName}
                </span>
              </div>

              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Developer on <a href={developer.instanceUrl} target="_blank" rel="noopener" className="text-brand-400 hover:underline">{hostname}</a>
              </p>

              {developer.url && developer.url !== developer.instanceUrl && (
                <a href={developer.url} target="_blank" rel="noopener" className="text-xs text-brand-400 hover:underline mt-1 inline-block">
                  🔗 {developer.url}
                </a>
              )}

              {/* Instance info */}
              <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  {developer.instanceType}
                </span>
                <span>{developer.instanceAgentCount} agent{developer.instanceAgentCount !== 1 ? 's' : ''} on instance</span>
                {developer.memberSince && (
                  <span>Joined {new Date(developer.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
              </div>

              {developer.instanceDescription && (
                <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xl">
                  {developer.instanceDescription}
                </p>
              )}
            </div>

            {/* Connect / Visit Instance */}
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href={developer.instanceUrl}
                target="_blank"
                rel="noopener"
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
              >
                Visit Instance →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Agents Section */}
        {agents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🤖 Marketplace Agents
              <span className="text-xs text-[var(--text-muted)] font-normal">({agents.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map(agent => (
                <Link
                  key={agent.id}
                  href={`/dashboard?tab=marketplace&agent=${agent.slug}`}
                  className="group p-4 rounded-xl bg-[var(--bg-tertiary)] border border-white/[0.06] hover:border-brand-500/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CATEGORY_ICONS[agent.category] || '🤖'}</span>
                      <h3 className="font-medium text-white/90 group-hover:text-brand-400 transition-colors">{agent.name}</h3>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">v{agent.version}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-[var(--text-muted)]">
                    {agent.avgRating > 0 && <span className="text-amber-400">★ {agent.avgRating.toFixed(1)}</span>}
                    <span>{agent.totalExecutions.toLocaleString()} runs</span>
                    <span className="ml-auto">
                      {agent.pricingModel === 'free' ? 'Free' : agent.price ? `$${agent.price}` : agent.pricingModel}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {agent.supportsA2A && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px]">A2A</span>}
                    {agent.supportsMCP && <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[9px]">MCP</span>}
                    {agent.tags?.slice(0, 3).map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)] text-[9px]">{t}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Capabilities Section */}
        {capabilities.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              ⚡ Capabilities
              <span className="text-xs text-[var(--text-muted)] font-normal">({capabilities.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {capabilities.map(cap => (
                <div
                  key={cap.id}
                  className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cap.icon}</span>
                    <h3 className="font-medium text-white/90">{cap.name}</h3>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{cap.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                    <span>{cap.category}</span>
                    {cap.avgRating > 0 && <span className="text-amber-400">★ {cap.avgRating.toFixed(1)}</span>}
                    <span>{cap.totalPurchases} installs</span>
                    <span className="ml-auto">
                      {cap.pricingModel === 'free' ? 'Free' : cap.price ? `$${cap.price}` : cap.pricingModel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {agents.length === 0 && capabilities.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-lg font-medium text-white">No active listings yet</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              This developer’s agents and capabilities are still being reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
