import type { ScoreTip } from '@/types/models';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/*
 * private.build_score_tips writes English `label`/`detail`, so the copy is
 * owned here and looked up by `key`. The counts are not sent separately; they
 * are recovered from `points`, which that function sets to 5 per missing clip
 * and 2 per empty profile field. An unknown key shows the server text.
 */
const TIP_COPY: Record<
  string,
  { label: string; detail: string; per?: number; counted?: 'label' | 'detail' }
> = {
  add_highlights: {
    label: 'score.tip.highlightsLabel',
    detail: 'score.tip.highlightsDetail',
    per: 5,
    counted: 'label',
  },
  complete_profile: {
    label: 'score.tip.profileLabel',
    detail: 'score.tip.profileDetail',
    per: 2,
    counted: 'detail',
  },
  log_matches: { label: 'score.tip.matchesLabel', detail: 'score.tip.matchesDetail' },
  get_verified: { label: 'score.tip.verifiedLabel', detail: 'score.tip.verifiedDetail' },
  ask_endorsement: { label: 'score.tip.endorsementLabel', detail: 'score.tip.endorsementDetail' },
  link_club: { label: 'score.tip.clubLabel', detail: 'score.tip.clubDetail' },
  post_update: { label: 'score.tip.postLabel', detail: 'score.tip.postDetail' },
};

export function tipText(tip: ScoreTip, t: Translate): { label: string; detail: string } {
  const copy = TIP_COPY[tip.key];
  if (!copy) return { label: tip.label, detail: tip.detail };
  const vars = copy.per ? { count: Math.max(1, Math.round(tip.points / copy.per)) } : undefined;
  return {
    label: t(copy.label, copy.counted === 'label' ? vars : undefined),
    detail: t(copy.detail, copy.counted === 'detail' ? vars : undefined),
  };
}
