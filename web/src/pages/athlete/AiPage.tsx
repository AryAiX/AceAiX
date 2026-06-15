import { useState, useEffect } from 'react';
import { Send, Bot, User, Zap, Lightbulb, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyAthlete } from '../../hooks/useAthlete';

type ChatMessage = { id: string; role: 'assistant' | 'user'; content: string; time: string };

const DEFAULT_GREETING = "Hello! I'm your AceAiX AI Career Coach. I can help you optimize your profile, analyze your performance trends, project your career trajectory, and answer questions about the platform. What would you like to explore today?";

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', role: 'assistant', content: DEFAULT_GREETING, time: '' },
];

const SUGGESTIONS = [
  { icon: <TrendingUp size={14} />, text: 'Analyze my performance trends' },
  { icon: <Target size={14} />, text: 'How can I improve my visibility score?' },
  { icon: <Zap size={14} />, text: 'What\'s my career trajectory forecast?' },
  { icon: <Lightbulb size={14} />, text: 'Profile optimization tips' },
];

export default function AiPage() {
  const { profile } = useAuth();
  const { data: athlete } = useMyAthlete();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Seed the opening assistant message from real athlete context (kept until the user sends a message).
  useEffect(() => {
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].id !== '1') return prev;
      const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
      const score = athlete ? Math.round(athlete.performance_score ?? 0) : null;
      const visibility = athlete ? Math.round(athlete.visibility_score ?? 0) : null;
      const greeting = athlete
        ? `Welcome back, ${firstName}! Your AI performance score is ${score}/100 and your visibility score is ${visibility}/100. I can help you optimize your profile, analyze performance trends, and forecast your career trajectory. What would you like to explore today?`
        : DEFAULT_GREETING;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [{ id: '1', role: 'assistant', content: greeting, time }];
    });
  }, [profile, athlete]);

  function getProfileResponse(userInput: string): string {
    const lower = userInput.toLowerCase();
    const profileScore = athlete?.profile_completeness ?? 0;
    const performance = athlete?.performance_score ?? 0;
    const visibility = athlete?.visibility_score ?? 0;
    const fitness = athlete?.fitness_score ?? 0;
    const position = athlete?.position ?? athlete?.position_primary ?? 'your position';
    const club = athlete?.current_club ?? 'your current club';

    if (!athlete) {
      return 'I need your athlete profile before I can analyze anything. Complete onboarding first, then add verified match, media, medical, and endorsement data.';
    }
    if (lower.includes('perform') || lower.includes('stats') || lower.includes('trend')) {
      return `Your current stored performance score is ${performance}/100 and fitness score is ${fitness}/100 for ${position}. Add verified match records to make this analysis more specific.`;
    }
    if (lower.includes('visib') || lower.includes('score') || lower.includes('found')) {
      return `Your current visibility score is ${visibility}/100. The most useful next steps are completing profile sections, adding public highlight clips, keeping medical clearance current, and collecting trusted endorsements.`;
    }
    if (lower.includes('traject') || lower.includes('career') || lower.includes('future')) {
      return `Your career view is based on the trajectory data stored on your profile. Current club: ${club}. Add season-by-season milestones and verified match history to improve forecasting quality.`;
    }
    if (lower.includes('profile') || lower.includes('optim') || lower.includes('improv')) {
      return `Your profile completeness is ${profileScore}%. Focus on missing identity, athletic, physical, media, medical, and endorsement data until the dashboard checklist is complete.`;
    }
    return 'I can only use the data currently stored on your AceAiX profile in this build. Ask about performance, visibility, trajectory, or profile optimization and I will answer from those fields.';
  }

  async function sendMessage(text?: string) {
    const content = text || input.trim();
    if (!content) return;
    setInput('');
    const userMsg = { id: String(Date.now()), role: 'user' as const, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const aiMsg = { id: String(Date.now() + 1), role: 'assistant' as const, content: getProfileResponse(content), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">AI Career Coach</h1>
          <p className="section-subtitle">Powered by AceAiX Intelligence</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-600/15 border border-blue-600/30 rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-400 font-medium">Active</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="card p-0 flex flex-col" style={{ height: '520px' }}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AceAiX AI Coach</p>
            <p className="text-xs text-slate-500">Career & Performance Intelligence</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-blue-600/20 border border-blue-600/30' : 'bg-slate-700'}`}>
                {msg.role === 'assistant' ? <Bot size={14} className="text-blue-400" /> : <User size={14} className="text-slate-300" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'assistant' ? 'bg-navy-700 border border-slate-700/50 rounded-tl-sm' : 'bg-blue-600 rounded-tr-sm'}`}>
                <p className="text-sm text-slate-200 leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'assistant' ? 'text-slate-500' : 'text-blue-300/70'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-600/20 border border-blue-600/30 rounded-full flex items-center justify-center">
                <Bot size={14} className="text-blue-400" />
              </div>
              <div className="bg-navy-700 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => sendMessage(s.text)}
                className="flex items-center gap-1.5 px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-slate-700 hover:border-slate-500 rounded-full text-xs text-slate-300 hover:text-white transition-all whitespace-nowrap"
              >
                {s.icon}
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask your AI coach anything..."
              className="input-field flex-1"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
