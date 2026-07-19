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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

type ProfileForm = {
  fullName: string;
  bio: string;
  sport: string;
  position: string;
  currentClub: string;
  level: string;
  nationality: string;
  city: string;
  country: string;
  phone: string;
  birthdate: string;
};

const EMPTY_FORM: ProfileForm = {
  fullName: '',
  bio: '',
  sport: '',
  position: '',
  currentClub: '',
  level: '',
  nationality: '',
  city: '',
  country: '',
  phone: '',
  birthdate: '',
};

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

  useEffect(() => {
    const [city = '', country = ''] = (profile?.current_location ?? '').split(',').map((part) => part.trim());
    setForm({
      fullName: profile?.full_name ?? '',
      bio: profile?.bio ?? '',
      sport: profile?.sport ?? '',
      position: profile?.position ?? '',
      currentClub: profile?.current_club ?? '',
      level: profile?.league ?? '',
      nationality: profile?.nationality ?? '',
      city: profile?.hometown ?? city,
      country,
      phone: profile?.phone ?? '',
      birthdate: profile?.birthdate ?? '',
    });
  }, [
    profile?.bio,
    profile?.birthdate,
    profile?.current_club,
    profile?.current_location,
    profile?.full_name,
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
    if (!form.fullName.trim()) {
      Alert.alert('Full name required', 'Enter your full name before saving.');
      return;
    }

    setSaving(true);
    const [publicResult, athleteResult, privateResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .update({
          full_name: form.fullName.trim(),
          bio: optional(form.bio),
          city: optional(form.city),
          country: optional(form.country),
        })
        .eq('id', user.id),
      supabase
        .from('athlete_profiles')
        .update({
          sport: optional(form.sport),
          position: optional(form.position),
          position_primary: optional(form.position),
          current_club: optional(form.currentClub),
          level: optional(form.level) ?? 'amateur',
          nationality: optional(form.nationality),
          bio: optional(form.bio),
        })
        .eq('user_id', user.id),
      supabase
        .from('user_private')
        .upsert({
          user_id: user.id,
          phone: optional(form.phone),
          date_of_birth: optional(form.birthdate),
        }),
    ]);
    setSaving(false);

    const error = publicResult.error ?? athleteResult.error ?? privateResult.error;
    if (error) {
      Alert.alert('Unable to save profile', error.message);
      return;
    }

    await refreshProfile();
    Alert.alert('Profile updated', 'Your changes have been saved.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  }

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
              label="Full name"
              value={form.fullName}
              onChangeText={(value) => update('fullName', value)}
              placeholder="Your full name"
              autoCapitalize="words"
            />
            <Field
              label="Bio"
              value={form.bio}
              onChangeText={(value) => update('bio', value)}
              placeholder="Tell scouts about your background and goals"
              multiline
            />
            <Field
              label="Sport"
              value={form.sport}
              onChangeText={(value) => update('sport', value)}
              placeholder="e.g. Football"
              autoCapitalize="words"
            />
            <Field
              label="Primary position"
              value={form.position}
              onChangeText={(value) => update('position', value)}
              placeholder="e.g. Goalkeeper"
              autoCapitalize="words"
            />
            <Field
              label="Current club"
              value={form.currentClub}
              onChangeText={(value) => update('currentClub', value)}
              placeholder="Your current club"
              autoCapitalize="words"
            />
            <Field
              label="Level or league"
              value={form.level}
              onChangeText={(value) => update('level', value)}
              placeholder="e.g. Amateur or UAE Pro League"
              autoCapitalize="words"
            />
            <Field
              label="Nationality"
              value={form.nationality}
              onChangeText={(value) => update('nationality', value)}
              placeholder="Your nationality"
              autoCapitalize="words"
            />
            <View style={s.twoColumns}>
              <View style={s.column}>
                <Field
                  label="City"
                  value={form.city}
                  onChangeText={(value) => update('city', value)}
                  placeholder="City"
                  autoCapitalize="words"
                />
              </View>
              <View style={s.column}>
                <Field
                  label="Country"
                  value={form.country}
                  onChangeText={(value) => update('country', value)}
                  placeholder="Country"
                  autoCapitalize="words"
                />
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
            <Field
              label="Date of birth"
              value={form.birthdate}
              onChangeText={(value) => update('birthdate', value)}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
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
