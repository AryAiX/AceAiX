import AsyncStorage from '@react-native-async-storage/async-storage';

/* Your Talent Score at the moment you posted, kept on this phone by post id.
   Your score history keeps only one score per day, so a post made before a
   same-day change would otherwise show the later score. */
const KEY = 'score.whenPosted.v1';
const KEEP = 300;

export async function loadScoreSnapshots(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && value > 0) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveScoreSnapshot(postId: string, score: number | null | undefined): Promise<void> {
  if (!postId || typeof score !== 'number' || score <= 0) return;
  try {
    const all = await loadScoreSnapshots();
    all[postId] = score;
    const ids = Object.keys(all);
    if (ids.length > KEEP) for (const id of ids.slice(0, ids.length - KEEP)) delete all[id];
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* best effort: the history fallback still works */
  }
}
