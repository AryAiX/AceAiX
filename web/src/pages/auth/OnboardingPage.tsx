import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const SPORTS = ['Football', 'Basketball', 'Athletics', 'Swimming', 'Tennis', 'Cricket', 'Rugby', 'Volleyball'];
const POSITIONS: Record<string, string[]> = {
  Football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Center-Back', 'Full-Back', 'Winger'],
  Basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  Athletics: ['Sprinter', 'Distance Runner', 'Jumper', 'Thrower', 'Hurdler'],
  Swimming: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley'],
  Tennis: ['Singles Player', 'Doubles Specialist'],
  Cricket: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
  Rugby: ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8', 'Scrum-Half', 'Fly-Half', 'Winger', 'Centre', 'Full-Back'],
  Volleyball: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite Hitter'],
};

export default function OnboardingPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [sport, setSport] = useState('Football');
  const [position, setPosition] = useState('');
  const [level, setLevel] = useState('amateur');
  const [club, setClub] = useState('');
  const [nationality, setNationality] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleComplete() {
    if (!profile) {
      navigate(user ? '/dashboard' : '/auth/login');
      return;
    }
    const isAthlete = profile.role === 'athlete';
    const needsGuardian = isAthlete && profile.is_minor;
    if (isAthlete && !position) {
      setError('Choose a position before finishing setup.');
      return;
    }
    if (needsGuardian && !guardianName.trim()) {
      setError('Enter your parent or guardian’s full name.');
      return;
    }
    if (needsGuardian && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail.trim())) {
      setError('Enter a valid parent or guardian email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (needsGuardian) {
        const { data: consent, error: consentError } = await supabase.rpc('request_guardian_consent', {
          p_guardian_name: guardianName.trim(),
          p_guardian_email: guardianEmail.trim().toLowerCase(),
          p_relationship: guardianRelationship,
        });
        if (consentError) throw consentError;

        const consentRow = Array.isArray(consent) ? consent[0] : consent;
        if (!consentRow?.id) throw new Error('Guardian consent request could not be created.');

        const { data: delivery, error: deliveryError } = await supabase.functions.invoke(
          'guardian-consent',
          { body: { consent_id: consentRow.id } },
        );
        if (deliveryError || delivery?.sent !== true) {
          throw new Error(
            'Your guardian request was saved, but the email could not be sent. Please try again.',
          );
        }
      }

      if (isAthlete) {
        const { error: athleteError } = await supabase
          .from('athlete_profiles')
          .update({ sport, position_primary: position, level, current_club: club, nationality })
          .eq('user_id', profile.id);
        if (athleteError) throw athleteError;
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      await refreshProfile();
      setLoading(false);
      navigate('/dashboard', { replace: true });
    } catch (completionError) {
      setLoading(false);
      setError(
        completionError instanceof Error
          ? completionError.message
          : 'We could not finish your profile setup. Please try again.',
      );
    }
  }

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4 bg-grid">
        <div className="relative card flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4 bg-grid">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900/60 via-transparent to-navy-700/20" />

      <div className="relative w-full max-w-lg animate-slide-up">
        <div className="card">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/40 rounded-2xl flex items-center justify-center">
                <Zap size={28} className="text-blue-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
            <p className="text-slate-400 text-sm mt-1">Help scouts and clubs find you faster</p>
          </div>

          {profile?.role === 'athlete' ? (
            <div className="space-y-5">
              <div>
                <label className="label">Primary Sport</label>
                <div className="grid grid-cols-4 gap-2">
                  {SPORTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSport(s); setPosition(''); }}
                      className={`py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                        sport === s
                          ? 'bg-blue-600/20 border-blue-600/60 text-blue-400'
                          : 'bg-navy-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select position</option>
                  {(POSITIONS[sport] || []).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Current Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['amateur', 'semi-pro', 'professional'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                        level === l
                          ? 'bg-blue-600/20 border-blue-600/60 text-blue-400'
                          : 'bg-navy-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Current Club (optional)</label>
                <input
                  type="text"
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="e.g. Al Ain FC"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. UAE"
                  className="input-field"
                />
              </div>

              {profile.is_minor && (
                <fieldset className="space-y-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                  <legend className="px-1 text-sm font-semibold text-white">Parent or guardian consent</legend>
                  <p className="text-xs text-slate-400">
                    Because you are under 18, we need to email a parent or guardian before profile setup can finish.
                  </p>
                  <div>
                    <label htmlFor="guardian-name" className="label">Parent or guardian name</label>
                    <input
                      id="guardian-name"
                      type="text"
                      value={guardianName}
                      onChange={(event) => setGuardianName(event.target.value)}
                      className="input-field"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="guardian-email" className="label">Parent or guardian email</label>
                    <input
                      id="guardian-email"
                      type="email"
                      value={guardianEmail}
                      onChange={(event) => setGuardianEmail(event.target.value)}
                      className="input-field"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="guardian-relationship" className="label">Relationship</label>
                    <select
                      id="guardian-relationship"
                      value={guardianRelationship}
                      onChange={(event) => setGuardianRelationship(event.target.value)}
                      className="input-field"
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Legal guardian</option>
                      <option value="coach_guardian">Coach acting as guardian</option>
                      <option value="other">Other guardian</option>
                    </select>
                  </div>
                </fieldset>
              )}

              {error && <p role="alert" className="text-xs text-coral mb-3">{error}</p>}
              <button
                onClick={handleComplete}
                disabled={loading || !position}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle size={18} /> Complete Setup</>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-6">Welcome aboard! Your account is ready. You can complete your profile from the dashboard.</p>
              {error && <p role="alert" className="text-xs text-coral mb-3">{error}</p>}
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-primary justify-center px-8 py-3 text-base"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Go to Dashboard <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
