import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, ImagePlus, Search, Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  Header,
  Input,
  Lightbox,
  ListItem,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import {
  getMyProfile,
  refreshMyTalentScore,
  updateAthleteProfile,
  updateUserProfile,
} from '@/lib/api';
import { syncFullName, uploadAvatar, uploadCover } from '@/lib/api.profile';
import {
  DOMINANT_SIDE,
  LEVELS,
  PRIORITY_COUNTRIES,
  SPORTS,
  levelHint,
  levelLabelI18n,
  positionLabel,
  positionsFor,
  sideLabel,
  sportLabel,
} from '@/constants/sports';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';

const BIO_MAX = 300;

interface FormState {
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  country: string;
  avatarUrl: string;
  coverUrl: string;
  sport: string;
  position: string;
  level: string;
  league: string;
  club: string;
  heightCm: string;
  weightKg: string;
  dominant: string;
  openToOffers: boolean;
}

/**
 * One form, four sections, one Save.
 *
 * Saving recomputes the Talent Score and names the change, because that
 * feedback loop is the reason anyone fills a profile in at all.
 */
export default function EditProfileScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { refreshProfile } = useAuth();

  const bundle = useAsync(() => getMyProfile(), []);

  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [sportSheet, setSportSheet] = useState(false);
  const [countrySheet, setCountrySheet] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  // Seed the form once, the first time the bundle lands.
  useEffect(() => {
    if (!bundle.data || form) return;
    const { user, athlete } = bundle.data;
    const seed: FormState = {
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      bio: user.bio ?? '',
      city: user.city ?? '',
      country: user.country ?? '',
      avatarUrl: user.avatar_url ?? '',
      coverUrl: user.cover_url ?? '',
      sport: athlete?.sport ?? '',
      position: athlete?.position ?? '',
      level: athlete?.level ?? '',
      league: athlete?.league ?? '',
      club: athlete?.club ?? '',
      heightCm: athlete?.height_cm != null ? String(athlete.height_cm) : '',
      weightKg: athlete?.weight_kg != null ? String(athlete.weight_kg) : '',
      dominant: athlete?.dominant_foot ?? '',
      openToOffers: athlete?.is_open_to_offers ?? true,
    };
    setForm(seed);
    setInitial(seed);
  }, [bundle.data, form]);

  const dirty = useMemo(
    () => !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  /**
   * One picker for both pictures.
   *
   * The only differences are the crop ratio, the upload function and which
   * field the URL lands in — writing it twice was how the cover ended up with
   * no picker at all, so it is written once.
   */
  const pickImage = useCallback(
    async (kind: 'avatar' | 'cover') => {
      const isAvatar = kind === 'avatar';
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          toast.error(t('profile.photoPermission'));
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          /* A cover is a landscape band behind the avatar; cropping it square
             and letting the header cut it is how you lose someone's head. */
          aspect: isAvatar ? [1, 1] : [16, 9],
          quality: 0.85,
        });
        if (result.canceled || result.assets.length === 0) return;

        const asset = result.assets[0];
        const type = asset.mimeType ?? 'image/jpeg';
        if (isAvatar) {
          setUploadingAvatar(true);
          set('avatarUrl', await uploadAvatar(asset.uri, type));
        } else {
          setUploadingCover(true);
          set('coverUrl', await uploadCover(asset.uri, type));
        }
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setUploadingAvatar(false);
        setUploadingCover(false);
      }
    },
    [set, t, toast],
  );

  const onSave = useCallback(async () => {
    if (!form || !bundle.data) return;
    if (!form.firstName.trim()) {
      toast.error(t('profile.firstNameRequired'));
      return;
    }

    setSaving(true);
    const previous = bundle.data.score?.overall ?? null;

    try {
      await updateUserProfile({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim() || null,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        avatar_url: form.avatarUrl || null,
        cover_url: form.coverUrl || null,
      });
      await syncFullName(form.firstName, form.lastName);

      if (bundle.data.athlete) {
        await updateAthleteProfile({
          sport: form.sport || null,
          // Both columns are written so `coalesce(position_primary, position)`
          // in get_profile_bundle can never disagree with what was picked.
          position_primary: form.position || null,
          position: form.position || null,
          level: form.level || null,
          league: form.league.trim() || null,
          current_club: form.club.trim() || null,
          height_cm: toNumber(form.heightCm),
          weight_kg: toNumber(form.weightKg),
          dominant_foot: form.dominant || null,
          // The score reads athlete_profiles.bio, the profile shows
          // user_profiles.bio — one field in the UI, written to both.
          bio: form.bio.trim() || null,
          is_open_to_offers: form.openToOffers,
        });
      }

      await refreshProfile();

      let message = t('common.saved');
      try {
        const next = await refreshMyTalentScore();
        if (next && previous != null) {
          const delta = next.overall - previous;
          if (delta !== 0) {
            message = t(delta > 0 ? 'profile.savedScoreUp' : 'profile.savedScoreDown', {
              count: Math.abs(delta),
            });
          }
        }
      } catch {
        /* No athlete profile, or the score is busy recomputing. The save stands. */
      }

      toast.success(message);
      setInitial(form);
      if (router.canGoBack()) router.back();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [bundle.data, form, refreshProfile, router, t, toast]);

  const countries = useMemo(() => {
    const term = countryQuery.trim().toLowerCase();
    const all = [...PRIORITY_COUNTRIES].sort((a, b) => a.localeCompare(b));
    return term ? all.filter((country) => country.toLowerCase().includes(term)) : all;
  }, [countryQuery]);

  /** A typed country that is not in the pinned list is still a real country. */
  const customCountry = useMemo(() => {
    const typed = countryQuery.trim();
    if (typed.length < 2) return null;
    const exists = PRIORITY_COUNTRIES.some(
      (country) => country.toLowerCase() === typed.toLowerCase(),
    );
    return exists ? null : typed;
  }, [countryQuery]);

  const header = (
    <Header
      back
      title={t('profile.editProfile')}
      right={
        <Button
          label={t('common.save')}
          size="sm"
          hitSlop={10}
          disabled={!dirty || saving}
          loading={saving}
          onPress={onSave}
        />
      }
    />
  );

  if (bundle.error && !bundle.data) {
    return (
      <Screen header={header}>
        <ErrorState message={bundle.error} onRetry={bundle.reload} />
      </Screen>
    );
  }
  if (!form) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  const hasAthlete = !!bundle.data?.athlete;
  const positions = positionsFor(form.sport);
  const selectedSport = SPORTS.find((sport) => sport.key === form.sport);

  return (
    <Screen header={header} keyboardAvoiding contentStyle={{ gap: spacing.xxl }}>
      {/* ── You ── */}
      <View style={{ marginTop: spacing.md }}>
        <SectionHeader title={t('profile.sectionYou')} />

        {/*
          Both pictures, in the arrangement they appear in on the profile, so
          what you are editing looks like what you will get. The wallpaper had
          no editor at all before this — the column existed, the header used it,
          and nothing in the app could set it.
        */}
        <Pressable
          onPress={() => pickImage('cover')}
          disabled={uploadingCover}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changeCoverA11y')}
          accessibilityState={{ busy: uploadingCover }}
          testID="edit-cover"
          style={({ pressed }) => ({
            height: 132,
            borderRadius: theme.radii.lg,
            overflow: 'hidden',
            opacity: pressed || uploadingCover ? 0.75 : 1,
            borderWidth: 1,
            borderColor: colors.border,
          })}
        >
          {form.coverUrl ? (
            <Image
              source={{ uri: form.coverUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <AnimatedGradient
              colors={theme.gradients.hero}
              period={12}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(6,5,14,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              /* The avatar overlaps the bottom of this band, so the label sits
                 above where it lands rather than behind it. */
              paddingBottom: spacing.xxl,
            }}
          >
            <View>
              <ImagePlus size={22} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text variant="captionStrong" color="#FFFFFF">
              {t(
                uploadingCover
                  ? 'profile.uploadingCover'
                  : form.coverUrl
                    ? 'profile.changeCover'
                    : 'profile.addCover',
              )}
            </Text>
          </View>
        </Pressable>

        {form.coverUrl ? (
          <Pressable
            onPress={() => set('coverUrl', '')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.removeCover')}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-end',
              gap: spacing.xs,
              minHeight: 40,
              paddingHorizontal: spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Trash2 size={14} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {t('profile.removeCover')}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: -44, marginBottom: spacing.lg }}>
          <View style={{ borderRadius: 999, padding: 3, backgroundColor: colors.bg }}>
            <Pressable
              onPress={() => pickImage('avatar')}
              onLongPress={form.avatarUrl ? () => setPhotoOpen(true) : undefined}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel={t('profile.changePhotoA11y')}
              accessibilityState={{ busy: uploadingAvatar }}
              testID="edit-avatar"
              style={({ pressed }) => ({ opacity: pressed || uploadingAvatar ? 0.7 : 1 })}
            >
              <Avatar
                uri={form.avatarUrl || null}
                /* Both names: the initials here have to match the ones the feed
                   and the profile draw, or the same person appears twice under
                   two different monograms and two different colours. */
                name={`${form.firstName} ${form.lastName}`.trim() || form.firstName}
                size="xl"
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.bg,
                }}
              >
                <Camera size={16} color={colors.textOnBrand} />
              </View>
            </Pressable>
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            {t(uploadingAvatar ? 'profile.uploadingPhoto' : 'profile.tapToChangePhoto')}
          </Text>
        </View>

        <Lightbox
          visible={photoOpen}
          uri={form.avatarUrl || null}
          caption={`${form.firstName} ${form.lastName}`.trim() || null}
          onClose={() => setPhotoOpen(false)}
        />

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Input
              containerStyle={{ flex: 1 }}
              label={t('profile.firstName')}
              required
              value={form.firstName}
              onChangeText={(text) => set('firstName', text)}
              maxLength={60}
              autoCapitalize="words"
            />
            <Input
              containerStyle={{ flex: 1 }}
              label={t('profile.lastName')}
              value={form.lastName}
              onChangeText={(text) => set('lastName', text)}
              maxLength={60}
              autoCapitalize="words"
            />
          </View>

          <Input
            label={t('profile.bio')}
            placeholder={t('profile.bioPlaceholder')}
            value={form.bio}
            onChangeText={(text) => set('bio', text.slice(0, BIO_MAX))}
            multiline
            maxLength={BIO_MAX}
            hint={t('profile.bioCounter', { n: form.bio.length, max: BIO_MAX })}
          />

          <Input
            label={t('profile.city')}
            placeholder={t('profile.cityPlaceholder')}
            value={form.city}
            onChangeText={(text) => set('city', text)}
            maxLength={80}
            autoCapitalize="words"
          />

          <Pressable
            onPress={() => setCountrySheet(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.countryA11y', {
              value: form.country || t('profile.notSet'),
            })}
          >
            {/* Country names are stored as typed, so they are not translated. */}
            <Input
              label={t('profile.country')}
              placeholder={t('profile.countryPlaceholder')}
              value={form.country}
              editable={false}
              pointerEvents="none"
            />
          </Pressable>
        </View>
      </View>

      {hasAthlete ? (
        <>
          {/* ── Your sport ── */}
          <View>
            <SectionHeader title={t('profile.sectionSport')} />
            <View style={{ gap: spacing.md }}>
              <Pressable
                onPress={() => setSportSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.sportA11y', {
                  value: form.sport ? sportLabel(t, form.sport) : t('profile.notSet'),
                })}
              >
                <Input
                  label={t('profile.sport')}
                  placeholder={t('profile.sportPlaceholder')}
                  value={
                    selectedSport
                      ? t('profile.sportWithEmoji', {
                          emoji: selectedSport.emoji,
                          name: sportLabel(t, selectedSport.key),
                        })
                      : form.sport
                  }
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>

              {positions.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="captionStrong" tone="secondary">
                    {t('profile.position')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {positions.map((position) => (
                      <Chip
                        key={position}
                        /* The English value is what is stored; only the chip is translated. */
                        label={positionLabel(t, position)}
                        selected={form.position === position}
                        onPress={() =>
                          set('position', form.position === position ? '' : position)
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <Text variant="captionStrong" tone="secondary">
                  {t('profile.level')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {LEVELS.map((level) => (
                    <Chip
                      key={level.key}
                      label={levelLabelI18n(t, level.key)}
                      selected={form.level === level.key}
                      onPress={() => set('level', level.key)}
                    />
                  ))}
                </View>
                <Text variant="caption" tone="muted">
                  {levelHint(t, form.level) || t('profile.levelHintDefault')}
                </Text>
              </View>

              <Input
                label={t('profile.league')}
                placeholder={t('profile.leaguePlaceholder')}
                value={form.league}
                onChangeText={(text) => set('league', text)}
                maxLength={120}
              />

              <Input
                label={t('profile.club')}
                placeholder={t('profile.clubPlaceholder')}
                value={form.club}
                onChangeText={(text) => set('club', text)}
                maxLength={120}
                hint={t('profile.clubHint')}
              />
            </View>
          </View>

          {/* ── Physical ── */}
          <View>
            <SectionHeader title={t('profile.sectionPhysical')} />
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {/* Both placeholders are bare numerals — nothing to translate. */}
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('profile.height')}
                  placeholder="176"
                  keyboardType="number-pad"
                  value={form.heightCm}
                  onChangeText={(text) => set('heightCm', text)}
                  maxLength={3}
                  hint={t('profile.heightUnit')}
                />
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('profile.weight')}
                  placeholder="68"
                  keyboardType="number-pad"
                  value={form.weightKg}
                  onChangeText={(text) => set('weightKg', text)}
                  maxLength={3}
                  hint={t('profile.weightUnit')}
                />
              </View>

              <View style={{ gap: spacing.sm }}>
                <Text variant="captionStrong" tone="secondary">
                  {t('profile.dominantSide')}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {DOMINANT_SIDE.map((side) => (
                    <Chip
                      key={side}
                      label={sideLabel(t, side)}
                      selected={form.dominant === side}
                      onPress={() => set('dominant', form.dominant === side ? '' : side)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ── Availability ── */}
          <View>
            <SectionHeader title={t('profile.sectionAvailability')} />
            <Card padded>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{t('profile.openToOffers')}</Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {t('profile.openToOffersHint')}
                  </Text>
                </View>
                <Switch
                  value={form.openToOffers}
                  onValueChange={(value) => set('openToOffers', value)}
                  accessibilityLabel={t('profile.openToOffers')}
                />
              </View>
            </Card>
          </View>
        </>
      ) : null}

      {/* ── Sport picker ── */}
      <Sheet
        visible={sportSheet}
        onClose={() => setSportSheet(false)}
        title={t('profile.chooseSportTitle')}
      >
        {SPORTS.map((sport, index) => (
          <View key={sport.key}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={t('profile.sportWithEmoji', {
                emoji: sport.emoji,
                name: sportLabel(t, sport.key),
              })}
              right={
                form.sport === sport.key ? <Check size={20} color={colors.primary} /> : undefined
              }
              onPress={() => {
                // Positions are sport-specific, so a sport change clears the old one.
                if (sport.key !== form.sport) {
                  setForm((current) =>
                    current ? { ...current, sport: sport.key, position: '' } : current,
                  );
                }
                setSportSheet(false);
              }}
            />
          </View>
        ))}
      </Sheet>

      {/* ── Country picker ── */}
      <Sheet
        visible={countrySheet}
        onClose={() => setCountrySheet(false)}
        title={t('profile.countrySheetTitle')}
      >
        <Input
          placeholder={t('profile.searchCountries')}
          value={countryQuery}
          onChangeText={setCountryQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          autoCorrect={false}
          accessibilityLabel={t('profile.searchCountries')}
          containerStyle={{ marginBottom: spacing.md }}
        />
        {/* The country name is what gets stored, so the row shows it as stored. */}
        {countries.map((country, index) => (
          <View key={country}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={country}
              right={
                form.country === country ? <Check size={20} color={colors.primary} /> : undefined
              }
              onPress={() => {
                set('country', country);
                setCountryQuery('');
                setCountrySheet(false);
              }}
            />
          </View>
        ))}
        {/* The pinned list covers our launch markets; anywhere else is typed in
            rather than left unreachable. */}
        {customCountry ? (
          <View>
            {countries.length > 0 ? <Divider /> : null}
            <ListItem
              title={t('profile.useTypedCountry', { country: customCountry })}
              subtitle={t('profile.useTypedCountryHint')}
              onPress={() => {
                set('country', customCountry);
                setCountryQuery('');
                setCountrySheet(false);
              }}
            />
          </View>
        ) : null}

        {countries.length === 0 && !customCountry ? (
          <Text variant="caption" tone="muted" align="center" style={{ paddingVertical: spacing.xl }}>
            {t('profile.countryTypeToAdd')}
          </Text>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
