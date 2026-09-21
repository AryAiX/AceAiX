import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Bell, Shield, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserPrivate, updateUserProfile, updateUserPrivate } from '../../api/profiles';
import {
  friendlySaveError,
  validateEmail,
  validateFullName,
  validatePhone,
} from '../../lib/formValidation';

type FieldErrors = Partial<Record<'full_name' | 'email' | 'phone', string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1 text-xs text-coral">{message}</p>;
}

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
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notifError, setNotifError] = useState('');

  const { data: priv, isPending: prefsLoading } = useQuery({
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
    // Seed once the query settles — including accounts with no user_private row yet
    // (priv === null) — so the displayed and toggled values share one source of truth.
    if (priv === undefined) return;
    setForm(f => ({ ...f, email: priv?.email ?? '', phone: priv?.phone ?? '' }));
    const prefs = (priv?.notification_preferences ?? {}) as Record<string, boolean>;
    setNotifPrefs(NOTIF_PREFS.reduce<Record<string, boolean>>((acc, p) => {
      acc[p.key] = typeof prefs[p.key] === 'boolean' ? prefs[p.key] : p.defaultOn;
      return acc;
    }, {}));
  }, [priv]);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    if (key in fieldErrors) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key as keyof FieldErrors];
        return next;
      });
    }
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const nameError = validateFullName(form.full_name);
    if (nameError) errors.full_name = nameError;
    const emailError = validateEmail(form.email, { required: false });
    if (emailError) errors.email = emailError;
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;
    return errors;
  }

  async function handleSave() {
    if (!user) return;
    setSaveError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await updateUserProfile(user.id, { full_name: form.full_name.trim(), bio: form.bio, city: form.city });
      await updateUserPrivate(user.id, { email: form.email.trim(), phone: form.phone.trim() });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(friendlySaveError(e, 'Your settings could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  /** The value a switch displays: stored preference, else the documented default. */
  function prefValue(key: string) {
    return notifPrefs[key] ?? NOTIF_PREFS.find(p => p.key === key)?.defaultOn ?? false;
  }

  async function toggleNotif(key: string) {
    if (!user || prefsLoading) return;
    const previous = notifPrefs;
    const next = NOTIF_PREFS.reduce<Record<string, boolean>>((acc, p) => {
      acc[p.key] = p.key === key ? !prefValue(key) : prefValue(p.key);
      return acc;
    }, {});
    setNotifPrefs(next);
    setNotifError('');
    try {
      await updateUserPrivate(user.id, { notification_preferences: next });
    } catch (e) {
      setNotifPrefs(previous);
      setNotifError(friendlySaveError(e, 'Your notification preference could not be saved. Please try again.'));
    }
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
            type="button"
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            aria-pressed={tab === t.id}
            title={t.label}
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
              <label className="label" htmlFor="settings-full-name">Full Name</label>
              <input id="settings-full-name" value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input-field"
                required aria-invalid={!!fieldErrors.full_name}
                aria-describedby={fieldErrors.full_name ? 'settings-full-name-error' : undefined} />
              <FieldError id="settings-full-name-error" message={fieldErrors.full_name} />
            </div>
            <div>
              <label className="label" htmlFor="settings-email">Email</label>
              <input id="settings-email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" type="email"
                autoComplete="email" aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'settings-email-error' : undefined} />
              <FieldError id="settings-email-error" message={fieldErrors.email} />
            </div>
            <div>
              <label className="label" htmlFor="settings-phone">Phone</label>
              <input id="settings-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 50 000 0000" className="input-field"
                type="tel" autoComplete="tel" aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'settings-phone-error' : undefined} />
              <FieldError id="settings-phone-error" message={fieldErrors.phone} />
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
          <div className="flex justify-end gap-3 items-center">
            {saveError && <p role="alert" className="text-xs text-coral">{saveError}</p>}
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
          {prefsLoading && <p className="text-xs text-slate-400" role="status">Loading your preferences…</p>}
          {notifError && <p role="alert" className="text-xs text-coral">{notifError}</p>}
          {NOTIF_PREFS.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              desc={item.desc}
              on={prefValue(item.key)}
              disabled={prefsLoading}
              onChange={() => toggleNotif(item.key)}
            />
          ))}
        </div>
      )}

      {tab === 'privacy' && (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white">Privacy Controls</h2>
          <p className="text-xs text-slate-400">These preferences are not stored yet. Visibility continues to follow your public profile and medical consent settings.</p>
          {PRIVACY_TOGGLES.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0 opacity-70">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc} Unavailable until privacy columns ship.</p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 flex-shrink-0 ml-4 ${item.defaultOn ? 'bg-slate-600' : 'bg-slate-800'}`}>
                <div className={`w-5 h-5 bg-white/70 rounded-full ${item.defaultOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
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

function ToggleRow({ label, desc, on, disabled = false, onChange }: {
  label: string; desc: string; on: boolean; disabled?: boolean; onChange: () => void;
}) {
  const activate = () => { if (!disabled) onChange(); };
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div
        role="switch"
        aria-label={label}
        aria-checked={on}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={activate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
        className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ml-4 ${disabled ? 'cursor-wait opacity-60' : 'cursor-pointer'} ${on ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
