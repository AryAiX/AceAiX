import { useEffect, useRef, useState } from 'react';
import { Send, Search, ShieldCheck, MessageSquare, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { listConversations, listMessages, sendMessage, markMessagesRead } from '../../api/messaging';
import type { UserProfile } from '../../types';

function timeLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function Avatar({ user, size }: { user: UserProfile | undefined; size: number }) {
  return (
    <div className="rounded-full overflow-hidden bg-blue-600/20 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt={user.full_name ?? ''} className="w-full h-full object-cover" />
        : <span className="text-sm font-bold text-blue-400">{user?.full_name?.charAt(0) ?? '?'}</span>}
    </div>
  );
}

export default function RecruiterMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => listConversations(user!.id),
    enabled: !!user,
  });

  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => listMessages(activeId!),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId || !user) return;
    markMessagesRead(activeId, user.id).then(() =>
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] }),
    );
  }, [activeId, user, queryClient]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selected = conversations.find((c) => c.id === activeId) ?? null;

  const filtered = conversations.filter((c) =>
    !search || c.other_user?.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  async function send() {
    if (!input.trim() || !activeId || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(activeId, user.id, text);
    await queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
    await queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
    setSending(false);
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="section-title">Messages</h1>
        <p className="section-subtitle">Communicate directly with your prospects</p>
      </div>
      <div className="flex gap-4" style={{ height: '560px' }}>
        {/* Sidebar */}
        <div className="w-64 flex flex-col bg-navy-700 border border-slate-700/50 rounded-xl overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-slate-700/50">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input-field pl-7 text-sm py-2" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="text-blue-400 animate-spin" />
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <MessageSquare size={22} className="text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No conversations yet</p>
              </div>
            )}
            {filtered.map((conv) => {
              const other = conv.other_user;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-navy-600 transition-colors border-b border-slate-700/30 last:border-0 ${activeId === conv.id ? 'bg-blue-600/15' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar user={other} size={40} />
                    {other?.is_verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-navy-700">
                        <ShieldCheck size={7} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{other?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500 flex-shrink-0 ml-1">{timeLabel(conv.last_message_at)}</p>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message_preview ?? 'No messages yet'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-navy-700 border border-slate-700/50 rounded-xl overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <MessageSquare size={28} className="text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-white mb-1">Select a conversation</p>
              <p className="text-xs text-slate-400">Choose someone from the left to start messaging.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
                <div className="relative">
                  <Avatar user={selected.other_user} size={36} />
                  {selected.other_user?.is_verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-navy-700 flex items-center justify-center">
                      <ShieldCheck size={6} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selected.other_user?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400 capitalize">{selected.other_user?.role ?? ''}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={16} className="text-blue-400 animate-spin" />
                  </div>
                )}
                {!msgLoading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-slate-400">No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-navy-800 border border-slate-700/50 text-slate-200 rounded-tl-sm'}`}>
                          {m.content}
                        </div>
                        <p className="text-xs text-slate-500">{timeLabel(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t border-slate-700/50 flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Write a message..."
                  className="input-field flex-1 text-sm"
                />
                <button onClick={send} disabled={!input.trim() || sending} className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                  {sending ? <Loader2 size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
