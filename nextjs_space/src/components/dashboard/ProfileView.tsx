'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import ProfileEditor from '@/components/settings/ProfileEditor';
import {
  UserProfileData, CAPACITY_STATUSES, TASK_TYPES,
} from '@/types';

type ViewMode = 'preview' | 'edit';

export default function ProfileView({ onClose }: { onClose?: () => void } = {}) {
  const [mode, setMode] = useState<ViewMode>('preview');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [user, setUser] = useState<{ name: string | null; email: string; profilePhotoUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fetchError, setFetchError] = useState(false);

  const fetchProfile = useCallback(async (retries = 2) => {
    setFetchError(false);
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success) {
          setProfile(data.profile);
          if (data.user) setUser(data.user);
          setLoading(false);
          return;
        }
      } catch (e) {
        if (i < retries) await new Promise(r => setTimeout(r, 1000));
        else console.error('Failed to load profile:', e);
      }
    }
    setFetchError(true);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }

    setUploading(true);
    try {
      // 1. Get presigned URL
      const presignRes = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error);

      // 2. Upload to S3
      const { uploadUrl, cloud_storage_path } = presignData;
      // Check if content-disposition is in signed headers
      const urlObj = new URL(uploadUrl);
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
      if (!uploadRes.ok) throw new Error('Upload failed');

      // 3. Confirm and save URL
      const confirmRes = await fetch('/api/profile/photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path }),
      });
      const confirmData = await confirmRes.json();
      if (confirmData.success) {
        setUser(prev => prev ? { ...prev, profilePhotoUrl: confirmData.profilePhotoUrl } : prev);
      }
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      alert('Failed to upload photo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    try {
      const res = await fetch('/api/profile/photo', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, profilePhotoUrl: null } : prev);
      }
    } catch (err) {
      console.error('Failed to remove photo:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[var(--text-muted)] animate-pulse">Loading profile...</div>;
  }

  if (fetchError || (!profile || !user)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
        <div className="text-3xl opacity-40">⚠️</div>
        <p className="text-sm text-[var(--text-secondary)]">Failed to load profile. This may be a temporary connection issue.</p>
        <button onClick={() => fetchProfile()} className="btn-primary text-xs px-3 py-1.5">Retry</button>
      </div>
    );
  }

  const capacity = CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus);
  const initials = (user.name || user.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Profile Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-start gap-5">
          {/* Photo */}
          <div className="relative group flex-shrink-0">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.name || 'Profile'}
                className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border-color)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-2xl font-bold border-2 border-[var(--border-color)]">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
            >
              {uploading ? '...' : '📷'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {user.profilePhotoUrl && (
              <button
                onClick={removePhoto}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400"
                title="Remove photo"
              >
                ×
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {user.name || 'Unnamed'}
            </h2>
            {profile.headline && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">{profile.headline}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {capacity && (
                <span className={cn('text-xs font-medium', capacity.color)}>
                  {capacity.icon} {capacity.label}
                </span>
              )}
              {profile.timezone && (
                <span className="text-xs text-[var(--text-muted)]">
                  🕐 {profile.timezone}
                </span>
              )}
              <span className="text-xs text-[var(--text-muted)]">
                {profile.visibility === 'public' ? '🌐 Public' : profile.visibility === 'connections' ? '🔗 Connections only' : '🔒 Private'}
              </span>
            </div>
          </div>

          {/* Mode toggle + close */}
          <div className="flex-shrink-0 flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border-color)]">
            <button
              onClick={() => setMode('preview')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'preview'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              👁 Preview
            </button>
            <button
              onClick={() => setMode('edit')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'edit'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              ✏️ Edit
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
              title="Close profile"
            >
              ✕
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'edit' ? (
          <div className="p-6">
            <ProfileEditor onSaved={fetchProfile} />
          </div>
        ) : (
          <ProfilePreview profile={profile} user={user} />
        )}
      </div>
    </div>
  );
}

// ─── Public Profile Preview ──────────────────────────────────────────────────

function ProfilePreview({
  profile,
  user,
}: {
  profile: UserProfileData;
  user: { name: string | null; email: string; profilePhotoUrl: string | null };
}) {
  const capacity = CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Bio */}
      {profile.bio && (
        <section>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <section>
          <SectionHeader icon="⚡" label="Skills" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.skills.map((s, i) => (
              <span key={i} className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs px-2.5 py-1 rounded-full font-medium">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Task Types */}
      {profile.taskTypes?.length > 0 && (
        <section>
          <SectionHeader icon="🎯" label="Can Help With" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.taskTypes.map((t, i) => {
              const tt = TASK_TYPES.find(x => x.id === t);
              return (
                <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-full">
                  {tt?.icon || '✨'} {tt?.label || t}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Experience */}
      {profile.experience?.length > 0 && (
        <section>
          <SectionHeader icon="💼" label="Experience" />
          <div className="mt-2 space-y-3">
            {profile.experience.map((exp, i) => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="text-sm font-medium text-[var(--text-primary)]">{exp.title}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {exp.company} · {exp.startYear}{exp.endYear ? ` – ${exp.endYear}` : ' – Present'}
                </div>
                {exp.description && <div className="text-xs text-[var(--text-secondary)] mt-1">{exp.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <section>
          <SectionHeader icon="🎓" label="Education" />
          <div className="mt-2 space-y-2">
            {profile.education.map((edu, i) => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="text-sm font-medium text-[var(--text-primary)]">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Languages */}
      {profile.languages?.length > 0 && (
        <section>
          <SectionHeader icon="🌍" label="Languages" />
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.languages.map((l, i) => (
              <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs px-2.5 py-1 rounded-full text-[var(--text-secondary)]">
                {l.language} <span className="text-[var(--text-muted)] ml-1">{l.proficiency}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Values & Superpowers */}
      {(profile.personalValues?.length > 0 || profile.superpowers?.length > 0) && (
        <section>
          {profile.personalValues?.length > 0 && (
            <>
              <SectionHeader icon="💎" label="Values" />
              <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
                {profile.personalValues.map((v, i) => (
                  <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-2.5 py-1 rounded-full">{v}</span>
                ))}
              </div>
            </>
          )}
          {profile.superpowers?.length > 0 && (
            <>
              <SectionHeader icon="🦸" label="Superpowers" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.superpowers.map((s, i) => (
                  <span key={i} className="bg-amber-500/10 text-amber-300 text-xs px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Hobbies */}
      {profile.hobbies?.length > 0 && (
        <section>
          <SectionHeader icon="🎮" label="Hobbies & Interests" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.hobbies.map((h, i) => (
              <span key={i} className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-full">{h}</span>
            ))}
          </div>
        </section>
      )}

      {/* Availability */}
      <section>
        <SectionHeader icon="📅" label="Availability" />
        <div className="mt-2 bg-[var(--bg-surface)] rounded-lg p-4 border border-[var(--border-color)] space-y-2">
          <div className="flex items-center gap-2">
            {capacity && (
              <span className={cn('text-sm font-medium', capacity.color)}>
                {capacity.icon} {capacity.label}
              </span>
            )}
            {profile.capacityNote && (
              <span className="text-xs text-[var(--text-muted)]">— {profile.capacityNote}</span>
            )}
          </div>
          {profile.timezone && (
            <div className="text-xs text-[var(--text-muted)]">
              Timezone: {profile.timezone}
            </div>
          )}
        </div>
      </section>

      {/* Volunteering */}
      {profile.volunteering?.length > 0 && (
        <section>
          <SectionHeader icon="🤲" label="Volunteering" />
          <div className="mt-2 space-y-2">
            {profile.volunteering.map((v, i) => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="text-sm font-medium text-[var(--text-primary)]">{v.org}</div>
                {v.role && <div className="text-xs text-[var(--text-muted)]">{v.role}</div>}
                {v.cause && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{v.cause}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Life Milestones */}
      {profile.lifeMilestones?.length > 0 && (
        <section>
          <SectionHeader icon="🏔" label="Life Milestones" />
          <div className="mt-2 space-y-2">
            {profile.lifeMilestones.map((m, i) => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="text-sm text-[var(--text-primary)]">{m.milestone}</div>
                {m.year && <div className="text-xs text-[var(--text-muted)] mt-0.5">{m.year}</div>}
                {m.insight && <div className="text-xs text-[var(--text-secondary)] mt-0.5 italic">{m.insight}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LinkedIn */}
      {profile.linkedinUrl && (
        <section>
          <a
            href={profile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            🔗 LinkedIn Profile
          </a>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
      <span>{icon}</span> {label}
    </h4>
  );
}
