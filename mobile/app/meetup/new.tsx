import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Check, Minus, Plus, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  ConfirmSheet,
  Divider,
  EmptyState,
  Header,
  Input,
  ListItem,
  Screen,
  SectionHeader,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { CityPicker, cityFromPicker } from '@/components/onboarding/CityPicker';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { getMyProfile } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { SPORTS, countryLabel, countryOptions, sportLabel } from '@/constants/sports';
import { createMeetup, setMeetupMapUrl, type MeetupLevel } from '@/lib/api.meetups';
import { isAllowedMapUrl } from '@/lib/mapLinks';
import { COST_CURRENCIES, currencyForCountry, toCostNote } from '@/lib/meetupCost';

/**
 * Posting a game.
 *
 * The form is ordered the way somebody says it out loud — what, where, when,
 * how many — and only four of those are required. A hitting partner in Marbella
 * and a fifteen-a-side in Al Jadaf are the same form; the number of spots is
 * the only thing that distinguishes them, so it gets a stepper rather than a
 * text field and starts at 2.
 *
 * The date is entered as a day and an hour rather than through a native picker,
 * because `@react-native-community/datetimepicker` is not in this project and
 * adding a native module for one screen would cost Expo Go compatibility — the
 * thing that lets anybody on the team open this app on their own phone.
 *
 * City is the same picker as onboarding. The country sheet still stores the
 * English country name that picker searches with. A name that is not in the
 * list is saved as typed; this screen does not add it to the city catalogue.
 */

const LEVELS: MeetupLevel[] = ['any', 'beginner', 'intermediate', 'advanced', 'competitive'];

