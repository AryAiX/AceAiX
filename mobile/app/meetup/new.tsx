import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Minus, Plus, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  Divider,
  Header,
  Input,
  ListItem,
  Screen,
  SectionHeader,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { PRIORITY_COUNTRIES, SPORTS, sportLabel } from '@/constants/sports';
import { createMeetup, type MeetupLevel } from '@/lib/api.meetups';

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

  const [sport, setSport] = useState('');
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [venue, setVenue] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [spots, setSpots] = useState(2);
  const [level, setLevel] = useState<MeetupLevel>('any');
  const [note, setNote] = useState('');
  const [cost, setCost] = useState('');

  const [sportSheet, setSportSheet] = useState(false);
  const [countrySheet, setCountrySheet] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [whenSheet, setWhenSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => nextDays(), []);

  const startsAt = useMemo(() => {
    if (!day || hour == null) return null;
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    return d;
  }, [day, hour]);

  const ready =
    sport !== '' &&
    title.trim().length >= 4 &&
    country.trim() !== '' &&
    city.trim() !== '' &&
    startsAt !== null;

  const countries = useMemo(() => {
    const term = countryQuery.trim().toLowerCase();
    const all = [...PRIORITY_COUNTRIES].sort((a, b) => a.localeCompare(b));
    return term ? all.filter((c) => c.toLowerCase().includes(term)) : all;
  }, [countryQuery]);

  const onPost = useCallback(async () => {
    if (!ready || !startsAt) return;
    setSaving(true);
    try {
      const id = await createMeetup({
        sport,
        title: title.trim(),
        country: country.trim(),
        city: city.trim(),
        startsAt: startsAt.toISOString(),
        spotsTotal: spots,
        area: area.trim() || null,
        venue: venue.trim() || null,
        level,
        note: note.trim() || null,
        costNote: cost.trim() || null,
      });
      toast.success(t('meetups.posted'));
      router.replace(Routes.meetup(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [
    area, city, cost, country, level, note, ready, router, spots, sport,
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

  return (
    <Screen
      header={
        <Header
          back
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
          <Input
            label={t('meetups.fieldCity')}
            value={city}
            onChangeText={setCity}
            maxLength={80}
            autoCapitalize="words"
            required
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
          <Input
            label={t('meetups.fieldCost')}
            placeholder={t('meetups.fieldCostPlaceholder')}
            value={cost}
            onChangeText={setCost}
            maxLength={80}
          />
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
              title={c}
              right={country === c ? <Check size={20} color={colors.primary} /> : undefined}
              onPress={() => {
                setCountry(c);
                setCountryQuery('');
                setCountrySheet(false);
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
