'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  UserProfileData, CapacityStatus, ProfileVisibility, ProfileSection,
  CAPACITY_STATUSES, PROFILE_SECTIONS, TASK_TYPES,
} from '@/types';

type ProfileTab = 'professional' | 'lived' | 'availability' | 'privacy' | 'import';

export default function ProfileEditor() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('professional');
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // LinkedIn import state
  const [linkedinText, setLinkedinText] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) setProfile(data.profile);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateField = (field: string, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value } as UserProfileData);
    setDirty(true);
  };

  const saveProfile = async () => {
    if (!profile || !dirty) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setDirty(false);
        setSaveMessage('Profile saved');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (e) {
      setSaveMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const importLinkedIn = async () => {
    if (!linkedinText.trim()) return;
    setImporting(true);
    setImportMessage('');
    try {
      const res = await fetch('/api/profile/import-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinText, linkedinUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setImportMessage('✅ ' + data.message);
        setLinkedinText('');
        fetchProfile();
      } else {
        setImportMessage('❌ ' + data.error);
      }
    } catch {
      setImportMessage('❌ Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-white/40">Loading profile...</div>;
  }
  if (!profile) {
    return <div className="text-red-400 py-8 text-center">Failed to load profile</div>;
  }

  const tabs: Array<{ id: ProfileTab; label: string; icon: string }> = [
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'lived', label: 'Lived Experience', icon: '🌍' },
    { id: 'availability', label: 'Availability', icon: '📅' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'import', label: 'Import', icon: '📥' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {profile.headline || 'Your Profile'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus) && (
              <span className={cn('text-sm', CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus)?.color)}>
                {CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus)?.icon}{' '}
                {CAPACITY_STATUSES.find(s => s.id === profile.capacityStatus)?.label}
              </span>
            )}
            <span className="text-white/30">·</span>
            <span className="text-xs text-white/40">
              {profile.visibility === 'public' ? '🌐 Public' : profile.visibility === 'connections' ? '🔗 Connections only' : '🔒 Private'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={cn('text-sm', saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400')}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={saveProfile}
            disabled={!dirty || saving}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              dirty
                ? 'bg-brand-500 text-white hover:bg-brand-400'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            )}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 pb-px overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm rounded-t-lg transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white/10 text-white border-b-2 border-brand-500'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'professional' && (
          <ProfessionalTab profile={profile} updateField={updateField} />
        )}
        {activeTab === 'lived' && (
          <LivedExperienceTab profile={profile} updateField={updateField} />
        )}
        {activeTab === 'availability' && (
          <AvailabilityTab profile={profile} updateField={updateField} />
        )}
        {activeTab === 'privacy' && (
          <PrivacyTab profile={profile} updateField={updateField} />
        )}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-white font-medium mb-2">📥 Import from LinkedIn</h4>
              <p className="text-white/50 text-sm mb-4">
                Copy your LinkedIn profile page content and paste it below. Divi will extract your professional data.
              </p>
              <TextInput
                label="LinkedIn URL (optional)"
                value={linkedinUrl}
                onChange={setLinkedinUrl}
                placeholder="https://linkedin.com/in/yourname"
              />
              <div className="mt-3">
                <label className="label-mono text-xs text-white/40 mb-1 block">PROFILE TEXT</label>
                <textarea
                  value={linkedinText}
                  onChange={(e) => setLinkedinText(e.target.value)}
                  placeholder="Paste your LinkedIn profile text here — About section, Experience, Education, Skills, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm min-h-[200px] focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={importLinkedIn}
                  disabled={importing || !linkedinText.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    linkedinText.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  )}
                >
                  {importing ? '🧠 Analyzing...' : '🧠 Import with Divi'}
                </button>
                {importMessage && (
                  <span className="text-sm text-white/70">{importMessage}</span>
                )}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-white font-medium mb-2">💬 Learn Through Conversation</h4>
              <p className="text-white/50 text-sm">
                You can also tell Divi about yourself in chat. Say things like &quot;I speak French&quot; or &quot;I lived in Japan for 3 years&quot; and Divi will update your profile automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable form helpers ─────────────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const cls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/50';
  return (
    <div>
      <label className="label-mono text-xs text-white/40 mb-1 block">{label.toUpperCase()}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={cn(cls, 'min-h-[80px]')} />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={cls} />
      )}
    </div>
  );
}

