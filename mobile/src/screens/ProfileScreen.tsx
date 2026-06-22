import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { updateAthlete, updateUserProfile } from '../api/athlete';
import { Card, Field, Pill, PrimaryButton, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { AthleteProfile, UserProfile } from '../types';

interface Props {
  athlete: AthleteProfile;
  profile: UserProfile;
  onChanged: () => Promise<void>;
}

export function ProfileScreen({ athlete, profile, onChanged }: Props) {
  const { signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? athlete.bio ?? '');
  const [sport, setSport] = useState(athlete.sport ?? 'Football');
  const [position, setPosition] = useState(athlete.position_primary ?? athlete.position ?? '');
  const [club, setClub] = useState(athlete.current_club ?? '');
  const [level, setLevel] = useState(athlete.level ?? 'amateur');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile.full_name ?? '');
    setBio(profile.bio ?? athlete.bio ?? '');
    setSport(athlete.sport ?? 'Football');
    setPosition(athlete.position_primary ?? athlete.position ?? '');
    setClub(athlete.current_club ?? '');
    setLevel(athlete.level ?? 'amateur');
  }, [athlete, profile]);

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        updateUserProfile(profile.id, { full_name: fullName.trim(), bio: bio.trim() || null }),
        updateAthlete(athlete.id, {
          sport: sport.trim() || null,
          position_primary: position.trim() || null,
          position: position.trim() || null,
          current_club: club.trim() || null,
          level: level.trim() || 'amateur',
          bio: bio.trim() || null,
        }),
      ]);
      await refreshProfile();
      await onChanged();
      Alert.alert('Profile saved', 'Your athlete profile has been updated.');
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Profile" action={<Pill label={`${athlete.profile_completeness ?? 0}% complete`} tone="success" />} />

      <Card>
        <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Field label="Sport" value={sport} onChangeText={setSport} autoCapitalize="words" />
        <Field label="Position" value={position} onChangeText={setPosition} autoCapitalize="words" />
        <Field label="Current club" value={club} onChangeText={setClub} autoCapitalize="words" />
        <Field label="Level" value={level} onChangeText={setLevel} autoCapitalize="words" />
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
          style={styles.bioInput}
          placeholder="Describe your playing style, goals, and recent progress."
        />
        <PrimaryButton label={saving ? 'Saving...' : 'Save profile'} disabled={saving} onPress={save} />
      </Card>

      <Card accent={colors.danger}>
        <Text style={styles.cardTitle}>Session</Text>
        <Text style={styles.copy}>Sign out of this athlete device session. Your Supabase account and profile data remain intact.</Text>
        <PrimaryButton label="Sign out" variant="danger" onPress={signOut} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  bioInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  cardTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  copy: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
});
