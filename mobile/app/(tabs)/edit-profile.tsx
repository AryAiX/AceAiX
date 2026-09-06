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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save, UserRound } from 'lucide-react-native';
import SPORTS_CONFIG, { normalizeSportKey } from '@/constants/sportsConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '@/context/AuthContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { supabase } from '@/lib/supabase';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { Country, City } from 'country-state-city';
import { POSITIONS_BY_SPORT } from '@/constants/positions';
import { LEVEL_OPTIONS } from '@/constants/levels';
import SelectModal from '@/components/SelectModal';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

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
  phoneCountryIso: string;
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
  phoneCountryIso: 'AE',
  birthdate: '',
};

const ALL_COUNTRIES = Country.getAllCountries()
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

const PHONE_COUNTRIES = ALL_COUNTRIES.filter((c) => !!c.phonecode).map((c) => ({
  label: `${c.flag ?? ''} ${c.name} (+${c.phonecode})`.trim(),
  value: c.isoCode,
}));

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYearForBirthdate = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 70 }, (_, i) => String(currentYearForBirthdate - 10 - i));

type LegacyProfileNames = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  level?: string | null;
};

function legacyName(source: unknown, key: keyof LegacyProfileNames): string {
  const record = source as LegacyProfileNames | null | undefined;
  return record?.[key] ?? '';
}

function optional(value: string): string | null {
  return value.trim() || null;
}

