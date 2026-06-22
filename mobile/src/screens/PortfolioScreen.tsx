import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createMedia } from '../api/athlete';
import { Card, Field, Pill, PrimaryButton, SectionHeader } from '../components/ui';
import { colors } from '../theme';
import type { AthleteMedia, AthleteProfile } from '../types';

interface Props {
  athlete: AthleteProfile;
  media: AthleteMedia[];
  onChanged: () => Promise<void>;
}

export function PortfolioScreen({ athlete, media, onChanged }: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function addMedia() {
    if (!title.trim() || !url.trim()) {
      Alert.alert('Missing media details', 'Add a title and a public video or image URL.');
      return;
    }
    setSaving(true);
    try {
      await createMedia({ athlete_id: athlete.id, title: title.trim(), storage_url: url.trim() });
      setTitle('');
      setUrl('');
      await onChanged();
    } catch (error) {
      Alert.alert('Could not add media', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Portfolio" action={<Pill label={`${media.length} clips`} tone="info" />} />

      <Card accent={colors.azure}>
        <Text style={styles.cardTitle}>Add highlight</Text>
        <Text style={styles.copy}>
          Mobile currently reuses the web URL-based media pipeline. Native camera and Supabase Storage upload can be layered in next.
        </Text>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Training finish, match assist..." />
        <Field label="Media URL" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" />
        <PrimaryButton label={saving ? 'Saving...' : 'Add to portfolio'} disabled={saving} onPress={addMedia} />
      </Card>

      {media.length ? (
        media.map((item) => (
          <Card key={item.id}>
            <View style={styles.mediaHeader}>
              <View style={styles.mediaText}>
                <Text style={styles.mediaTitle}>{item.title}</Text>
                <Text style={styles.mediaMeta}>
                  {item.media_type.replace('_', ' ')} · {item.views_count} views
                </Text>
              </View>
              {item.is_featured ? <Pill label="Featured" tone="success" /> : null}
            </View>
            {item.description ? <Text style={styles.copy}>{item.description}</Text> : null}
            <PrimaryButton label="Open media" variant="secondary" onPress={() => Linking.openURL(item.storage_url)} />
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>No highlight clips yet. Add your first media URL to start building your mobile portfolio.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
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
    marginBottom: 12,
  },
  mediaHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mediaText: {
    flex: 1,
  },
  mediaTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  mediaMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  empty: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 21,
  },
});
