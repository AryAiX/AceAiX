import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sliders, ToggleLeft } from 'lucide-react';
import { listFeatureFlags, listPlatformSettings, updatePlatformSetting } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminSystemConfigPage() {
  const queryClient = useQueryClient();
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('{}');
  const { data: settings = [] } = useQuery({ queryKey: ['admin-platform-settings'], queryFn: listPlatformSettings });
  const { data: flags = [] } = useQuery({ queryKey: ['admin-feature-flags'], queryFn: listFeatureFlags });
  const saveSetting = useMutation({
    mutationFn: () => updatePlatformSetting(settingKey, JSON.parse(settingValue) as Record<string, unknown>),
    onSuccess: () => {
      setSettingKey('');
      setSettingValue('{}');
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  return (
    <AdminPage title="System Config" subtitle="Feature flags and platform settings stored in Supabase">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Settings" value={formatNumber(settings.length)} sub="platform_settings" icon={<Sliders size={17} />} />
        <StatCard label="Feature Flags" value={formatNumber(flags.length)} sub="feature_flags" color="#1FB57A" icon={<ToggleLeft size={17} />} />
        <StatCard label="Enabled Flags" value={formatNumber(flags.filter((flag) => flag.enabled).length)} sub="active toggles" color="#B8F135" />
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Upsert Platform Setting</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_auto] gap-3">
          <input value={settingKey} onChange={(event) => setSettingKey(event.target.value)} placeholder="setting_key" className="input-field" />
          <input value={settingValue} onChange={(event) => setSettingValue(event.target.value)} placeholder='{"enabled":true}' className="input-field font-mono" />
          <button
            className="btn-primary justify-center"
            disabled={!settingKey || saveSetting.isPending}
            onClick={() => saveSetting.mutate()}
          >
            Save
          </button>
        </div>
        {saveSetting.error && <p className="text-xs text-coral mt-2">{String(saveSetting.error.message)}</p>}
      </AdminCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">Platform Settings</h2>
          <DataList
            rows={settings}
            emptyTitle="No platform settings"
            emptyBody="Settings will appear here when platform_settings rows exist."
            render={(setting) => (
              <div key={setting.key} className="py-3 border-b border-rim last:border-0">
                <p className="text-sm font-semibold text-white">{setting.key}</p>
                <p className="text-xs text-slate-500">Updated {formatDate(setting.updated_at)}</p>
                <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap">{JSON.stringify(setting.value, null, 2)}</pre>
              </div>
            )}
          />
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">Feature Flags</h2>
          <DataList
            rows={flags}
            emptyTitle="No feature flags"
            emptyBody="Feature flags will appear here when feature_flags rows exist."
            render={(flag) => (
              <div key={flag.id} className="py-3 border-b border-rim last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{flag.name}</p>
                    <p className="text-xs text-slate-500">{flag.description ?? 'No description'} · {flag.rollout_pct}%</p>
                  </div>
                  <StatusBadge tone={flag.enabled ? 'green' : 'slate'}>{flag.enabled ? 'enabled' : 'disabled'}</StatusBadge>
                </div>
              </div>
            )}
          />
        </AdminCard>
      </div>
    </AdminPage>
  );
}
