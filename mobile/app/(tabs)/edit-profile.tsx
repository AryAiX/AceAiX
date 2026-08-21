import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save, UserRound } from 'lucide-react-native';
import SPORTS_CONFIG, { normalizeSportKey } from '@/constants/sportsConfig';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Country, City } from 'country-state-city';
import { POSITIONS_BY_SPORT } from '@/constants/positions';
import { LEVEL_OPTIONS } from '@/constants/levels';

type ProfileForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  bio: string;
  sportKey: string;
  sportOther: string;
  position: string;
  currentClub: string;
  level: string;
  league: string;
  nationality: string;
  countryIsoCode: string;
  city: string;
  phone: string;
  birthdate: string;
};

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  bio: '',
  sportKey: '',
  sportOther: '',
  position: '',
  currentClub: '',
  level: '',
  league: '',
  nationality: '',
  countryIsoCode: '',
  city: '',
  phone: '',
  birthdate: '',
};

const ALL_COUNTRIES = Country.getAllCountries()
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

type LegacyProfileNames = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
};

function legacyName(source: unknown, key: keyof LegacyProfileNames): string {
  const record = source as LegacyProfileNames | null | undefined;
  return record?.[key] ?? '';
}

function optional(value: string): string | null {
  return value.trim() || null;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numbers-and-punctuation';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[s.input, multiline && s.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={multiline}
      />
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const normalizedSport = normalizeSportKey(profile?.sport);
    const isKnownSport = normalizedSport
      ? Object.prototype.hasOwnProperty.call(SPORTS_CONFIG, normalizedSport)
      : false;

    let firstName = legacyName(profile, 'first_name');
    let middleName = legacyName(profile, 'middle_name');
    let lastName = legacyName(profile, 'last_name');
    if (!firstName && profile?.full_name) {
      const parts = profile.full_name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length > 1) {
        firstName = parts[0];
        lastName = parts[parts.length - 1];
        middleName = parts.slice(1, -1).join(' ');
      }
    }

    const matchedCountry = profile?.country
      ? ALL_COUNTRIES.find((c) => c.name === profile.country)
      : undefined;

    setForm({
      firstName,
      middleName,
      lastName,
      bio: profile?.bio ?? '',
      sportKey: isKnownSport ? normalizedSport! : (profile?.sport ? 'other' : ''),
      sportOther: isKnownSport ? '' : (profile?.sport ?? ''),
      position: profile?.position ?? '',
      currentClub: profile?.current_club ?? '',
      level: profile?.league ?? 'amateur',
      league: profile?.league ?? '',
      nationality: profile?.nationality ?? '',
      countryIsoCode: matchedCountry?.isoCode ?? '',
      city: profile?.hometown ?? '',
      phone: profile?.phone ?? '',
      birthdate: profile?.birthdate ?? '',
    });
  }, [
    profile?.bio,
    profile?.birthdate,
    profile?.current_club,
    profile?.country,
    profile?.full_name,
    legacyName(profile, 'first_name'),
    legacyName(profile, 'middle_name'),
    legacyName(profile, 'last_name'),
    profile?.hometown,
    profile?.id,
    profile?.league,
    profile?.nationality,
    profile?.phone,
    profile?.position,
    profile?.sport,
  ]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function updateAvatar() {
    if (!user || avatarUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const extension = asset.mimeType === 'image/png'
        ? 'png'
        : asset.mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
      const contentType = asset.mimeType ?? 'image/jpeg';
      const path = `${user.id}/avatar.${extension}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { data: oldFiles } = await supabase.storage.from('avatars').list(user.id);
      const stalePaths = (oldFiles ?? [])
        .filter((file) => file.id && file.name !== `avatar.${extension}`)
        .map((file) => `${user.id}/${file.name}`);
      if (stalePaths.length > 0) await supabase.storage.from('avatars').remove(stalePaths);

      await refreshProfile();
    } catch (error) {
      Alert.alert('Profile photo not updated', error instanceof Error ? error.message : String(error));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (!user || saving) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Name required', 'Enter your first and last name before saving.');
      return;
    }
    const finalSport = form.sportKey === 'other' ? form.sportOther.trim() : form.sportKey;
    const countryName = form.countryIsoCode
      ? ALL_COUNTRIES.find((c) => c.isoCode === form.countryIsoCode)?.name ?? ''
      : '';

    setSaving(true);
    const { error } = await supabase.rpc('update_own_profile', {
      p_first_name: form.firstName.trim(),
      p_middle_name: optional(form.middleName),
      p_last_name: form.lastName.trim(),
      p_bio: optional(form.bio),
      p_city: optional(form.city),
      p_country: optional(countryName),
      p_sport: optional(finalSport),
      p_position: optional(form.position),
      p_current_club: optional(form.currentClub),
      p_level: optional(form.level),
      p_league: optional(form.league),
      p_nationality: optional(form.nationality),
      p_phone: optional(form.phone),
      p_date_of_birth: optional(form.birthdate),
    });
    setSaving(false);

    if (error) {
      Alert.alert('Unable to save profile', error.message);
      return;
    }

    await refreshProfile();
    Alert.alert('Profile updated', 'Your changes have been saved.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  }

  const citiesForCountry = form.countryIsoCode
    ? (City.getCitiesOfCountry(form.countryIsoCode) ?? [])
    : [];

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          accessibilityLabel="Back"
          style={s.headerButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft color={Colors.textPrimary} size={21} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={s.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.intro}>
            <View style={s.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
              ) : (
                <UserRound color={Colors.primary} size={24} />
              )}
            </View>
            <View style={s.flex}>
              <Text style={s.introTitle}>Personal information</Text>
              <Text style={s.introText}>Keep your athlete profile accurate for scouts and opportunities.</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Update profile photo"
                disabled={avatarUploading}
                onPress={() => void updateAvatar()}
              >
                <Text style={s.photoAction}>
                  {avatarUploading ? 'Uploading photo…' : 'Update profile photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.card}>
            <Field
              label="First name"
              value={form.firstName}
              onChangeText={(value) => update('firstName', value)}
              placeholder="First name"
              autoCapitalize="words"
            />
            <Field
              label="Middle name (optional)"
              value={form.middleName}
              onChangeText={(value) => update('middleName', value)}
              placeholder="Middle name"
              autoCapitalize="words"
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChangeText={(value) => update('lastName', value)}
              placeholder="Last name"
              autoCapitalize="words"
            />
            <Field
              label="Bio"
              value={form.bio}
              onChangeText={(value) => update('bio', value)}
              placeholder="Tell scouts about your background and goals"
              multiline
            />
            <View style={s.field}>
              <Text style={s.label}>Sport</Text>
              <View style={s.sportChipsRow}>
                {Object.values(SPORTS_CONFIG).map((config) => (
                  <TouchableOpacity
                    key={config.sport}
                    style={[s.sportChip, form.sportKey === config.sport && s.sportChipActive]}
                    onPress={() => setForm((current) => ({ ...current, sportKey: config.sport, sportOther: '' }))}
                  >
                    <Text style={[s.sportChipTxt, form.sportKey === config.sport && s.sportChipTxtActive]}>
                      {config.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.sportChip, form.sportKey === 'other' && s.sportChipActive]}
                  onPress={() => setForm((current) => ({ ...current, sportKey: 'other' }))}
                >
                  <Text style={[s.sportChipTxt, form.sportKey === 'other' && s.sportChipTxtActive]}>
                    Other
                  </Text>
                </TouchableOpacity>
              </View>
              {form.sportKey === 'other' && (
                <TextInput
                  accessibilityLabel="Sport (other)"
                  style={s.input}
                  value={form.sportOther}
                  onChangeText={(value) => update('sportOther', value)}
                  placeholder="Enter your sport"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="words"
                />
              )}
            </View>
            {POSITIONS_BY_SPORT[form.sportKey] ? (
              <View style={s.field}>
                <Text style={s.label}>Primary position</Text>
                <View style={s.input}>
                  <Picker
                    selectedValue={form.position}
                    onValueChange={(value) => update('position', value)}
                    style={{ color: Colors.textPrimary }}
                    dropdownIconColor={Colors.textPrimary}
                  >
                    <Picker.Item label="Select position" value="" />
                    {POSITIONS_BY_SPORT[form.sportKey].map((pos) => (
                      <Picker.Item key={pos} label={pos} value={pos} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <Field
                label="Primary position"
                value={form.position}
                onChangeText={(value) => update('position', value)}
                placeholder="e.g. Goalkeeper"
                autoCapitalize="words"
              />
            )}
            <Field
              label="Current club"
              value={form.currentClub}
              onChangeText={(value) => update('currentClub', value)}
              placeholder="Your current club"
              autoCapitalize="words"
            />
            <View style={s.field}>
              <Text style={s.label}>Level</Text>
              <View style={s.input}>
                <Picker
                  selectedValue={form.level}
                  onValueChange={(value) => update('level', value)}
                  style={{ color: Colors.textPrimary }}
                  dropdownIconColor={Colors.textPrimary}
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <Picker.Item key={opt.key} label={opt.label} value={opt.key} />
                  ))}
                </Picker>
              </View>
            </View>
            <Field
              label="League name (optional)"
              value={form.league}
              onChangeText={(value) => update('league', value)}
              placeholder="e.g. UAE Pro League"
              autoCapitalize="words"
            />
            <View style={s.field}>
              <Text style={s.label}>Nationality</Text>
              <View style={s.input}>
                <Picker
                  selectedValue={form.nationality}
                  onValueChange={(value) => update('nationality', value)}
                  style={{ color: Colors.textPrimary }}
                  dropdownIconColor={Colors.textPrimary}
                >
                  <Picker.Item label="Select nationality" value="" />
                  {ALL_COUNTRIES.map((c) => (
                    <Picker.Item key={c.isoCode} label={c.name} value={c.name} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={s.twoColumns}>
              <View style={s.column}>
                <View style={s.field}>
                  <Text style={s.label}>Country</Text>
                  <View style={s.input}>
                    <Picker
                      selectedValue={form.countryIsoCode}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, countryIsoCode: value, city: '' }))
                      }
                      style={{ color: Colors.textPrimary }}
                      dropdownIconColor={Colors.textPrimary}
                    >
                      <Picker.Item label="Select country" value="" />
                      {ALL_COUNTRIES.map((c) => (
                        <Picker.Item key={c.isoCode} label={c.name} value={c.isoCode} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
              <View style={s.column}>
                <View style={s.field}>
                  <Text style={s.label}>City</Text>
                  <View style={s.input}>
                    <Picker
                      enabled={!!form.countryIsoCode}
                      selectedValue={form.city}
                      onValueChange={(value) => update('city', value)}
                      style={{ color: Colors.textPrimary }}
                      dropdownIconColor={Colors.textPrimary}
                    >
                      <Picker.Item
                        label={form.countryIsoCode ? 'Select city' : 'Select country first'}
                        value=""
                      />
                      {citiesForCountry.map((city) => (
                        <Picker.Item key={city.name} label={city.name} value={city.name} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
            <Field
              label="Phone number (optional)"
              value={form.phone}
              onChangeText={(value) => update('phone', value)}
              placeholder="+971 50 123 4567"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <View style={s.field}>
              <Text style={s.label}>Date of birth</Text>
              <TouchableOpacity
                accessibilityLabel="Date of birth"
                style={s.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{
                  fontFamily: Typography.family.regular,
                  fontSize: Typography.size.sm,
                  color: form.birthdate ? Colors.textPrimary : Colors.textDisabled,
                }}>
                  {form.birthdate || 'Select date of birth'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.bg} size="small" />
              : <Save color={Colors.bg} size={18} />
            }
            <Text style={s.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <View style={[s.card, { width: '85%' }]}>
            <DateTimePicker
              value={form.birthdate ? new Date(`${form.birthdate}T00:00:00Z`) : new Date(2005, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_event, selectedDate) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selectedDate) {
                  update('birthdate', selectedDate.toISOString().slice(0, 10));
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm date of birth"
                style={s.saveButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={s.saveText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.giant },
  intro: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  introTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  introText: {
    marginTop: 3,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  photoAction: {
    marginTop: 6,
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  field: { gap: 7 },
  sportChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sportChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  sportChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  sportChipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  sportChipTxtActive: { color: Colors.primary, fontFamily: Typography.family.bold },
  label: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  input: {
    minHeight: 46,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: Spacing.md },
  column: { flex: 1 },
  saveButton: {
    minHeight: 50,
    marginTop: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.sm,
    color: Colors.bg,
  },
});