/** The next fourteen days, which is when casual games actually get arranged. */
function nextDays(count = 14): Date[] {
  const out: Date[] = [];
  const start = new Date();
  start.setMinutes(0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 → 22:00

export default function NewMeetupScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const canMeet = profile?.is_minor === false;
  // Same read as Edit profile: city and country live on the profile bundle,
  // not on the signed-in account. Minors never reach the form.
  const hostPlace = useAsync(() => getMyProfile(), [canMeet], { enabled: canMeet });

  const [sport, setSport] = useState('');
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [area, setArea] = useState('');
  const [venue, setVenue] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [spots, setSpots] = useState(2);
  const [level, setLevel] = useState<MeetupLevel>('any');
  const [note, setNote] = useState('');
  /** Null until the host picks. Tapping the selected chip clears it again. */
  const [costKind, setCostKind] = useState<'free' | 'paid' | null>(null);
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [currencySheet, setCurrencySheet] = useState(false);

  const [sportSheet, setSportSheet] = useState(false);
  const [countrySheet, setCountrySheet] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [whenSheet, setWhenSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  /** A host who already picked a place must not be overwritten by a late profile. */
  const placeTouched = useRef(false);
  const placeSeeded = useRef(false);
  /** Profile values the form opened with. Those are not unsaved edits. */
  const [seededPlace, setSeededPlace] = useState<{ country: string; city: string } | null>(null);

  const placeDirty =
    country !== (seededPlace?.country ?? '') ||
    city !== (seededPlace?.city ?? '') ||
    cityQuery.trim() !== '';

  const hasContent =
    sport !== '' ||
    title.trim().length > 0 ||
    placeDirty ||
    area.trim().length > 0 ||
    venue.trim().length > 0 ||
    mapLink.trim().length > 0 ||
    day !== null ||
    hour !== null ||
    spots !== 2 ||
    level !== 'any' ||
    note.trim().length > 0 ||
    costKind !== null;

  useEffect(() => {
    if (!canMeet || placeSeeded.current) return;
    if (hostPlace.loading || (!hostPlace.data && !hostPlace.error)) return;
    placeSeeded.current = true;
    if (placeTouched.current || !hostPlace.data) {
      setSeededPlace({ country: '', city: '' });
      return;
    }
    const profileCountry = hostPlace.data.user.country?.trim() ?? '';
    // A city with no country cannot be searched, so it is not offered.
    const profileCity = profileCountry ? (hostPlace.data.user.city?.trim() ?? '') : '';
    setCountry((current) => (current.trim() ? current : profileCountry));
    setCity((current) => (current.trim() ? current : profileCity));
    setSeededPlace({ country: profileCountry, city: profileCity });
  }, [canMeet, hostPlace.data, hostPlace.error, hostPlace.loading]);

  /* A currency the host has not chosen follows the country. USD until then. */
  useEffect(() => {
    if (currencyTouched) return;
    setCostCurrency(currencyForCountry(country));
  }, [country, currencyTouched]);

  const chooseCountry = useCallback((next: string) => {
    placeTouched.current = true;
    if (next !== country) {
      setCity('');
      setCityQuery('');
    }
    setCountry(next);
    setCountryQuery('');
    setCountrySheet(false);
  }, [country]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (hasContent) setDiscardOpen(true);
    else close();
  }, [saving, hasContent, close]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (hasContent) {
        setDiscardOpen(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasContent, saving]);

  const days = useMemo(() => nextDays(), []);

  const startsAt = useMemo(() => {
    if (!day || hour == null) return null;
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    return d;
  }, [day, hour]);

  const mapLinkTrimmed = mapLink.trim();
  const mapLinkInvalid = mapLinkTrimmed.length > 0 && !isAllowedMapUrl(mapLinkTrimmed);

  /* A tapped chip, or two or more characters still in the box. The meetup
     column accepts at most 80, which is also as long as the picker will offer
     a name that is not in the list. */
  const resolvedCity = cityFromPicker(city, cityQuery).trim().slice(0, 80);

  const costNote = toCostNote(
    costKind === 'free'
      ? { kind: 'free' }
      : costKind === 'paid'
        ? { kind: 'paid', amount: costAmount, currency: costCurrency }
        : null,
  );
  const costInvalid = costKind === 'paid' && costNote == null;

  const ready =
    sport !== '' &&
    title.trim().length >= 4 &&
    country.trim() !== '' &&
    resolvedCity !== '' &&
    startsAt !== null &&
    !mapLinkInvalid &&
    !costInvalid;

  const countries = useMemo(
    () => countryOptions(countryQuery, (c) => countryLabel(t, c)),
    [countryQuery, t],
  );

  const onPost = useCallback(async () => {
    if (!ready || !startsAt) return;
    setSaving(true);
    try {
      const id = await createMeetup({
        sport,
        title: title.trim(),
        country: country.trim(),
        city: resolvedCity,
        startsAt: startsAt.toISOString(),
        spotsTotal: spots,
        area: area.trim() || null,
        venue: venue.trim() || null,
        level,
        note: note.trim() || null,
        costNote,
      });
      let linkSaved = true;
      if (mapLinkTrimmed) {
        try {
          await setMeetupMapUrl(id, mapLinkTrimmed);
        } catch (linkErr) {
          linkSaved = false;
          toast.error(errorMessage(linkErr));
        }
      }
      if (linkSaved) toast.success(t('meetups.posted'));
      router.replace(Routes.meetup(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [
    area, costNote, country, level, mapLinkTrimmed, note, ready, resolvedCity, router, spots, sport,
    startsAt, t, title, toast, venue,
  ]);

  const whenLabel = startsAt
    ? startsAt.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  if (!canMeet) {
    return (
      <Screen header={<Header title={t('meetups.createTitle')} back />}>
        <EmptyState
          title={t('meetups.adultsOnlyTitle')}
          body={t('meetups.adultsOnlyBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <Header
          back
          onBack={requestClose}
          title={t('meetups.createTitle')}
          right={
            <Button
              label={t('meetups.post')}
              size="sm"
              disabled={!ready || saving}
              loading={saving}
              onPress={onPost}
            />
          }
        />
      }
      keyboardAvoiding
      contentStyle={{ gap: spacing.xl }}
      testID="new-meetup-screen"
    >
      <Stack.Screen options={{ gestureEnabled: !hasContent }} />
      <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
        {t('meetups.createSubtitle')}
      </Text>

      {/* ── What ── */}
      <View>
        <SectionHeader title={t('meetups.fieldSport')} />
        <View style={{ gap: spacing.md }}>
          <Pressable onPress={() => setSportSheet(true)} accessibilityRole="button">
            <Input
              label={t('meetups.fieldSport')}
              value={sport ? sportLabel(t, sport) : ''}
              placeholder={t('meetups.anySport')}
              editable={false}
              pointerEvents="none"
            />
          </Pressable>

          <Input
            label={t('meetups.fieldTitle')}
            placeholder={t('meetups.fieldTitlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            maxLength={90}
            required
          />
        </View>
      </View>

      {/* ── Where ── */}
      <View>
        <SectionHeader title={t('meetups.fieldCity')} />
        <View style={{ gap: spacing.md }}>
          <Pressable onPress={() => setCountrySheet(true)} accessibilityRole="button">
            <Input
              label={t('meetups.fieldCountry')}
              value={country}
              editable={false}
              pointerEvents="none"
              required
            />
          </Pressable>
          <CityPicker
            country={country.trim() ? country : null}
            value={city}
            query={cityQuery}
            onQueryChange={setCityQuery}
            onChange={(next) => {
              placeTouched.current = true;
              setCity(next);
            }}
            label={t('meetups.fieldCity')}
            testID="meetup-city"
          />
          <Input
            label={t('meetups.fieldArea')}
            placeholder={t('meetups.fieldAreaPlaceholder')}
            value={area}
            onChangeText={setArea}
            maxLength={80}
          />
          <Input
            label={t('meetups.fieldVenue')}
            placeholder={t('meetups.fieldVenuePlaceholder')}
            value={venue}
            onChangeText={setVenue}
            maxLength={120}
          />
          <Input
            label={t('meetups.fieldMapLink')}
            placeholder={t('meetups.fieldMapLinkPlaceholder')}
            hint={t('meetups.fieldMapLinkHint')}
            error={mapLinkInvalid ? t('errors.meetupMapUrlInvalid') : null}
            value={mapLink}
            onChangeText={setMapLink}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={500}
            testID="meetup-map-link"
          />
        </View>
      </View>

      {/* ── When ── */}
      <View>
        <SectionHeader title={t('meetups.fieldWhen')} />
        <Pressable onPress={() => setWhenSheet(true)} accessibilityRole="button">
          <Input
            label={t('meetups.fieldWhen')}
            value={whenLabel}
            editable={false}
            pointerEvents="none"
            required
          />
        </Pressable>
      </View>

      {/* ── How many ── */}
      <View>
        <SectionHeader title={t('meetups.fieldSpots')} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.lg,
          }}
        >
          <Stepper
            value={spots}
            min={2}
            max={60}
            onChange={setSpots}
            label={t('meetups.fieldSpots')}
          />
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {t('meetups.fieldSpotsHint')}
        </Text>
      </View>

      {/* ── Level, note, cost ── */}
      <View>
        <SectionHeader title={t('meetups.fieldLevel')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {LEVELS.map((l) => (
            <Chip
              key={l}
              label={t(`meetups.level${l.charAt(0).toUpperCase()}${l.slice(1)}`)}
              selected={level === l}
              onPress={() => setLevel(l)}
            />
          ))}
        </View>

        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Input
            label={t('meetups.fieldNote')}
            placeholder={t('meetups.fieldNotePlaceholder')}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
          />
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('meetups.fieldCost')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip
                label={t('meetups.costFree')}
                selected={costKind === 'free'}
                onPress={() => setCostKind((current) => (current === 'free' ? null : 'free'))}
                testID="meetup-cost-free"
              />
              <Chip
                label={t('meetups.costPaid')}
                selected={costKind === 'paid'}
                onPress={() => setCostKind((current) => (current === 'paid' ? null : 'paid'))}
                testID="meetup-cost-paid"
              />
            </View>
            {costKind === 'paid' ? (
              /* Currency first, then the amount: in Arabic the row mirrors, so
                 the code still sits in front of the number. */
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <Pressable
                  onPress={() => setCurrencySheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('meetups.costCurrency')}
                  style={{ width: 132 }}
                >
                  <Input
                    label={t('meetups.costCurrency')}
                    value={costCurrency}
                    editable={false}
                    pointerEvents="none"
                    testID="meetup-cost-currency"
                  />
                </Pressable>
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('meetups.costAmount')}
                  value={costAmount}
                  onChangeText={(text) => setCostAmount(text.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  error={costInvalid ? t('meetups.costAmountInvalid') : null}
                  testID="meetup-cost-amount"
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Pickers ── */}
      <Sheet visible={sportSheet} onClose={() => setSportSheet(false)} title={t('meetups.fieldSport')}>
        {SPORTS.map((s, index) => (
          <View key={s.key}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={`${s.emoji}  ${sportLabel(t, s.key)}`}
              right={sport === s.key ? <Check size={20} color={colors.primary} /> : undefined}
              onPress={() => {
                setSport(s.key);
                setSportSheet(false);
              }}
            />
          </View>
        ))}
      </Sheet>

      <Sheet
        visible={countrySheet}
        onClose={() => setCountrySheet(false)}
        title={t('meetups.fieldCountry')}
      >
        <Input
          placeholder={t('meetups.fieldCountry')}
          value={countryQuery}
          onChangeText={setCountryQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          autoCorrect={false}
          containerStyle={{ marginBottom: spacing.md }}
        />
        {countries.map((c, index) => (
          <View key={c}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={countryLabel(t, c)}
              right={country === c ? <Check size={20} color={colors.primary} /> : undefined}
              onPress={() => chooseCountry(c)}
            />
          </View>
        ))}
      </Sheet>

      <Sheet
        visible={currencySheet}
        onClose={() => setCurrencySheet(false)}
        title={t('meetups.costCurrency')}
      >
        {COST_CURRENCIES.map((code, index) => (
          <View key={code}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={`\u2066${code}\u2069`}
              right={costCurrency === code ? <Check size={20} color={colors.primary} /> : undefined}
              onPress={() => {
                setCurrencyTouched(true);
                setCostCurrency(code);
                setCurrencySheet(false);
              }}
            />
          </View>
        ))}
      </Sheet>

      <Sheet visible={whenSheet} onClose={() => setWhenSheet(false)} title={t('meetups.fieldWhen')}>
        <Text variant="captionStrong" tone="secondary">
          {t('meetups.fieldWhen')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
          {days.map((d) => (
            <Chip
              key={d.toISOString()}
              label={d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              selected={day?.toDateString() === d.toDateString()}
              onPress={() => setDay(d)}
            />
          ))}
        </View>

        <Text variant="captionStrong" tone="secondary" style={{ marginTop: spacing.xl }}>
          {t('meetups.fieldWhen')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
          {HOURS.map((h) => (
            <Chip
              key={h}
              label={`${String(h).padStart(2, '0')}:00`}
              selected={hour === h}
              onPress={() => setHour(h)}
            />
          ))}
        </View>

        <Button
          label={t('common.done')}
          fullWidth
          disabled={!day || hour == null}
          style={{ marginTop: spacing.xl }}
          onPress={() => setWhenSheet(false)}
        />
      </Sheet>

      <ConfirmSheet
        visible={discardOpen}
        title={t('meetups.discardTitle')}
        message={t('meetups.discardBody')}
        confirmLabel={t('feed.discard')}
        cancelLabel={t('settings.keepEditing')}
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          close();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </Screen>
  );
}

/** Plus and minus, because typing a number for this is nobody's idea of fun. */
function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const button = (delta: number, icon: React.ReactNode, a11y: string) => (
    <Pressable
      onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      disabled={delta < 0 ? value <= min : value >= max}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: (delta < 0 ? value <= min : value >= max) ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      {icon}
    </Pressable>
  );

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}
      accessibilityLabel={`${label}: ${value}`}
    >
      {button(-1, <Minus size={20} color={colors.text} />, `${label} −`)}
      <Text variant="display" style={{ minWidth: 64, textAlign: 'center' }}>
        {value}
      </Text>
      {button(1, <Plus size={20} color={colors.text} />, `${label} +`)}
    </View>
  );
}
