'use client';

import { cn } from '@/lib/utils';
import { CATEGORIES } from './constants';
import type { EarningsData, EarningsTab, FeeInfo, JobEarningsData } from './types';

interface EarningsViewProps {
  earningsTab: EarningsTab;
  setEarningsTab: (tab: EarningsTab) => void;
  earnings: EarningsData | null;
  earningsLoading: boolean;
  jobEarnings: JobEarningsData | null;
  jobEarningsLoading: boolean;
  feeInfo: FeeInfo | null;
  onGoToRegister: () => void;
}

export function EarningsView({
  earningsTab,
  setEarningsTab,
  earnings,
  earningsLoading,
  jobEarnings,
  jobEarningsLoading,
  feeInfo,
  onGoToRegister,
}: EarningsViewProps) {
  return (
    <div className="space-y-4">
      {/* Earnings sub-tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-px">
        <button
          onClick={() => setEarningsTab('job')}
          className={cn(
            'px-3 py-2 text-sm rounded-t-lg transition-all',
            earningsTab === 'job'
              ? 'bg-white/10 text-white border-b-2 border-emerald-500'
              : 'text-white/50 hover:text-white/70 hover:bg-white/5'
          )}
        >
          💼 Job Earnings
        </button>
        <button
          onClick={() => setEarningsTab('agent')}
          className={cn(
            'px-3 py-2 text-sm rounded-t-lg transition-all',
            earningsTab === 'agent'
              ? 'bg-white/10 text-white border-b-2 border-brand-500'
              : 'text-white/50 hover:text-white/70 hover:bg-white/5'
          )}
        >
          🤖 Agent Earnings
        </button>
      </div>

      {earningsTab === 'job' && (
        <JobEarningsSection jobEarnings={jobEarnings} jobEarningsLoading={jobEarningsLoading} />
      )}
      {earningsTab === 'agent' && (
        <AgentEarningsSection
          earnings={earnings}
          earningsLoading={earningsLoading}
          feeInfo={feeInfo}
          onGoToRegister={onGoToRegister}
        />
      )}
    </div>
  );
}

/* ── Job Earnings sub-section ───────────────────────────────── */

function JobEarningsSection({
  jobEarnings,
  jobEarningsLoading,
}: {
  jobEarnings: JobEarningsData | null;
  jobEarningsLoading: boolean;
}) {
  if (jobEarningsLoading) return <div className="text-center py-8 text-white/30">Loading job earnings...</div>;
  if (!jobEarnings) return null;

  const w = jobEarnings.asWorker;
  const c = jobEarnings.asClient;

  return (
    <div className="space-y-4">
      {/* Worker earnings hero */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-brand-500/5 to-teal-500/5 border border-emerald-500/20 rounded-xl p-6">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Job Earnings (as Worker)</div>
        <div className="text-3xl font-bold text-emerald-400">${(w.totals.totalPaid || 0).toLocaleString()}</div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-white/40">{w.totals.totalContracts} contract{w.totals.totalContracts !== 1 ? 's' : ''}</span>
          <span className="text-white/15">|</span>
          <span className="text-white/40">{w.totals.activeContracts} active</span>
          {w.totals.totalPending > 0 && (
            <>
              <span className="text-white/15">|</span>
              <span className="text-amber-400/70">Pending: ${w.totals.totalPending.toLocaleString()}</span>
            </>
          )}
          {w.totals.totalFees > 0 && (
            <>
              <span className="text-white/15">|</span>
              <span className="text-white/30">Fees: ${w.totals.totalFees.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Worker contracts */}
      {w.contracts.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3">📋 Your Job Contracts</h3>
          <div className="space-y-2">
            {w.contracts.map((ct: any) => (
              <div key={ct.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate">{ct.job?.title || 'Job'}</div>
                  <div className="text-[10px] text-white/35">
                    {ct.compensationType} · ${ct.compensationAmount}/{ct.compensationType === 'flat' ? 'total' : ct.compensationType}
                    {ct.job?.poster?.name && <span> · Client: {ct.job.poster.name}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-medium text-emerald-400">${ct.totalPaid || 0}</div>
                  {ct.totalPending > 0 && <div className="text-[9px] text-amber-400/60">+${ct.totalPending} pending</div>}
                  <div className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block',
                    ct.status === 'active' ? 'bg-emerald-500/20 text-emerald-400'
                      : ct.status === 'completed' ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-white/10 text-white/40'
                  )}>
                    {ct.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {w.contracts.length === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">💼</div>
          <p className="text-sm text-white/40">No job contracts yet. Apply to jobs to start earning.</p>
        </div>
      )}

      {/* Client spending */}
      {c.contracts.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3">💳 Your Spending (as Client)</h3>
          <div className="flex items-center gap-4 mb-3 text-xs">
            <span className="text-white/40">Total spent: <span className="text-white/70 font-medium">${c.totals.totalSpent.toLocaleString()}</span></span>
            <span className="text-white/40">Fees: <span className="text-white/50">${c.totals.totalFees.toLocaleString()}</span></span>
          </div>
          <div className="space-y-2">
            {c.contracts.map((ct: any) => (
              <div key={ct.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate">{ct.job?.title || 'Job'}</div>
                  <div className="text-[10px] text-white/35">
                    Worker: {ct.worker?.name || ct.worker?.email || 'Unknown'}
                  </div>
                </div>
                <div className="text-sm font-medium text-white/50">${ct.totalPaid || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Agent Earnings sub-section ─────────────────────────────── */

function AgentEarningsSection({
  earnings,
  earningsLoading,
  feeInfo,
  onGoToRegister,
}: {
  earnings: EarningsData | null;
  earningsLoading: boolean;
  feeInfo: FeeInfo | null;
  onGoToRegister: () => void;
}) {
  if (earningsLoading) return <div className="text-center py-8 text-white/30">Loading agent earnings...</div>;
  if (!earnings?.hasListings) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="text-sm font-medium text-white/60 mb-1">No agents listed yet</h3>
        <p className="text-xs text-white/35 mb-4">List an agent with paid pricing to start earning from the Bubble Store.</p>
        <button onClick={onGoToRegister} className="px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-all">
          + List Your First Agent
        </button>
      </div>
    );
  }

  const t = earnings.totals!;
  const fi = earnings.feeInfo || feeInfo;
  const sc = earnings.stripeConnect;
  return (
    <div className="space-y-4">
      {/* Stripe Connect banner */}
      {sc && !sc.onboarded && earnings.hasPaidListings && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          sc.hasAccount
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-brand-500/10 border-brand-500/20'
        )}>
          <span className="text-2xl">{sc.hasAccount ? '⏳' : '🏦'}</span>
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-medium', sc.hasAccount ? 'text-amber-400' : 'text-brand-400')}>
              {sc.hasAccount ? 'Complete Stripe Setup' : 'Set Up Payouts'}
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              {sc.hasAccount
                ? 'Your Stripe Connect onboarding is incomplete. Finish it to receive payouts from paid agent executions.'
                : 'Connect your bank account via Stripe to receive payouts when users execute your paid agents.'}
            </div>
          </div>
          <button
            onClick={async () => {
              const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
              const data = await res.json();
              if (data.url) window.open(data.url, '_blank');
            }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all',
              sc.hasAccount
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
            )}
          >
            {sc.hasAccount ? 'Continue →' : 'Connect Stripe →'}
          </button>
        </div>
      )}

      {sc?.onboarded && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="text-emerald-400 text-xs">✓ Stripe Connected</span>
          <button
            onClick={async () => {
              const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
              const data = await res.json();
              if (data.url) window.open(data.url, '_blank');
            }}
            className="text-xs text-white/40 hover:text-white/60 transition-colors ml-auto"
          >
            Open Stripe Dashboard →
          </button>
        </div>
      )}

      {/* Revenue hero */}
      <div className="bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-emerald-500/5 border border-brand-500/20 rounded-xl p-6">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Bubble Store Earnings</div>
        <div className="text-3xl font-bold text-emerald-400">${(t.developerPayout || 0).toLocaleString()}</div>
        {t.grossRevenue > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-white/40">Gross: ${t.grossRevenue.toLocaleString()}</span>
            <span className="text-white/15">|</span>
            <span className="text-white/30">Platform fee: ${t.platformFees.toLocaleString()}</span>
            {t.pendingPayout > 0 && (
              <>
                <span className="text-white/15">|</span>
                <span className="text-amber-400/70">Pending: ${t.pendingPayout.toLocaleString()}</span>
              </>
            )}
          </div>
        )}
        <div className="text-xs text-white/35 mt-1">{t.paidAgents} paid agent{t.paidAgents !== 1 ? 's' : ''} · {t.activeSubscriptions} active subscriber{t.activeSubscriptions !== 1 ? 's' : ''}</div>
        {fi && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/40">
            💡 Revenue split: <span className="text-emerald-400 font-medium">{fi.developerPercent}% to you</span> · {fi.feePercent}% routing fee
            {fi.isSelfHosted && <span className="ml-1 text-brand-400">(internal: 0% · network: {fi.networkFeePercent}% min)</span>}
            {!fi.isSelfHosted && <span className="ml-1">· Internal transactions configurable · Network: {fi.networkFeePercent}% minimum enforced</span>}
          </div>
        )}
        {t.subscriptionMRR > 0 && (
          <div className="mt-2 text-xs text-brand-400/70">📈 Monthly recurring: ${t.subscriptionMRR.toLocaleString()}/mo</div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Agents', value: t.totalAgents, icon: '🤖' },
          { label: 'Total Executions', value: t.totalExecutions, icon: '🚀' },
          { label: 'Success Rate', value: t.completedExecutions > 0 ? `${Math.round((t.completedExecutions / t.totalExecutions) * 100)}%` : '—', icon: '✅' },
          { label: 'Unique Users', value: t.uniqueUsers, icon: '👥' },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-lg font-semibold text-white/90">{s.value}</div>
            <div className="text-[10px] text-white/35">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent breakdown with visual bars */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white/70 mb-4">📊 Agent Performance</h3>
        <div className="space-y-3">
          {earnings.agents?.map((a: any) => {
            const maxExec = Math.max(...(earnings.agents?.map((x: any) => x.totalExecutions || 0) || [1]));
            const execPct = maxExec > 0 ? ((a.totalExecutions || 0) / maxExec) * 100 : 0;
            const successRate = a.totalExecutions > 0 ? Math.round(((a.completedExecutions || a.totalExecutions) / a.totalExecutions) * 100) : 0;
            const maxRev = Math.max(...(earnings.agents?.map((x: any) => (x.developerPayout || 0)) || [1]));
            const revPct = maxRev > 0 ? ((a.developerPayout || 0) / maxRev) * 100 : 0;
            return (
              <div key={a.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{CATEGORIES.find(c => c.id === a.category)?.icon || '🤖'}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 truncate">{a.name}</div>
                      <div className="text-[10px] text-white/35">{a._count?.subscriptions || 0} subscribers</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className={cn('text-sm font-medium', a.pricingModel === 'free' ? 'text-white/40' : 'text-emerald-400')}>
                      {a.pricingModel === 'free' ? 'Free' : `$${(a.developerPayout || 0).toLocaleString()}`}
                    </div>
                    <div className={cn('text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block', a.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40')}>
                      {a.status}
                    </div>
                  </div>
                </div>
                {/* Execution bar */}
                <div className="mb-1.5">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-white/35">Executions: {a.totalExecutions || 0}</span>
                    <span className={cn('font-medium', successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-red-400')}>
                      {successRate}% success
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500/60 rounded-full transition-all duration-500" style={{ width: `${Math.max(execPct, 2)}%` }} />
                  </div>
                </div>
                {/* Revenue bar (only for paid) */}
                {a.pricingModel !== 'free' && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-white/35">Revenue share</span>
                      {a.grossRevenue > 0 && <span className="text-white/25">gross ${(a.grossRevenue || 0).toLocaleString()}</span>}
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${Math.max(revPct, 2)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution success breakdown chart */}
      {t.totalExecutions > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3">⚙️ Execution Breakdown</h3>
          <div className="flex items-end gap-1 h-24">
            {(() => {
              const completed = t.completedExecutions || 0;
              const failed = t.failedExecutions || 0;
              const pending = t.totalExecutions - completed - failed;
              const total = t.totalExecutions;
              return [
                { label: 'Completed', count: completed, color: 'bg-emerald-500' },
                { label: 'Failed', count: failed, color: 'bg-red-500' },
                { label: 'Pending', count: pending > 0 ? pending : 0, color: 'bg-amber-500' },
              ].filter(s => s.count > 0).map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-white/50 font-medium">{s.count}</div>
                  <div
                    className={cn('w-full rounded-t-md', s.color, 'opacity-60')}
                    style={{ height: `${Math.max((s.count / total) * 80, 4)}px` }}
                  />
                  <div className="text-[9px] text-white/30">{s.label}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {earnings.recentExecutions && earnings.recentExecutions.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3">⚡ Recent Activity</h3>
          <div className="space-y-1.5">
            {earnings.recentExecutions.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  e.status === 'completed' ? 'bg-emerald-400' : e.status === 'failed' ? 'bg-red-400' : 'bg-white/20'
                )} />
                <span className="text-white/50 truncate flex-1">{e.taskInput.slice(0, 50)}{e.taskInput.length > 50 ? '...' : ''}</span>
                {e.developerPayout > 0 && (
                  <span className="text-emerald-400/80 flex-shrink-0 font-medium">+${e.developerPayout}</span>
                )}
                <span className="text-white/25 flex-shrink-0">{e.user?.name || 'User'}</span>
                {e.rating && <span className="text-amber-400/60 flex-shrink-0">{'★'.repeat(e.rating)}</span>}
                <span className="text-white/20 flex-shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