function buildBirthdateFromParts(day: string, month: string, year: string): string {
  if (!day || !month || !year) return '';
  const mIdx = MONTHS.indexOf(month) + 1;
  return `${year}-${String(mIdx).padStart(2, '0')}-${day}`;
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
  const { from } = useLocalSearchParams<{ from?: string }>();
  function hasUnsavedChanges(): boolean {
    if (pendingAvatarAsset) return true;
    if (!initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }
  function goBackToOrigin() {
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. If you leave now, they will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => discardChanges() },
        ]
      );
    } else {
      performGoBack();
    }
  }

  function performGoBack() {
    if (from === 'settings') {
      router.replace('/(tabs)/settings' as any);
    } else if (from === 'profile') {
      router.replace('/(tabs)/profile' as any);
    } else {
      router.back();
    }
  }

  function resetFormToInitial() {
    if (initialForm) {
      setForm(initialForm);
    }
    setPendingAvatarAsset(null);
  }

  function discardChanges() {
    resetFormToInitial();
    performGoBack();
  }
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const { setHasUnsavedChanges, registerDiscardHandler } = useUnsavedChanges();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<ProfileForm | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pendingAvatarAsset, setPendingAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [touched, setTouched] = useState({ sport: false, country: false, birthdate: false, position: false, phone: false });
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [nationalityModalOpen, setNationalityModalOpen] = useState(false);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setFormReady(false);
      return;
    }
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

    const rawPhone = profile?.phone ?? '';
    const parsedPhone = rawPhone ? parsePhoneNumberFromString(rawPhone) : undefined;
    const phoneCountryIso = parsedPhone?.country ?? 'AE';
    const phoneLocalNumber = parsedPhone ? String(parsedPhone.nationalNumber) : rawPhone;

    const loadedForm: ProfileForm = {
      firstName,
      middleName,
      lastName,
      bio: profile?.bio ?? '',
      sportKey: isKnownSport ? normalizedSport! : (profile?.sport ? 'other' : ''),
      sportOther: isKnownSport ? '' : (profile?.sport ?? ''),
      position: profile?.position ?? '',
      currentClub: profile?.current_club ?? '',
      level: legacyName(profile, 'level') || 'amateur',
      league: profile?.league ?? '',
      nationality: profile?.nationality ?? '',
      countryIsoCode: matchedCountry?.isoCode ?? '',
      city: profile?.hometown ?? '',
      phone: phoneLocalNumber,
      phoneCountryIso,
      birthdate: profile?.birthdate ?? '',
    };
    setForm(loadedForm);
    setInitialForm({ ...loadedForm });

    if (!profile?.birthdate) {
      setBirthDay('');
      setBirthMonth('');
      setBirthYear('');
    } else {
      const [year, monthNum, day] = profile.birthdate.split('-');
      setBirthDay(day);
      setBirthMonth(MONTHS[parseInt(monthNum, 10) - 1] ?? '');
      setBirthYear(year);
    }

    setFormReady(true);
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
    legacyName(profile, 'level'),
    profile?.nationality,
    profile?.phone,
    profile?.position,
    profile?.sport,
  ]);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges());
  }, [form, initialForm, pendingAvatarAsset]);

  useEffect(() => {
    registerDiscardHandler(resetFormToInitial);
    return () => registerDiscardHandler(null);
  }, [initialForm]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function pickAvatar() {
    if (!user || avatarUploading) return;

    const pickFromLibrary = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingAvatarAsset(result.assets[0]);
      }
    };

    const pickFromCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Enable camera access in Settings to take a new profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingAvatarAsset(result.assets[0]);
      }
    };

    if (Platform.OS === 'web') {
      await pickFromLibrary();
      return;
    }

    Alert.alert(
      'Update profile photo',
      undefined,
      [
        { text: 'Take Photo', onPress: () => void pickFromCamera() },
        { text: 'Choose from Library', onPress: () => void pickFromLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  async function uploadPendingAvatar(): Promise<boolean> {
    if (!user || !pendingAvatarAsset) return true;
    setAvatarUploading(true);
    try {
      const asset = pendingAvatarAsset;
      const extension = asset.mimeType === 'image/png'
        ? 'png'
        : asset.mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
      const contentType = asset.mimeType ?? 'image/jpeg';
      const path = `${user.id}/avatar.${extension}`;

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileData = decode(base64);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, fileData, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { data: oldFiles } = await supabase.storage.from('avatars').list(user.id);
      const stalePaths = (oldFiles ?? [])
        .filter((file) => file.id && file.name !== `avatar.${extension}`)
        .map((file) => `${user.id}/${file.name}`);
      if (stalePaths.length > 0) await supabase.storage.from('avatars').remove(stalePaths);

      setPendingAvatarAsset(null);
      return true;
    } catch (error) {
      Alert.alert('Profile photo not updated', error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setAvatarUploading(false);
    }
  }

  const sportValid = form.sportKey !== '' && (form.sportKey !== 'other' || form.sportOther.trim() !== '');
  const countryValid = form.countryIsoCode !== '';
  const birthdateValid = form.birthdate !== '';
  const positionRequired = !!POSITIONS_BY_SPORT[form.sportKey];
  const positionValid = !positionRequired || form.position !== '';
  const phoneValid = form.phone.trim() === '' || isValidPhoneNumber(form.phone.trim(), form.phoneCountryIso as any);

  async function saveProfile() {
    if (!user || saving) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Name required', 'Enter your first and last name before saving.');
      return;
    }
    setTouched({ sport: true, country: true, birthdate: true, position: true, phone: true });
    if (!sportValid || !countryValid || !birthdateValid || !positionValid || !phoneValid) {
      return;
    }
    if (pendingAvatarAsset) {
      const avatarUploaded = await uploadPendingAvatar();
      if (!avatarUploaded) return;
      await refreshProfile();
    }
    const finalSport = form.sportKey === 'other' ? form.sportOther.trim() : form.sportKey;
    const countryName = form.countryIsoCode
      ? ALL_COUNTRIES.find((c) => c.isoCode === form.countryIsoCode)?.name ?? ''
      : '';

    const finalPhone = form.phone.trim()
      ? parsePhoneNumberFromString(form.phone.trim(), form.phoneCountryIso as any)?.number ?? form.phone.trim()
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
      p_phone: optional(finalPhone),
      p_date_of_birth: optional(form.birthdate),
    });
    setSaving(false);

    if (error) {
      Alert.alert('Unable to save profile', error.message);
      return;
    }

    await refreshProfile();
    setInitialForm(form);
    if (Platform.OS === 'web') {
      // React Native Web maps Alert.alert to window.alert and does not invoke
      // native alert-button callbacks. Navigate explicitly after dismissal.
      Alert.alert('Profile updated', 'Your changes have been saved.');
      performGoBack();
    } else {
      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'Done', onPress: () => performGoBack() },
      ]);
    }
  }

  const citiesForCountry = form.countryIsoCode
    ? (City.getCitiesOfCountry(form.countryIsoCode) ?? [])
    : [];

  if (!formReady) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          accessibilityLabel="Back"
          style={s.headerButton}
          onPress={goBackToOrigin}
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
              {pendingAvatarAsset ? (
                <Image source={{ uri: pendingAvatarAsset.uri }} style={s.avatarImage} />
              ) : profile?.avatar_url ? (
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
                onPress={() => void pickAvatar()}
              >
                <Text style={s.photoAction}>
                  {avatarUploading ? 'Uploading photo…' : pendingAvatarAsset ? 'Photo selected — tap Save to apply' : 'Update profile photo'}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Select sport ${config.displayName}`}
                    style={[s.sportChip, form.sportKey === config.sport && s.sportChipActive]}
                    onPress={() => {
                      setForm((current) => ({ ...current, sportKey: config.sport, sportOther: '' }));
                      setTouched((t) => ({ ...t, sport: true }));
                    }}
                  >
                    <Text style={[s.sportChipTxt, form.sportKey === config.sport && s.sportChipTxtActive]}>
                      {config.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select sport Other"
                  style={[s.sportChip, form.sportKey === 'other' && s.sportChipActive]}
                  onPress={() => {
                    setForm((current) => ({ ...current, sportKey: 'other' }));
                    setTouched((t) => ({ ...t, sport: true }));
                  }}
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
              {touched.sport && !sportValid && <Text style={s.errorText}>Sport is required</Text>}
            </View>
            {POSITIONS_BY_SPORT[form.sportKey] ? (
              <View style={s.field}>
                <Text style={s.label}>Primary position</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select primary position"
                  style={s.input}
                  onPress={() => setPositionModalOpen(true)}
                >
                  <Text style={{
                    fontFamily: Typography.family.regular,
                    fontSize: Typography.size.sm,
                    color: form.position ? Colors.textPrimary : Colors.textDisabled,
                  }}>
                    {form.position || 'Select position'}
                  </Text>
                </TouchableOpacity>
                <SelectModal
                  visible={positionModalOpen}
                  title="Select position"
                  options={POSITIONS_BY_SPORT[form.sportKey].map((pos) => ({ label: pos, value: pos }))}
                  selectedValue={form.position}
                  onSelect={(value) => update('position', value)}
                  onClose={() => {
                    setPositionModalOpen(false);
                    setTouched((t) => ({ ...t, position: true }));
                  }}
                />
                {touched.position && !positionValid && <Text style={s.errorText}>Position is required</Text>}
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
              <TouchableOpacity style={s.input} onPress={() => setLevelModalOpen(true)}>
                <Text style={{
                  fontFamily: Typography.family.regular,
                  fontSize: Typography.size.sm,
                  color: Colors.textPrimary,
                }}>
                  {LEVEL_OPTIONS.find((opt) => opt.key === form.level)?.label || 'Select level'}
                </Text>
              </TouchableOpacity>
              <SelectModal
                visible={levelModalOpen}
                title="Select level"
                options={LEVEL_OPTIONS.map((opt) => ({ label: opt.label, value: opt.key }))}
                selectedValue={form.level}
                onSelect={(value) => update('level', value)}
                onClose={() => setLevelModalOpen(false)}
              />
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
              <TouchableOpacity style={s.input} onPress={() => setNationalityModalOpen(true)}>
                <Text style={{
                  fontFamily: Typography.family.regular,
                  fontSize: Typography.size.sm,
                  color: form.nationality ? Colors.textPrimary : Colors.textDisabled,
                }}>
                  {form.nationality || 'Select nationality'}
                </Text>
              </TouchableOpacity>
              <SelectModal
                visible={nationalityModalOpen}
                title="Select nationality"
                options={ALL_COUNTRIES.map((c) => ({ label: c.name, value: c.name }))}
                selectedValue={form.nationality}
                onSelect={(value) => update('nationality', value)}
                onClose={() => setNationalityModalOpen(false)}
                searchable
              />
            </View>
            <View style={s.twoColumns}>
              <View style={s.column}>
                <View style={s.field}>
                  <Text style={s.label}>Country</Text>
                  <TouchableOpacity style={s.input} onPress={() => setCountryModalOpen(true)}>
                    <Text style={{
                      fontFamily: Typography.family.regular,
                      fontSize: Typography.size.sm,
                      color: form.countryIsoCode ? Colors.textPrimary : Colors.textDisabled,
                    }}>
                      {ALL_COUNTRIES.find((c) => c.isoCode === form.countryIsoCode)?.name || 'Select country'}
                    </Text>
                  </TouchableOpacity>
                  <SelectModal
                    visible={countryModalOpen}
                    title="Select country"
                    options={ALL_COUNTRIES.map((c) => ({ label: c.name, value: c.isoCode }))}
                    selectedValue={form.countryIsoCode}
                    onSelect={(value) => setForm((current) => ({ ...current, countryIsoCode: value, city: '' }))}
                    onClose={() => {
                      setCountryModalOpen(false);
                      setTouched((t) => ({ ...t, country: true }));
                    }}
                    searchable
                  />
                  {touched.country && !countryValid && <Text style={s.errorText}>Country is required</Text>}
                </View>
              </View>
              <View style={s.column}>
                <View style={s.field}>
                  <Text style={s.label}>City</Text>
                  <TouchableOpacity
                    style={[s.input, !form.countryIsoCode && { opacity: 0.5 }]}
                    disabled={!form.countryIsoCode}
                    onPress={() => setCityModalOpen(true)}
                  >
                    <Text style={{
                      fontFamily: Typography.family.regular,
                      fontSize: Typography.size.sm,
                      color: form.city ? Colors.textPrimary : Colors.textDisabled,
                    }}>
                      {form.city || (form.countryIsoCode ? 'Select city' : 'Select country first')}
                    </Text>
                  </TouchableOpacity>
                  <SelectModal
                    visible={cityModalOpen}
                    title="Select city"
                    options={citiesForCountry.map((city) => ({ label: city.name, value: city.name }))}
                    selectedValue={form.city}
                    onSelect={(value) => update('city', value)}
                    onClose={() => setCityModalOpen(false)}
                    searchable
                    emptyMessage="No cities found for this country"
                  />
                </View>
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Phone number (optional)</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select phone country code"
                  style={[s.input, { width: 110, justifyContent: 'center' }]}
                  onPress={() => setPhoneModalOpen(true)}
                >
                  <Text
                    style={{ fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {PHONE_COUNTRIES.find((c) => c.value === form.phoneCountryIso)?.label?.match(/\(\+\d+\)$/)?.[0] ?? 'Code'}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  accessibilityLabel="Phone number"
                  style={[s.input, { flex: 1 }]}
                  value={form.phone}
                  onChangeText={(value) => update('phone', value)}
                  placeholder="50 123 4567"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                />
              </View>
              <SelectModal
                visible={phoneModalOpen}
                title="Select country code"
                options={PHONE_COUNTRIES}
                selectedValue={form.phoneCountryIso}
                onSelect={(value) => update('phoneCountryIso', value)}
                onClose={() => setPhoneModalOpen(false)}
                searchable
              />
              {touched.phone && !phoneValid && <Text style={s.errorText}>Enter a valid phone number for the selected country</Text>}
            </View>
            <View style={s.field}>
              <Text style={s.label}>Date of birth</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity style={[s.input, { flex: 0.8 }]} onPress={() => setDayModalOpen(true)}>
                  <Text style={{ fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: birthDay ? Colors.textPrimary : Colors.textDisabled }}>
                    {birthDay || 'Day'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.input, { flex: 1.4 }]} onPress={() => setMonthModalOpen(true)}>
                  <Text style={{ fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: birthMonth ? Colors.textPrimary : Colors.textDisabled }} numberOfLines={1}>
                    {birthMonth || 'Month'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.input, { flex: 1 }]} onPress={() => setYearModalOpen(true)}>
                  <Text style={{ fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: birthYear ? Colors.textPrimary : Colors.textDisabled }}>
                    {birthYear || 'Year'}
                  </Text>
                </TouchableOpacity>
              </View>
              <SelectModal
                visible={dayModalOpen}
                title="Day"
                options={DAYS.map((d) => ({ label: d, value: d }))}
                selectedValue={birthDay}
                onSelect={(value) => {
                  setBirthDay(value);
                  update('birthdate', buildBirthdateFromParts(value, birthMonth, birthYear));
                }}
                onClose={() => { setDayModalOpen(false); setTouched((t) => ({ ...t, birthdate: true })); }}
              />
              <SelectModal
                visible={monthModalOpen}
                title="Month"
                options={MONTHS.map((m) => ({ label: m, value: m }))}
                selectedValue={birthMonth}
                onSelect={(value) => {
                  setBirthMonth(value);
                  update('birthdate', buildBirthdateFromParts(birthDay, value, birthYear));
                }}
                onClose={() => { setMonthModalOpen(false); setTouched((t) => ({ ...t, birthdate: true })); }}
              />
              <SelectModal
                visible={yearModalOpen}
                title="Year"
                options={BIRTH_YEARS.map((y) => ({ label: y, value: y }))}
                selectedValue={birthYear}
                onSelect={(value) => {
                  setBirthYear(value);
                  update('birthdate', buildBirthdateFromParts(birthDay, birthMonth, value));
                }}
                onClose={() => { setYearModalOpen(false); setTouched((t) => ({ ...t, birthdate: true })); }}
              />
              {touched.birthdate && !birthdateValid && <Text style={s.errorText}>Date of birth is required</Text>}
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
  errorText: {
    marginTop: 2,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.error,
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
