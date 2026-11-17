import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Plus, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Input, Text, useToast } from '@/components/ui';
import { OptionList, SelectedPills } from '@/components/onboarding/PickerSheet';
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
        let rows = await searchTeams(query, query || !sport ? undefined : sport, 24);
        // A sport with few curated teams still gets a full first screen.
        if (!query && sport && rows.length < 8) rows = await searchTeams('', undefined, 24);
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
  }, [query, sport]);

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
      {/* ── What they have picked: tap one to remove it ── */}
      {value.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="overline" tone="muted">
            {t('teams.selected', { count: value.length })}
          </Text>
          <SelectedPills
            items={value.map((team) => ({ key: team.id, label: team.name }))}
            onRemove={(id) => {
              const team = value.find((v) => v.id === id);
              if (team) toggle(team);
            }}
          />
        </View>
      ) : null}

      <Input
        placeholder={t('teams.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        icon={<Search size={18} color={colors.textMuted} />}
        autoCorrect={false}
        returnKeyType="done"
        testID="team-search"
      />

      {!query ? (
        <Text variant="overline" tone="muted">
          {t('teams.popular')}
        </Text>
      ) : null}

      {/* A short list under the box that narrows as they type. */}
      <OptionList
        rows={results
          .filter((r) => !chosen.has(r.id))
          .map((team) => ({ key: team.id, label: team.name, sublabel: team.country }))}
        onPick={(id) => {
          const team = results.find((r) => r.id === id);
          if (team) toggle(team);
        }}
        limit={8}
        testID="team-options"
      />

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