function TagInput({ label, tags, onChange, placeholder }: {
  label: string; tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !tags.includes(t)) { onChange([...tags, t]); setInput(''); }
  };
  return (
    <div>
      <label className="label-mono text-xs text-white/40 mb-1 block">{label.toUpperCase()}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-white/10 text-white/80 text-xs px-2 py-1 rounded-full">
            {tag}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || `Add ${label.toLowerCase()}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/50" />
        <button onClick={add} className="px-3 py-2 bg-white/10 text-white/60 rounded-lg text-sm hover:bg-white/15">+</button>
      </div>
    </div>
  );
}

// ─── Tab sections ──────────────────────────────────────────────────────────

function ProfessionalTab({ profile, updateField }: { profile: UserProfileData; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <TextInput label="Headline" value={profile.headline || ''} onChange={v => updateField('headline', v)}
        placeholder="e.g. Founder & CEO at Acme · Product Strategy · AI Enthusiast" />
      <TextInput label="Bio" value={profile.bio || ''} onChange={v => updateField('bio', v)} multiline
        placeholder="Tell people who you are and what drives you..." />
      <TagInput label="Skills" tags={profile.skills || []} onChange={v => updateField('skills', v)}
        placeholder="e.g. Product Strategy, Python, Team Leadership" />
      {/* Task Types */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-1 block">TASK TYPES YOU CAN HELP WITH</label>
        <p className="text-white/30 text-xs mb-2">What kinds of tasks should connections send your way via relays?</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TASK_TYPES.map(tt => {
            const selected = (profile.taskTypes || []).includes(tt.id);
            return (
              <button
                key={tt.id}
                onClick={() => {
                  if (selected) updateField('taskTypes', (profile.taskTypes || []).filter((t: string) => t !== tt.id));
                  else updateField('taskTypes', [...(profile.taskTypes || []), tt.id]);
                }}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs transition-all',
                  selected
                    ? 'bg-brand-500/10 border-brand-500/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/8'
                )}
              >
                <span>{tt.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{tt.label}</div>
                  <div className="text-[9px] text-white/30 truncate">{tt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience list */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">EXPERIENCE</label>
        {(profile.experience || []).map((exp, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white text-sm font-medium">{exp.title}</div>
                <div className="text-white/50 text-xs">{exp.company} · {exp.startYear}{exp.endYear ? ` – ${exp.endYear}` : ' – Present'}</div>
                {exp.description && <div className="text-white/40 text-xs mt-1">{exp.description}</div>}
              </div>
              <button onClick={() => updateField('experience', profile.experience.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
        <AddExperienceForm onAdd={(exp) => updateField('experience', [...(profile.experience || []), exp])} />
      </div>

      {/* Education list */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">EDUCATION</label>
        {(profile.education || []).map((edu, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white text-sm font-medium">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</div>
                <div className="text-white/50 text-xs">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</div>
              </div>
              <button onClick={() => updateField('education', profile.education.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
        <AddEducationForm onAdd={(edu) => updateField('education', [...(profile.education || []), edu])} />
      </div>
    </div>
  );
}

function LivedExperienceTab({ profile, updateField }: { profile: UserProfileData; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-sm text-white/70">
        💡 This is what makes you <em>you</em> — beyond the resume. These help Divi understand not just what you can do, but what you <em>understand</em>.
      </div>

      {/* Languages */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">LANGUAGES</label>
        {(profile.languages || []).map((lang, i) => (
          <div key={i} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mr-2 mb-2 text-sm">
            <span className="text-white">{lang.language}</span>
            <span className="text-white/40 text-xs">{lang.proficiency}</span>
            <button onClick={() => updateField('languages', profile.languages.filter((_, j) => j !== i))}
              className="text-white/30 hover:text-red-400">×</button>
          </div>
        ))}
        <AddLanguageForm onAdd={(l) => updateField('languages', [...(profile.languages || []), l])} />
      </div>

      {/* Countries Lived */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">COUNTRIES LIVED IN</label>
        {(profile.countriesLived || []).map((c, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white text-sm">🌍 {c.country}{c.years ? ` · ${c.years} year${c.years > 1 ? 's' : ''}` : ''}</div>
                {c.context && <div className="text-white/40 text-xs mt-1">{c.context}</div>}
              </div>
              <button onClick={() => updateField('countriesLived', profile.countriesLived.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
        <AddCountryForm onAdd={(c) => updateField('countriesLived', [...(profile.countriesLived || []), c])} />
      </div>

      {/* Life Milestones */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">LIFE MILESTONES</label>
        <p className="text-white/30 text-xs mb-2">Key experiences that shaped your perspective — things no resume captures.</p>
        {(profile.lifeMilestones || []).map((m, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white text-sm">{m.milestone}{m.year ? ` (${m.year})` : ''}</div>
                {m.insight && <div className="text-white/40 text-xs mt-1 italic">&quot;{m.insight}&quot;</div>}
              </div>
              <button onClick={() => updateField('lifeMilestones', profile.lifeMilestones.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
        <AddMilestoneForm onAdd={(m) => updateField('lifeMilestones', [...(profile.lifeMilestones || []), m])} />
      </div>

      {/* Volunteering */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">VOLUNTEERING & CAUSES</label>
        {(profile.volunteering || []).map((v, i) => (
          <div key={i} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mr-2 mb-2 text-sm">
            <span className="text-white">{v.org}{v.role ? ` · ${v.role}` : ''}</span>
            {v.cause && <span className="text-white/40 text-xs">{v.cause}</span>}
            <button onClick={() => updateField('volunteering', profile.volunteering.filter((_, j) => j !== i))}
              className="text-white/30 hover:text-red-400">×</button>
          </div>
        ))}
        <AddVolunteerForm onAdd={(v) => updateField('volunteering', [...(profile.volunteering || []), v])} />
      </div>

      <TagInput label="Hobbies & Interests" tags={profile.hobbies || []} onChange={v => updateField('hobbies', v)}
        placeholder="e.g. Photography, Trail Running, Chess" />
      <TagInput label="Personal Values" tags={profile.personalValues || []} onChange={v => updateField('personalValues', v)}
        placeholder="e.g. Transparency, Sustainability, Lifelong Learning" />
      <TagInput label="Superpowers" tags={profile.superpowers || []} onChange={v => updateField('superpowers', v)}
        placeholder="What are you uniquely good at? e.g. Making complex things simple, Cross-cultural communication" />
    </div>
  );
}

function AvailabilityTab({ profile, updateField }: { profile: UserProfileData; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">CAPACITY STATUS</label>
        <div className="grid grid-cols-2 gap-2">
          {CAPACITY_STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => updateField('capacityStatus', s.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all',
                profile.capacityStatus === s.id
                  ? 'bg-white/10 border-brand-500/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
              )}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <TextInput label="Capacity Note" value={profile.capacityNote || ''}
        onChange={v => updateField('capacityNote', v)}
        placeholder="e.g. Taking on small projects only this month" />

      <TextInput label="Timezone" value={profile.timezone || ''}
        onChange={v => updateField('timezone', v)}
        placeholder="e.g. America/New_York, Europe/London" />

      <TextInput label="Working Hours" value={profile.workingHours || ''}
        onChange={v => updateField('workingHours', v)}
        placeholder="e.g. Mon-Fri 9am-5pm EST" />

      {/* Out of Office Periods */}
      <div>
        <label className="label-mono text-xs text-white/40 mb-2 block">OUT OF OFFICE PERIODS</label>
        {(profile.outOfOffice || []).map((ooo, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white text-sm">{ooo.start} → {ooo.end}</div>
                {ooo.reason && <div className="text-white/40 text-xs mt-1">{ooo.reason}</div>}
              </div>
              <button onClick={() => updateField('outOfOffice', profile.outOfOffice.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
        <AddOOOForm onAdd={(ooo) => updateField('outOfOffice', [...(profile.outOfOffice || []), ooo])} />
      </div>
    </div>
  );
}

function PrivacyTab({ profile, updateField }: { profile: UserProfileData; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-medium mb-1">Who can see your profile?</h4>
        <p className="text-white/40 text-xs mb-3">Controls who sees your profile when agents communicate via relays.</p>
        <div className="space-y-2">
          {(['public', 'connections', 'private'] as ProfileVisibility[]).map(v => (
            <button
              key={v}
              onClick={() => updateField('visibility', v)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
                profile.visibility === v
                  ? 'bg-white/10 border-brand-500/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
              )}
            >
              <span>{v === 'public' ? '🌐' : v === 'connections' ? '🔗' : '🔒'}</span>
              <div>
                <div className="font-medium">{v === 'public' ? 'Public' : v === 'connections' ? 'Connections Only' : 'Private'}</div>
                <div className="text-xs text-white/40">
                  {v === 'public' ? 'Anyone on the network can view your shared sections'
                    : v === 'connections' ? 'Only your active connections can see your profile'
                    : 'Profile hidden from everyone — only you and your Divi can see it'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-medium mb-1">Shared Sections</h4>
        <p className="text-white/40 text-xs mb-3">Choose which parts of your profile are visible to others.</p>
        <div className="space-y-2">
          {PROFILE_SECTIONS.map(section => {
            const shared = profile.sharedSections || [];
            const isShared = shared.includes(section.id);
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (isShared) updateField('sharedSections', shared.filter(s => s !== section.id));
                  else updateField('sharedSections', [...shared, section.id]);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                  isShared
                    ? 'bg-white/10 border-green-500/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/40'
                )}
              >
                <span>{section.icon}</span>
                <span className="flex-1">{section.label}</span>
                <span className={cn('text-xs', isShared ? 'text-green-400' : 'text-white/30')}>
                  {isShared ? '✓ Shared' : 'Hidden'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Mini add forms ────────────────────────────────────────────────────────

function AddExperienceForm({ onAdd }: { onAdd: (exp: any) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [desc, setDesc] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add experience</button>;

  const submit = () => {
    if (title && company && startYear) {
      onAdd({ title, company, startYear: parseInt(startYear), endYear: endYear ? parseInt(endYear) : undefined, description: desc || undefined });
      setTitle(''); setCompany(''); setStartYear(''); setEndYear(''); setDesc(''); setOpen(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Start year" value={startYear} onChange={e => setStartYear(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="End year (or blank)" value={endYear} onChange={e => setEndYear(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}

function AddEducationForm({ onAdd }: { onAdd: (edu: any) => void }) {
  const [open, setOpen] = useState(false);
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [field, setField] = useState('');
  const [year, setYear] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add education</button>;

  const submit = () => {
    if (institution && degree) {
      onAdd({ institution, degree, field: field || undefined, year: year ? parseInt(year) : undefined });
      setInstitution(''); setDegree(''); setField(''); setYear(''); setOpen(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Institution" value={institution} onChange={e => setInstitution(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Degree" value={degree} onChange={e => setDegree(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Field (optional)" value={field} onChange={e => setField(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Year (optional)" value={year} onChange={e => setYear(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}

function AddLanguageForm({ onAdd }: { onAdd: (l: any) => void }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('');
  const [proficiency, setProficiency] = useState<string>('fluent');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add language</button>;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center gap-2">
      <input placeholder="Language" value={language} onChange={e => setLanguage(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      <select value={proficiency} onChange={e => setProficiency(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none">
        <option value="native">Native</option>
        <option value="fluent">Fluent</option>
        <option value="conversational">Conversational</option>
        <option value="basic">Basic</option>
      </select>
      <button onClick={() => { if (language) { onAdd({ language, proficiency }); setLanguage(''); setOpen(false); } }} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
      <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">✕</button>
    </div>
  );
}

function AddCountryForm({ onAdd }: { onAdd: (c: any) => void }) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState('');
  const [years, setYears] = useState('');
  const [context, setContext] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add country</button>;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Years" value={years} onChange={e => setYears(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Context (e.g. study, work)" value={context} onChange={e => setContext(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (country) { onAdd({ country, years: years ? parseInt(years) : undefined, context: context || undefined }); setCountry(''); setYears(''); setContext(''); setOpen(false); } }} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}

function AddMilestoneForm({ onAdd }: { onAdd: (m: any) => void }) {
  const [open, setOpen] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [year, setYear] = useState('');
  const [insight, setInsight] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add milestone</button>;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <input placeholder="What happened?" value={milestone} onChange={e => setMilestone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Year (optional)" value={year} onChange={e => setYear(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="What insight did it give you?" value={insight} onChange={e => setInsight(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (milestone) { onAdd({ milestone, year: year ? parseInt(year) : undefined, insight: insight || undefined }); setMilestone(''); setYear(''); setInsight(''); setOpen(false); } }} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}

function AddVolunteerForm({ onAdd }: { onAdd: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [cause, setCause] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add volunteering</button>;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input placeholder="Organization" value={org} onChange={e => setOrg(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Cause (optional)" value={cause} onChange={e => setCause(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (org) { onAdd({ org, role: role || undefined, cause: cause || undefined }); setOrg(''); setRole(''); setCause(''); setOpen(false); } }} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}

function AddOOOForm({ onAdd }: { onAdd: (ooo: any) => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  if (!open) return <button onClick={() => setOpen(true)} className="text-brand-400 text-xs hover:text-brand-300">+ Add out of office</button>;

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
        <input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (start && end) { onAdd({ start, end, reason: reason || undefined }); setStart(''); setEnd(''); setReason(''); setOpen(false); } }} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-400">Add</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-white/10 text-white/50 text-xs rounded hover:bg-white/15">Cancel</button>
      </div>
    </div>
  );
}
