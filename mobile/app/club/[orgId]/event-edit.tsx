import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Input, ListItem, Screen, SectionHeader, Switch, Text, useToast } from '@/components/ui';
import { ChipField, FormGateScreen, primaryAddress, useFormParams, type FormGate } from '@/components/club/event/formShared';
import { WhenField } from '@/components/club/event/WhenField';
import { parseWhole } from '@/components/club/match/matchFormat';
import { sportEmoji, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getClubEventPage, getClubPage, saveClubEvent } from '@/lib/api.club';
import { EVENT_KINDS, type ClubEventKind } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

const AGE_MIN = 5;
const AGE_MAX = 60;
const NO_SPORT = '__any__';

/**
 * Create or edit a club event. Only the title and the start are required;
 * everything else has a sensible default (open registration, no cap, free).
 */
export default function ClubEventEditScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { orgId, editId, badEditId } = useFormParams();

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const existing = useAsync(() => getClubEventPage(editId as string), [editId], { enabled: !!editId });

  const [kind, setKind] = useState<ClubEventKind>('trial');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<string>(NO_SPORT);
  const [category, setCategory] = useState('');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [capacity, setCapacity] = useState('');
  const [open, setOpen] = useState(true);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !page.data) return;
    if (editId) {
      if (!existing.data) return;
      const e = existing.data.event;
      setKind(e.kind);
      setTitle(e.title);
      setDescription(e.description ?? '');
      setSport(e.sport ?? NO_SPORT);
      setCategory(e.category ?? '');
      setStartsAt(new Date(e.starts_at));
      setEndsAt(e.ends_at ? new Date(e.ends_at) : null);
      setLocation(e.location ?? '');
      setAgeMin(e.age_min != null ? String(e.age_min) : '');
      setAgeMax(e.age_max != null ? String(e.age_max) : '');
      setCapacity(e.capacity != null ? String(e.capacity) : '');
      setOpen(e.registration_open);
      setPrice(e.price != null && e.price > 0 ? String(e.price) : '');
      setCurrency(e.currency || 'AED');
    } else {
      if (page.data.sports.length === 1) setSport(page.data.sports[0].sport);
      setLocation(primaryAddress(page.data));
    }
    hydrated.current = true;
  }, [editId, existing.data, page.data]);

  const categories = useMemo(
    () => page.data?.sports.find((s) => s.sport === sport)?.categories ?? [],
    [page.data, sport],
  );

  const header = <Header back title={editId ? t('clubMatch.eventForm.editTitle') : t('clubMatch.eventForm.newTitle')} />;

  let gate: FormGate | null = null;
  if (!orgId || badEditId) gate = 'invalid';
  else if (page.loading || (editId && existing.loading)) gate = 'loading';
  else if (page.error || (editId && existing.error)) gate = 'error';
  else if (!page.data || (editId && (!existing.data || existing.data.event.organization_id !== orgId))) gate = 'gone';
  else if (!page.data.viewer.can_post) gate = 'denied';

  if (gate || !page.data || !orgId) {
    return (
      <FormGateScreen
        gate={gate ?? 'gone'}
        header={header}
        error={page.error ?? existing.error}
        onRetry={() => {
          page.reload();
          if (editId) existing.reload();
        }}
        orgId={orgId}
        testID="club-event-edit-screen"
      />
    );
  }

  const minV = parseWhole(ageMin);
  const maxV = parseWhole(ageMax);
  const capV = parseWhole(capacity);
  const priceV = parseWhole(price);
  const ageBad = (v: number | null, text: string) => text.trim() !== '' && (v == null || v < AGE_MIN || v > AGE_MAX);

  const errors = {
    title: title.trim().length < 4 ? t('clubMatch.eventForm.titleShort') : null,
    starts: !startsAt
      ? t('clubMatch.eventForm.startRequired')
      : !editId && startsAt.getTime() <= Date.now()
        ? t('clubMatch.eventForm.startFuture')
        : null,
    ends: endsAt && startsAt && endsAt.getTime() <= startsAt.getTime() ? t('clubMatch.eventForm.endAfterStart') : null,
    ageMin: ageBad(minV, ageMin) ? t('clubMatch.eventForm.ageRange', { min: AGE_MIN, max: AGE_MAX }) : null,
    ageMax: ageBad(maxV, ageMax)
      ? t('clubMatch.eventForm.ageRange', { min: AGE_MIN, max: AGE_MAX })
      : minV != null && maxV != null && maxV < minV
        ? t('clubMatch.eventForm.ageOrder')
        : null,
    capacity: capacity.trim() !== '' && (capV == null || capV < 1 || capV > 10000) ? t('clubMatch.eventForm.capacityBad') : null,
    price: price.trim() !== '' && priceV == null ? t('clubMatch.eventForm.priceBad') : null,
    currency: !/^[A-Za-z]{3}$/.test(currency.trim()) ? t('clubMatch.eventForm.currencyBad') : null,
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = async () => {
    setTried(true);
    if (!valid || !startsAt) return;
    setSaving(true);
    try {
      const id = await saveClubEvent(orgId, editId, {
        kind,
        title: title.trim(),
        description: description.trim() || null,
        sport: sport === NO_SPORT ? null : sport,
        category: sport === NO_SPORT ? null : category.trim() || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        location: location.trim() || null,
        age_min: minV,
        age_max: maxV,
        capacity: capV,
        registration_open: open,
        price: priceV && priceV > 0 ? priceV : null,
        currency: currency.trim().toUpperCase(),
      });
      toast.success(editId ? t('clubMatch.eventForm.saved') : t('clubMatch.eventForm.created'));
      router.replace(Routes.clubEvent(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const digits = (setter: (v: string) => void, max: number) => (v: string) => setter(v.replace(/[^0-9]/g, '').slice(0, max));

  return (
    <Screen
      header={header}
      keyboardAvoiding
      contentStyle={{ gap: spacing.xl, paddingTop: spacing.md }}
      footer={
        <Button
          label={editId ? t('common.save') : t('clubMatch.eventForm.create')}
          fullWidth
          size="lg"
          loading={saving}
          disabled={saving || (tried && !valid)}
          onPress={() => void save()}
          testID="club-event-save"
        />
      }
      testID="club-event-edit-screen"
    >
      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.eventForm.sectionWhat')} />
        <ChipField
          label={t('clubMatch.eventForm.kind')}
          options={EVENT_KINDS.map((k) => ({ value: k, label: clubLabel(t, 'eventKind', k) }))}
          value={kind}
          onChange={setKind}
        />
        <Input
          label={t('clubMatch.eventForm.title')}
          placeholder={t('clubMatch.eventForm.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          required
          error={tried ? errors.title : null}
          testID="club-event-title"
        />
        <Input
          label={t('clubMatch.eventForm.description')}
          placeholder={t('clubMatch.eventForm.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
        />
        {page.data.sports.length > 0 ? (
          <ChipField
            label={t('clubMatch.eventForm.sport')}
            options={[
              { value: NO_SPORT, label: t('clubMatch.eventForm.anySport') },
              ...page.data.sports.map((s) => ({ value: s.sport, label: `${sportEmoji(s.sport)} ${sportLabel(t, s.sport)}` })),
            ]}
            value={sport}
            onChange={(v) => {
              setSport(v);
              setCategory('');
            }}
          />
        ) : null}
        {sport !== NO_SPORT ? (
          <View style={{ gap: spacing.sm }}>
            {categories.length > 0 ? (
              <ChipField
                label={t('clubMatch.fixture.category')}
                options={categories.map((c) => ({ value: c, label: clubLabel(t, 'category', c) }))}
                value={categories.includes(category) ? category : null}
                onChange={(v) => setCategory(category === v ? '' : v)}
              />
            ) : null}
            <Input
              label={categories.length > 0 ? undefined : t('clubMatch.fixture.category')}
              placeholder={t('clubMatch.fixture.categoryPlaceholder')}
              value={category}
              onChangeText={setCategory}
              maxLength={30}
              accessibilityLabel={t('clubMatch.fixture.category')}
            />
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.eventForm.sectionWhen')} />
        <WhenField
          label={t('clubMatch.eventForm.starts')}
          value={startsAt}
          onChange={setStartsAt}
          required
          error={tried ? errors.starts : null}
          testID="club-event-starts"
        />
        <WhenField
          label={t('clubMatch.eventForm.ends')}
          value={endsAt}
          onChange={setEndsAt}
          clearable
          error={errors.ends}
          testID="club-event-ends"
        />
        <Input
          label={t('clubMatch.eventForm.location')}
          placeholder={t('clubMatch.eventForm.locationPlaceholder')}
          value={location}
          onChangeText={setLocation}
          maxLength={200}
        />
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.eventForm.sectionWho')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            label={t('clubMatch.eventForm.ageMin')}
            value={ageMin}
            onChangeText={digits(setAgeMin, 2)}
            keyboardType="number-pad"
            maxLength={2}
            error={errors.ageMin}
            containerStyle={{ flex: 1 }}
          />
          <Input
            label={t('clubMatch.eventForm.ageMax')}
            value={ageMax}
            onChangeText={digits(setAgeMax, 2)}
            keyboardType="number-pad"
            maxLength={2}
            error={errors.ageMax}
            containerStyle={{ flex: 1 }}
          />
        </View>
        <Input
          label={t('clubMatch.eventForm.capacity')}
          placeholder={t('clubMatch.eventForm.capacityPlaceholder')}
          value={capacity}
          onChangeText={digits(setCapacity, 5)}
          keyboardType="number-pad"
          maxLength={5}
          error={errors.capacity}
        />
        <ListItem
          title={t('clubMatch.eventForm.registrationOpen')}
          subtitle={t('clubMatch.eventForm.registrationOpenHint')}
          right={
            <Switch value={open} onValueChange={setOpen} accessibilityLabel={t('clubMatch.eventForm.registrationOpen')} />
          }
        />
      </View>

      <View style={{ gap: spacing.lg }}>
        <SectionHeader title={t('clubMatch.eventForm.sectionPrice')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            label={t('clubMatch.eventForm.price')}
            placeholder={t('clubMatch.event.free')}
            value={price}
            onChangeText={digits(setPrice, 6)}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.price}
            containerStyle={{ flex: 2 }}
          />
          <Input
            label={t('clubMatch.eventForm.currency')}
            value={currency}
            onChangeText={(v) => setCurrency(v.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            error={errors.currency}
            containerStyle={{ flex: 1 }}
          />
        </View>
        <Text variant="caption" tone="muted">
          {t('clubMatch.eventForm.priceHint')}
        </Text>
      </View>
    </Screen>
  );
}
