import { useQuery } from '@tanstack/react-query';
import { CreditCard, Users } from 'lucide-react';
import { financeSummary } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatMoney, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminSubscriptionsPage() {
  const { data } = useQuery({ queryKey: ['admin-finance-summary'], queryFn: financeSummary });
  const tiers = data?.tiers ?? [];
  const totalUsers = tiers.reduce((sum, tier) => sum + tier.users, 0);

  return (
    <AdminPage title="Subscriptions" subtitle="Subscription tier distribution from user_profiles">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Users in Tiers" value={formatNumber(totalUsers)} sub="profile rows" icon={<Users size={17} />} />
        <StatCard label="Tier Count" value={formatNumber(tiers.length)} sub="active tier labels" color="#1FB57A" />
        <StatCard label="Billing Volume" value={formatMoney(data?.billingVolumeCents)} sub="admin ledger" color="#B8F135" icon={<CreditCard size={17} />} />
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Tier Distribution</h2>
        <DataList
          rows={tiers}
          emptyTitle="No subscription tier data"
          emptyBody="Tier counts will appear after user profiles exist in Supabase."
          render={(tier) => (
            <div key={tier.tier} className="flex items-center justify-between py-3 border-b border-rim last:border-0">
              <div>
                <p className="text-sm font-semibold text-white capitalize">{tier.tier}</p>
                <p className="text-xs text-slate-500">user_profiles.subscription_tier</p>
              </div>
              <StatusBadge tone={tier.tier === 'free' ? 'slate' : 'green'}>{formatNumber(tier.users)} users</StatusBadge>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}
