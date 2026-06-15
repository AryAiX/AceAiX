import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Bell, Shield, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserPrivate, updateUserProfile, updateUserPrivate } from '../../api/profiles';

const NOTIF_PREFS: { key: string; label: string; desc: string; defaultOn: boolean }[] = [
  { key: 'scout_view', label: 'Scout views your profile', desc: 'Get notified when a recruiter visits your profile', defaultOn: true },
  { key: 'contact_request', label: 'New contact request', desc: 'Receive alerts for incoming scout messages', defaultOn: true },
  { key: 'ai_score', label: 'AI score updated', desc: 'When your AI performance score changes significantly', defaultOn: true },
  { key: 'medical_verified', label: 'Medical record verified', desc: 'Confirmation when a partner verifies your records', defaultOn: true },
  { key: 'new_opportunities', label: 'New opportunities', desc: 'Trials, contracts, and scholarships matching your profile', defaultOn: false },
  { key: 'weekly_digest', label: 'Weekly digest', desc: 'A summary of your profile activity each week', defaultOn: false },
];

const PRIVACY_TOGGLES = [
  { label: 'Show profile in public discovery', desc: 'Allow your profile to appear in the public Discover page', defaultOn: true },
  { label: 'Show AI score publicly', desc: 'Display your AI performance score on your public profile', defaultOn: true },
  { label: 'Allow contact from verified scouts', desc: 'Let verified platform scouts send you messages', defaultOn: true },
  { label: 'Show medical clearance status', desc: 'Display your verified clearance badge on your profile', defaultOn: false },
  { label: 'Show club affiliation', desc: 'Display your current club on your public profile', defaultOn: true },
];

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'privacy' | 'security'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: priv } = useQuery({
    queryKey: ['user-private', user?.id],
    queryFn: () => getUserPrivate(user!.id),
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', city: '', bio: '' });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile) {
      setForm(f => ({ ...f, full_name: profile.full_name ?? '', city: profile.city ?? '', bio: profile.bio ?? '' }));
    }
  }, [profile]);

  useEffect(() => {
    if (priv) {
      setForm(f => ({ ...f, email: priv.email ?? '', phone: priv.phone ?? '' }));
      const prefs = (priv.notification_preferences ?? {}) as Record<string, boolean>;
      setNotifPrefs(NOTIF_PREFS.reduce<Record<string, boolean>>((acc, p) => {
        acc[p.key] = typeof prefs[p.key] === 'boolean' ? prefs[p.key] : p.defaultOn;
        return acc;
      }, {}));
    }
  }, [priv]);

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await updateUserProfile(user.id, { full_name: form.full_name, bio: form.bio, city: form.city });
    await updateUserPrivate(user.id, { email: form.email, phone: form.phone });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleNotif(key: string) {
    if (!user) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    await updateUserPrivate(user.id, { notification_preferences: next });
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Eye size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ] as const;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl border border-slate-700/50">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-navy-700 text-white shadow-card' : 'text-slate-400 hover:text-white'}`}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-white">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} className="input-field" type="email" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 50 000 0000" className="input-field" />
            </div>
            <div>
              <label className="label">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className="input-field resize-none" placeholder="Tell scouts about yourself..." />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white">Notification Preferences</h2>
          {NOTIF_PREFS.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              desc={item.desc}
              on={notifPrefs[item.key] ?? item.defaultOn}
              onChange={() => toggleNotif(item.key)}
            />
          ))}
        </div>
      )}

      {tab === 'privacy' && (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white">Privacy Controls</h2>
          {/* NOTE: deferred — privacy toggles are local UI only (no dedicated columns yet). */}
          {PRIVACY_TOGGLES.map((item) => (
            <LocalToggleRow key={item.label} {...item} />
          ))}
        </div>
      )}

      {tab === 'security' && (
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-white">Security</h2>
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter current password" className="input-field pr-10" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" placeholder="Minimum 8 characters" className="input-field" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" placeholder="Confirm new password" className="input-field" />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled
              title="Password updates need the Supabase password-reset/change flow."
              className="btn-primary opacity-50 cursor-not-allowed"
            >
              <Shield size={15} />
              Update Password
            </button>
          </div>
          <div className="border-t border-slate-700/50 pt-5">
            <h3 className="text-sm font-semibold text-white mb-3">Danger Zone</h3>
            <button
              type="button"
              disabled
              title="Account deletion requires a confirmed destructive flow."
              className="text-rose-400/50 text-sm border border-rose-500/20 px-4 py-2 rounded-lg cursor-not-allowed"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div
        onClick={onChange}
        className={`w-10 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5 flex-shrink-0 ml-4 ${on ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function LocalToggleRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return <ToggleRow label={label} desc={desc} on={on} onChange={() => setOn(!on)} />;
}
