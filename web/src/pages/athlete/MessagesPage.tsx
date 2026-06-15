import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, Search, MessageSquare, ShieldCheck, Plus,
  ArrowLeft, Loader2, Users, MoreHorizontal, Phone, Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  listConversations, getOrCreateConversation, listMessages,
  sendMessage as sendMessageApi, markMessagesRead,
} from '../../api/messaging';
import { searchUsers } from '../../api/network';
import type { Conversation, Message, UserProfile } from '../../types';

/* ─── Helpers ──────────────────────────────────────────────── */
function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Avatar({ user, size = 10, online = false }: { user: Partial<UserProfile> | null | undefined; size?: number; online?: boolean }) {
  const px = size * 4;
  return (
    <div className="relative flex-shrink-0" style={{ width: px, height: px }}>
      <div className="w-full h-full rounded-full overflow-hidden bg-azure/15 border border-white/[0.08] flex items-center justify-center">
        {user?.avatar_url
          ? <img src={user.avatar_url} alt={user.full_name ?? ''} className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-azure">{user?.full_name?.charAt(0) ?? '?'}</span>
        }
      </div>
      {online && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-panel" />
      )}
    </div>
  );
}

/* ─── New Conversation Modal ───────────────────────────────── */
function NewConversationModal({ onClose, onSelect }: {
  onClose: () => void; onSelect: (user: UserProfile) => void;
}) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const tid = setTimeout(async () => {
      setLoading(true);
      const data = await searchUsers(query, undefined, 10);
      setResults(data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(tid);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-dark border border-white/10 w-full max-w-md p-5 rounded-2xl shadow-dark-hover" style={{ animation: 'slideUp 0.2s ease-out' }}>
        <h3 className="text-base font-bold text-white mb-4">New Message</h3>
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name..." className="input-dark w-full pl-9 text-sm" />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-6"><Loader2 size={16} className="text-azure animate-spin" /></div>}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-sm text-muted text-center py-6">No users found</p>
          )}
          {results.map(u => (
            <button key={u.id} onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left">
              <Avatar user={u} size={9} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{u.full_name}</span>
                  {u.is_verified && <ShieldCheck size={10} className="text-emerald flex-shrink-0" />}
                </div>
                <span className="text-xs text-muted capitalize">{u.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId]   = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [msgLoading, setMsgLoading]       = useState(false);
  const [sending, setSending]             = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [mobileView, setMobileView]       = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const data = await listConversations(user.id);
    setConversations(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId || !user) return;
    setMsgLoading(true);
    listMessages(activeConvId).then((data) => { setMessages(data); setMsgLoading(false); });
    markMessagesRead(activeConvId, user.id).then(() => loadConversations());
  }, [activeConvId, user, loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    const sub = supabase.channel(`conv-${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: sender } = await supabase.from('user_profiles').select('*').eq('id', newMsg.sender_id).maybeSingle();
          setMessages(prev => [...prev, { ...newMsg, sender: sender as UserProfile }]);
          loadConversations();
        }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeConvId, loadConversations]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function openConvWith(otherUser: UserProfile) {
    setShowNew(false);
    if (!user) return;
    const existing = conversations.find(c =>
      (c.participant_1_id === user.id && c.participant_2_id === otherUser.id) ||
      (c.participant_2_id === user.id && c.participant_1_id === otherUser.id)
    );
    if (existing) { setActiveConvId(existing.id); setMobileView('chat'); return; }
    const conv = await getOrCreateConversation(user.id, otherUser.id);
    setConversations(prev => [{ ...conv, other_user: otherUser } as Conversation, ...prev]);
    setActiveConvId(conv.id);
    setMobileView('chat');
  }

  async function sendMessage() {
    if (!input.trim() || !activeConvId || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await sendMessageApi(activeConvId, user.id, text);
    setSending(false);
    loadConversations();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const filtered = conversations.filter(c => !search || c.other_user?.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in" style={{ height: 'calc(100vh - 130px)', minHeight: 500 }}>
      <div className="flex h-full rounded-2xl overflow-hidden border border-white/[0.06]" style={{ background: 'rgba(10,20,35,0.9)' }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className={`
          w-full lg:w-80 xl:w-[320px] border-r border-white/[0.06] flex flex-col flex-shrink-0
          ${activeConvId && mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
        `}>
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Messages</h2>
              <button onClick={() => setShowNew(true)}
                className="w-8 h-8 rounded-xl bg-azure hover:bg-azure/90 flex items-center justify-center transition-colors">
                <Plus size={15} className="text-white" />
              </button>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..." className="input-dark w-full pl-8 text-sm py-2" />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="text-azure animate-spin" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-azure/10 flex items-center justify-center mb-3">
                  <MessageSquare size={22} className="text-azure" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No conversations yet</p>
                <p className="text-xs text-muted mb-4">Start messaging people in your network</p>
                <button onClick={() => setShowNew(true)}
                  className="text-xs text-azure hover:text-azure/80 transition-colors flex items-center gap-1">
                  <Plus size={11} /> Start a conversation
                </button>
              </div>
            )}
            {filtered.map(conv => {
              const other = conv.other_user;
              const isActive = conv.id === activeConvId;
              return (
                <button key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setMobileView('chat'); }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 transition-all text-left ${isActive ? 'bg-azure/8' : 'hover:bg-white/[0.03]'}`}
                  style={{ background: isActive ? 'rgba(47,128,237,0.08)' : undefined }}
                >
                  <Avatar user={other} size={10} online={Math.random() > 0.5} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                        {other?.full_name ?? 'Unknown'}
                      </span>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-muted flex-shrink-0">{timeLabel(conv.last_message_at)}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted/60 capitalize block mb-0.5">{other?.role}</span>
                    {conv.last_message_preview && (
                      <p className="text-xs text-muted truncate">{conv.last_message_preview}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat pane ────────────────────────────────────────── */}
        <div className={`
          flex-1 flex flex-col min-w-0
          ${mobileView === 'list' && !activeConvId ? 'hidden lg:flex' : 'flex'}
        `}>
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-azure/10 flex items-center justify-center mb-4">
                <Users size={28} className="text-azure" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Select a conversation</h3>
              <p className="text-sm text-muted max-w-xs">Choose someone from the left or start a new message to connect.</p>
              <button onClick={() => setShowNew(true)}
                className="mt-5 btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                <Plus size={14} /> New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <button onClick={() => { setMobileView('list'); setActiveConvId(null); }}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors mr-1">
                  <ArrowLeft size={16} />
                </button>
                <Avatar user={activeConv?.other_user} size={9} online />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{activeConv?.other_user?.full_name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                    <p className="text-[10px] text-emerald">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors">
                    <Phone size={15} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors">
                    <Video size={15} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors">
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {msgLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={16} className="text-azure animate-spin" />
                  </div>
                )}
                {!msgLoading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-azure/10 flex items-center justify-center mb-3">
                      <MessageSquare size={20} className="text-azure" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">Start the conversation</p>
                    <p className="text-xs text-muted">Say hello to {activeConv?.other_user?.full_name?.split(' ')[0] ?? 'them'}!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const prevMsg = messages[i - 1];
                  const showAvatar = !isMe && prevMsg?.sender_id !== msg.sender_id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && (
                        <div className="w-7 h-7 flex-shrink-0">
                          {showAvatar && <Avatar user={msg.sender} size={7} />}
                        </div>
                      )}
                      <div className={`max-w-[68%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? 'bg-azure text-white rounded-br-md'
                            : 'bg-white/[0.07] border border-white/[0.08] text-slate-200 rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                        <p className="text-[10px] text-muted">{timeLabel(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message ${activeConv?.other_user?.full_name?.split(' ')[0] ?? ''}…`}
                    className="input-dark flex-1 text-sm"
                    style={{ borderRadius: '1rem' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 bg-azure hover:bg-azure/90 disabled:opacity-40 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                    style={{ transform: input.trim() ? 'scale(1)' : 'scale(0.92)', transition: 'transform 0.15s ease, opacity 0.15s ease' }}
                  >
                    {sending ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showNew && <NewConversationModal onClose={() => setShowNew(false)} onSelect={openConvWith} />}
    </div>
  );
}
