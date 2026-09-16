import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Plus, Search, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Input, Tappable, Text, useToast } from '@/components/ui';
import { addCustomTeam, searchTeams } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import type { Team } from '@/types/models';

const MAX = 5;

/**
 * Picking the teams somebody supports.
 *
 * Two things make this fast enough for a sign-up step. It shows popular teams
 * before anyone types, so the common answer is one tap; and searching does not
 * narrow by the athlete's own sport, because a swimmer supporting Liverpool is
 * the normal case, not an edge one.
 *
 * The chosen list is ordered — the first tap is the shirt they own — and the
 * component keeps that order rather than re-sorting alphabetically, which would
 * quietly throw away the only ranking the person gave us.
 */
export function TeamPicker({
  value,
  onChange,
  sport,
}: {
  value: Team[];
  onChange: (teams: Team[]) => void;
  /** Used only to seed the first suggestions, never to filter the search. */
  sport?: string | null;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const chosen = useMemo(() => new Set(value.map((v) => v.id)), [value]);
  const full = value.length >= MAX;

  /* One in-flight search at a time, and a late reply never overwrites a newer
     one — the same rule useAsync applies, done by hand because the query here
     changes on every keystroke. */
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchTeams(query, undefined, 24);
        if (!cancelled) setResults(rows);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 220 : 0);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggle = useCallback(
    (team: Team) => {
      if (chosen.has(team.id)) {
        onChange(value.filter((v) => v.id !== team.id));
        return;
      }
      if (full) {
        toast.info(t('teams.maxReached'));
        return;
      }
      onChange([...value, team]);
    },
    [chosen, full, onChange, t, toast, value],
  );

  const addCustom = useCallback(async () => {
    const name = query.trim();
    if (name.length < 2) return;
    setAdding(true);
    try {
      const id = await addCustomTeam(name, sport ?? 'Football');
      const team: Team = {
        id,
        name,
        short_name: null,
        sport: sport ?? 'Football',
        country: null,
        crest_url: null,
        is_curated: false,
      };
      if (!full) onChange([...value, team]);
      setQuery('');
      toast.success(t('teams.addedCustom'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }, [query, sport, full, onChange, value, toast, t]);

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <View style={{ gap: spacing.md }}>
      {/* ── What they have picked ── */}
      {value.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="overline" tone="muted">
            {t('teams.selected', { count: value.length })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {value.map((team) => (
              <Tappable key={team.id} onPress={() => toggle(team)} accessibilityLabel={team.name}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingLeft: 12,
                    paddingRight: 8,
                    borderRadius: 999,
                    backgroundColor: theme.alpha(colors.primary, 0.14),
                    borderWidth: 1,
                    borderColor: theme.alpha(colors.primary, 0.35),
                  }}
                >
                  <Text variant="captionStrong" tone="primary">
                    {team.name}
                  </Text>
                  <X size={13} color={colors.primary} />
                </View>
              </Tappable>
            ))}
          </View>
        </View>
      ) : null}

      <Input
        placeholder={t('teams.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        icon={<Search size={18} color={colors.textMuted} />}
        autoCorrect={false}
        testID="team-search"
      />

      {!query ? (
        <Text variant="overline" tone="muted">
          {t('teams.popular')}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {results
          .filter((r) => !chosen.has(r.id))
          .map((team) => (
            <Tappable key={team.id} onPress={() => toggle(team)} accessibilityLabel={team.name}>
              <View
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text variant="caption">{team.name}</Text>
                {team.country ? (
                  <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                    {team.country}
                  </Text>
                ) : null}
              </View>
            </Tappable>
          ))}
      </View>

      {query && !loading && results.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t('teams.noResults', { query: query.trim() })}
        </Text>
      ) : null}

      {query.trim().length >= 2 && !exactMatch ? (
        <Card padded="sm" tone="alt">
          <Button
            label={t('teams.addCustom', { name: query.trim() })}
            variant="ghost"
            size="sm"
            loading={adding}
            icon={<Plus size={16} color={colors.primary} />}
            onPress={addCustom}
          />
          <Text variant="caption" tone="muted">
            {t('teams.addCustomHint')}
          </Text>
        </Card>
      ) : null}

      {full ? (
        <Badge label={t('teams.maxReached')} tone="warning" />
      ) : null}
    </View>
  );
}
