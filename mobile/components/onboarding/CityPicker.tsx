import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/components/ui';
import { searchCities } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import { PickerSheet, SelectField } from './PickerSheet';

/**
 * A tapped chip, or a name left in the box. Two characters is enough for a
 * typed name; a shorter query is only a filter and the chip still stands.
 */
export function cityFromPicker(selected: string, typed: string): string {
  const draft = typed.trim();
  if (draft.length >= 2) return draft;
  return selected.trim();
}

/**
 * One city, chosen the same way as a country: a field that shows the choice,
 * and a sheet with a search box and the country's cities.
 *
 * A place that is not in the catalogue can still be picked — once two
 * letters are typed and nothing spells them, a "Use …" row is pinned on top.
 * Closing the sheet without picking drops the search, so what the field shows
 * is always what will be saved.
 */
export function CityPicker({
  country,
  value,
  onChange,
  label,
  testID,
  query: queryProp,
  onQueryChange,
  hint,
}: {
  country: string | null;
  value: string;
  onChange: (city: string) => void;
  label: string;
  testID?: string;
  /** When set, the parent owns the search text. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Under the field, once a country is chosen. */
  hint?: string;
}) {
  const t = useT();
  const toast = useToast();

  const countryKey = country?.trim() ?? '';
  const ready = countryKey.length > 0;
  const [open, setOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const controlled = queryProp !== undefined;
  const query = controlled ? queryProp : localQuery;
  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;
  const writeQuery = (next: string) => {
    if (!controlled) setLocalQuery(next);
    onQueryChangeRef.current?.(next);
  };
  const [results, setResults] = useState<string[]>([]);
  const prevCountry = useRef(countryKey);

  useEffect(() => {
    setOpen(false);
    writeQuery('');
    // A new country drops the search. `writeQuery` tells the parent too.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- countryKey only
  }, [countryKey]);

  /* One in-flight search at a time, and a late reply never overwrites a newer
     one. Only while the sheet is open: opening loads at once, keystrokes wait
     220ms. */
  useEffect(() => {
    const countryChanged = prevCountry.current !== countryKey;
    prevCountry.current = countryKey;

    if (!countryKey) {
      setResults([]);
      return;
    }
    if (countryChanged) setResults([]);
    if (!open) return;

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
  }, [countryKey, query, toast, open]);

  const typed = query.trim();
  const rows = useMemo(() => results.map((city) => ({ key: city, label: city })), [results]);
  const extraRow =
    typed.length >= 2 &&
    typed.length <= 80 &&
    !results.some((city) => city.toLowerCase() === typed.toLowerCase())
      ? { key: typed, label: t('onboarding.cityUseTyped', { name: typed }) }
      : null;

  const close = () => {
    setOpen(false);
    writeQuery('');
  };

  return (
    <>
      <SelectField
        label={label}
        value={value}
        placeholder={t('onboarding.cityChoose')}
        hint={ready ? hint : t('onboarding.cityPickCountryFirst')}
        disabled={!ready}
        onPress={() => setOpen(true)}
        testID={testID}
      />
      <PickerSheet
        visible={open}
        onClose={close}
        title={label}
        query={query}
        onQueryChange={writeQuery}
        searchPlaceholder={t('onboarding.citySearchPlaceholder')}
        rows={rows}
        selected={value || null}
        onPick={(city) => {
          onChange(city);
          close();
        }}
        emptyText={t('onboarding.cityNoMatch')}
        extraRow={extraRow}
        testID={testID ? `${testID}-sheet` : undefined}
      />
    </>
  );
}
