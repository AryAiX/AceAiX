import { useQuery } from '@tanstack/react-query';
import { Bot, MessageSquare, Tags } from 'lucide-react';
import { aiAdminStats } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminAiManagementPage() {
  const { data } = useQuery({ queryKey: ['admin-ai-stats'], queryFn: aiAdminStats });

  return (
    <AdminPage title="AI Management" subtitle="AI usage and moderation signals from chat sessions, messages, and media tags">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessions Today" value={formatNumber(data?.sessionsToday)} sub="ai_chat_sessions" icon={<Bot size={17} />} />
        <StatCard label="Messages Today" value={formatNumber(data?.messagesToday)} sub="ai_chat_messages" color="#1FB57A" icon={<MessageSquare size={17} />} />
        <StatCard label="Assistant Replies" value={formatNumber(data?.assistantMessagesToday)} sub="assistant role" color="#B8F135" />
        <StatCard label="Tagged Media" value={formatNumber(data?.taggedMedia)} sub="media with AI tags" color="#F5A623" icon={<Tags size={17} />} />
      </div>

      <AdminCard>
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-azure" />
          <h2 className="text-base font-semibold text-white">Recent AI Sessions</h2>
          <StatusBadge tone={(data?.recentSessions.length ?? 0) > 0 ? 'green' : 'slate'}>{formatNumber(data?.recentSessions.length)} sessions</StatusBadge>
        </div>
        <DataList
          rows={data?.recentSessions ?? []}
          emptyTitle="No AI sessions yet"
          emptyBody="AI monitoring will populate from ai_chat_sessions once users interact with AI features."
          render={(session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 py-3 border-b border-rim last:border-0">
              <div>
                <p className="text-sm font-semibold text-white">{session.title ?? 'Untitled AI session'}</p>
                <p className="text-xs text-slate-500">{session.context_type ?? 'general'} · {formatDate(session.created_at)}</p>
              </div>
              <StatusBadge tone={session.user_id ? 'blue' : 'slate'}>{session.user_id ? 'user' : 'guest'}</StatusBadge>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}
