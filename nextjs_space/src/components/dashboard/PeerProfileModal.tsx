'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CAPACITY_STATUSES, TASK_TYPES } from '@/types';

interface PeerProfileModalProps {
  userId: string;          // target user ID
  userName?: string;       // pre-known name for immediate display
  userEmail?: string;
  connectionStatus?: string | null; // 'active' | 'pending' | null
  onClose: () => void;
  onConnect?: (email: string, name: string) => void; // connect handler
}

export default function PeerProfileModal({
  userId, userName, userEmail, connectionStatus, onClose, onConnect,
}: PeerProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);
  const [isConnected, setIsConnected] = useState(connectionStatus === 'active');
  const [tab, setTab] = useState<'profile' | 'us'>('profile');
  const [relationship, setRelationship] = useState<any>(null);
  const [relLoading, setRelLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        if (data.user) setUser(data.user);
        if (data.isConnected !== undefined) setIsConnected(data.isConnected);
        setError(null);
      } else {
        setError(data.error || 'Could not load profile');
      }
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchRelationship = useCallback(async () => {
    if (!isConnected) return;
    setRelLoading(true);
    try {
      const res = await fetch(`/api/profile/${userId}/relationship`);
      const data = await res.json();
      if (data.success) setRelationship(data);
    } catch { /* non-critical */ }
    setRelLoading(false);
  }, [userId, isConnected]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (tab === 'us' && !relationship && isConnected) fetchRelationship(); }, [tab, relationship, isConnected, fetchRelationship]);

  const handleConnect = async () => {
    if (!onConnect || !userEmail) return;
    setConnecting(true);
    onConnect(userEmail, user?.name || userName || '');
    // Optimistically show pending
    setTimeout(() => setConnecting(false), 1500);
  };

  const displayName = user?.name || userName || 'User';
  const displayEmail = user?.email || userEmail || '';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const capacity = profile ? CAPACITY_STATUSES.find((s: any) => s.id === profile.capacityStatus) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
        >
          ✕
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)] animate-pulse text-sm">Loading profile…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">{error}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {error.includes('connected') ? 'Send a connection request to see their full profile.' : 'This profile is not available.'}
            </p>
            {!isConnected && connectionStatus !== 'pending' && onConnect && userEmail && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mt-4 px-4 py-2 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
              >
                {connecting ? 'Sending…' : '+ Send Connection Request'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xl font-bold border-2 border-[var(--border-color)] flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{displayName}</h2>
                  {profile?.headline && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">{profile.headline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {capacity && (
                      <span className={cn('text-xs font-medium', capacity.color)}>
                        {capacity.icon} {capacity.label}
                      </span>
                    )}
                    {profile?.timezone && (
                      <span className="text-xs text-[var(--text-muted)]">🕐 {profile.timezone}</span>
                    )}
                    {displayEmail && (
                      <span className="text-xs text-[var(--text-muted)]">{displayEmail}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 mt-4">
                {isConnected ? (
                  <span className="text-[10px] px-3 py-1.5 rounded-md bg-green-500/15 text-green-400 font-medium">✓ Connected</span>
                ) : connectionStatus === 'pending' ? (
                  <span className="text-[10px] px-3 py-1.5 rounded-md bg-yellow-500/15 text-yellow-400 font-medium">⏳ Pending</span>
                ) : onConnect && userEmail ? (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-4 py-1.5 text-xs rounded-md bg-[var(--brand-primary)] text-white font-medium hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
                  >
                    {connecting ? 'Sending…' : '+ Connect'}
                  </button>
                ) : null}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {(['profile', 'us'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      tab === t
                        ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    {t === 'profile' ? '👤 Profile' : '🤝 Us'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'profile' ? (
                <div className="p-6 space-y-5 max-w-2xl">
                  {profile?.bio && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                  )}

                  {profile?.skills?.length > 0 && (
                    <Section icon="⚡" label="Skills">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((s: string, i: number) => (
                          <span key={i} className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs px-2.5 py-1 rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.taskTypes?.length > 0 && (
                    <Section icon="🎯" label="Can Help With">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.taskTypes.map((t: string, i: number) => {
                          const tt = TASK_TYPES.find((x: any) => x.id === t);
                          return (
                            <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-full">
                              {tt?.icon || '✨'} {tt?.label || t}
                            </span>
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {profile?.experience?.length > 0 && (
                    <Section icon="💼" label="Experience">
                      <div className="space-y-2">
                        {profile.experience.map((exp: any, i: number) => (
                          <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{exp.title}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {exp.company} · {exp.startYear}{exp.endYear ? ` – ${exp.endYear}` : ' – Present'}
                            </div>
                            {exp.description && <div className="text-xs text-[var(--text-secondary)] mt-1">{exp.description}</div>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.education?.length > 0 && (
                    <Section icon="🎓" label="Education">
                      <div className="space-y-2">
                        {profile.education.map((edu: any, i: number) => (
                          <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.languages?.length > 0 && (
                    <Section icon="🌍" label="Languages">
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((l: any, i: number) => (
                          <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs px-2.5 py-1 rounded-full text-[var(--text-secondary)]">
                            {l.language} <span className="text-[var(--text-muted)] ml-1">{l.proficiency}</span>
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.personalValues?.length > 0 && (
                    <Section icon="💎" label="Values">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.personalValues.map((v: string, i: number) => (
                          <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-2.5 py-1 rounded-full">{v}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.superpowers?.length > 0 && (
                    <Section icon="🦸" label="Superpowers">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.superpowers.map((s: string, i: number) => (
                          <span key={i} className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {profile?.hobbies?.length > 0 && (
                    <Section icon="🎮" label="Hobbies & Interests">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.hobbies.map((h: string, i: number) => (
                          <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-full">{h}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Availability */}
                  {(capacity || profile?.capacityNote || profile?.timezone) && (
                    <Section icon="📅" label="Availability">
                      <div className="bg-[var(--bg-surface)] rounded-lg p-4 border border-[var(--border-color)] space-y-2">
                        <div className="flex items-center gap-2">
                          {capacity && <span className={cn('text-sm font-medium', capacity.color)}>{capacity.icon} {capacity.label}</span>}
                          {profile?.capacityNote && <span className="text-xs text-[var(--text-muted)]">— {profile.capacityNote}</span>}
                        </div>
                        {profile?.timezone && <div className="text-xs text-[var(--text-muted)]">Timezone: {profile.timezone}</div>}
                      </div>
                    </Section>
                  )}

                  {/* Empty state when profile has no content */}
                  {!profile?.bio && !profile?.skills?.length && !profile?.experience?.length && (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-3">👤</div>
                      <p className="text-sm text-[var(--text-secondary)]">Limited profile information available</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        {!isConnected ? 'Connect with them to see more details.' : 'This user hasn\'t filled out their profile yet.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── Us Tab ─── */
                <div className="p-6 space-y-5">
                  {!isConnected ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-3">🤝</div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Not connected yet</p>
                      <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                        Connect with {displayName} to see shared work, relay history, and relationship context.
                      </p>
                      {onConnect && userEmail && (
                        <button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="mt-4 px-4 py-2 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
                        >
                          {connecting ? 'Sending…' : '+ Connect'}
                        </button>
                      )}
                    </div>
                  ) : relLoading ? (
                    <div className="text-center py-8 text-[var(--text-muted)] animate-pulse text-sm">Loading relationship data…</div>
                  ) : relationship ? (
                    <>
                      {/* Connection Info */}
                      {relationship.connection && (
                        <Section icon="🔗" label="Connection">
                          <div className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)] space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-muted)]">Trust:</span>
                              <span className="text-[var(--text-primary)] font-medium capitalize">{relationship.connection.trustLevel || 'standard'}</span>
                            </div>
                            {relationship.connection.notes && (
                              <div>
                                <span className="text-[var(--text-muted)]">Notes: </span>
                                <span className="text-[var(--text-secondary)]">{relationship.connection.notes}</span>
                              </div>
                            )}
                            {relationship.connection.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {relationship.connection.tags.map((t: string, i: number) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Section>
                      )}

                      {/* Shared Projects */}
                      {relationship.sharedProjects?.length > 0 && (
                        <Section icon="📁" label={`Shared Projects (${relationship.sharedProjects.length})`}>
                          <div className="space-y-1.5">
                            {relationship.sharedProjects.map((p: any) => (
                              <div key={p.id} className="bg-[var(--bg-surface)] rounded-lg p-2.5 border border-[var(--border-color)] text-xs">
                                <span className="text-[var(--text-primary)] font-medium">{p.name}</span>
                                {p.description && <p className="text-[var(--text-muted)] text-[11px] mt-0.5 truncate">{p.description}</p>}
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Shared Teams */}
                      {relationship.sharedTeams?.length > 0 && (
                        <Section icon="👥" label={`Shared Teams (${relationship.sharedTeams.length})`}>
                          <div className="flex flex-wrap gap-1.5">
                            {relationship.sharedTeams.map((t: any) => (
                              <span key={t.id} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-full">
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Relay History */}
                      {relationship.relayHistory?.length > 0 && (
                        <Section icon="📡" label={`Relay History (${relationship.relayHistory.length})`}>
                          <div className="space-y-1.5">
                            {relationship.relayHistory.slice(0, 5).map((r: any) => (
                              <div key={r.id} className="bg-[var(--bg-surface)] rounded-lg p-2.5 border border-[var(--border-color)] text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span>{r.direction === 'inbound' ? '📥' : '📤'}</span>
                                  <span className="text-[var(--text-primary)] truncate">{r.subject}</span>
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">{r.status}</span>
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Stats */}
                      {(relationship.emailCount > 0 || relationship.sharedEventCount > 0 || relationship.jobContracts?.length > 0) && (
                        <Section icon="📊" label="Activity">
                          <div className="grid grid-cols-3 gap-2">
                            {relationship.emailCount > 0 && (
                              <div className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)] text-center">
                                <div className="text-lg font-bold text-[var(--text-primary)]">{relationship.emailCount}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">Emails</div>
                              </div>
                            )}
                            {relationship.sharedEventCount > 0 && (
                              <div className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)] text-center">
                                <div className="text-lg font-bold text-[var(--text-primary)]">{relationship.sharedEventCount}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">Shared Events</div>
                              </div>
                            )}
                            {relationship.jobContracts?.length > 0 && (
                              <div className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)] text-center">
                                <div className="text-lg font-bold text-[var(--text-primary)]">{relationship.jobContracts.length}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">Jobs</div>
                              </div>
                            )}
                          </div>
                        </Section>
                      )}

                      {/* Empty relationship */}
                      {!relationship.sharedProjects?.length && !relationship.sharedTeams?.length && !relationship.relayHistory?.length && !relationship.emailCount && !relationship.sharedEventCount && (
                        <div className="text-center py-6">
                          <div className="text-2xl mb-2">🌱</div>
                          <p className="text-sm text-[var(--text-secondary)]">Nothing shared yet</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
                            You're connected but haven't worked on anything together yet. Start a project, send a relay, or let your agents coordinate.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-2xl mb-2">🤝</div>
                      <p className="text-sm text-[var(--text-muted)]">No relationship data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <span>{icon}</span> {label}
      </h4>
      {children}
    </section>
  );
}
