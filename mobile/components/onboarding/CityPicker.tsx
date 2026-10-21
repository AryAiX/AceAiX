import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Input, Text, useToast } from '@/components/ui';
import { searchCities } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import { COUNTRIES_BEFORE_EXPAND } from './Shared';

/**
 * One city, chosen the same way as a country: a search box, then chips.
 *
 * The box never holds the answer. It only filters. The chosen city is the
 * orange chip. A place that is not in the catalogue can still be picked —
 * what they typed becomes a chip when nothing already spells it.
 */
export function CityPicker({
  country,
  value,
  onChange,
  label,
  testID,
}: {
  country: string | null;
  value: string;
  onChange: (city: string) => void;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();

  const countryKey = country?.trim() ?? '';
  const ready = countryKey.length > 0;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const prevCountry = useRef(countryKey);

  useEffect(() => {
    setQuery('');
    setExpanded(false);
  }, [countryKey]);

  /* One in-flight search at a time, and a late reply never overwrites a newer
     one. Opening loads at once; keystrokes wait 220ms. */
  useEffect(() => {
    const countryChanged = prevCountry.current !== countryKey;
    prevCountry.current = countryKey;

    if (!countryKey) {
      setResults([]);
      return;
    }
    if (countryChanged) setResults([]);

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const rows = await searchCities(countryKey, query);
        if (!cancelled) setResults(rows);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      }
    }, query ? 220 : 0);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [countryKey, query, toast]);

  const typed = query.trim();

  const matches = useMemo(() => {
    const same = (name: string) => name.toLowerCase() === typed.toLowerCase();
    if (typed || expanded) {
      const list = [...results];
      if (typed.length >= 2 && typed.length <= 80 && !results.some(same)) list.push(typed);
      else if (!typed && value && !list.includes(value)) list.push(value);
      return list;
    }
    const short = results.slice(0, COUNTRIES_BEFORE_EXPAND);
    if (value && !short.includes(value)) short.push(value);
    return short;
  }, [results, typed, expanded, value]);

  const showMore =
    ready && !typed && !expanded && results.length > COUNTRIES_BEFORE_EXPAND;

  const chips = ready ? matches : value ? [value] : [];

  return (
    <View style={{ gap: spacing.md }}>
      <Input
        label={label}
        value={query}
        onChangeText={ready ? setQuery : undefined}
        placeholder={t('onboarding.citySearchPlaceholder')}
        hint={ready ? undefined : t('onboarding.cityPickCountryFirst')}
        editable={ready}
        autoCorrect={false}
        icon={<Search size={18} color={colors.textMuted} />}
        returnKeyType="search"
        testID={testID}
      />

      {ready || value ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {chips.map((city) => (
            <Chip
              key={city}
              label={city}
              selected={value === city}
              onPress={
                ready
                  ? () => {
                      onChange(city);
                      setQuery('');
                    }
                  : () => undefined
              }
            />
          ))}
          {ready && chips.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('onboarding.cityNoMatch')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {showMore ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.cityShowAll')}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="captionStrong" tone="primary">
            {t('onboarding.cityShowAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
