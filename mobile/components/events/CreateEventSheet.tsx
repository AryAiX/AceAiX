import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { X, Calendar, Clock, MapPin } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { createEvent, type CreateEventInput } from '@/lib/eventsService';

const EVENT_TYPES = ['Match', 'Training', 'Showcase', 'Trial', 'Camp', 'Friendly', 'Tournament', 'Other'];

export const TYPE_COLORS: Record<string, string> = {
  Match: Colors.primary,
  Training: Colors.success,
  Showcase: Colors.accent,
  Trial: Colors.warning,
  Camp: '#818CF8',
  Friendly: '#34D399',
  Tournament: Colors.error,
  Other: Colors.textMuted,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEventSheet({ visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Training');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(''); setType('Training'); setDate(''); setTime('');
    setLocation(''); setDescription(''); setIsPublic(false); setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!date.trim()) { setError('Date is required (YYYY-MM-DD).'); return; }
    if (!location.trim()) { setError('Location is required.'); return; }

    setLoading(true);
    setError(null);

    const input: CreateEventInput = {
      title: title.trim(),
      type,
      event_date: date.trim(),
      event_time: time.trim(),
      location: location.trim(),
      description: description.trim() || undefined,
      color: TYPE_COLORS[type] ?? Colors.primary,
      is_public: isPublic,
    };

    const { error: err } = await createEvent(input);
    setLoading(false);
    if (err) { setError(err); return; }
    reset();
    onCreated();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.heading}>Create Event</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X color={Colors.textMuted} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={s.errorBanner}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Title *</Text>
              <TextInput
                accessibilityLabel="Event title"
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Regional Training Session"
                placeholderTextColor={Colors.textDisabled}
                returnKeyType="next"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Type</Text>
              <View style={s.typeGrid}>
                {EVENT_TYPES.map(t => {
                  const active = type === t;
                  const col = TYPE_COLORS[t];
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, active && { backgroundColor: `${col}22`, borderColor: col }]}
                      onPress={() => setType(t)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.typeChipTxt, active && { color: col }]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.row2}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Date *</Text>
                <View style={s.iconInput}>
                  <Calendar color={Colors.textMuted} size={14} />
                  <TextInput
                    accessibilityLabel="Event date"
                    style={s.iconInputText}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textDisabled}
                  />
                </View>
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Time</Text>
                <View style={s.iconInput}>
                  <Clock color={Colors.textMuted} size={14} />
                  <TextInput
                    accessibilityLabel="Event time"
                    style={s.iconInputText}
                    value={time}
                    onChangeText={setTime}
                    placeholder="7:30 PM"
                    placeholderTextColor={Colors.textDisabled}
                  />
                </View>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Location *</Text>
              <View style={s.iconInput}>
                <MapPin color={Colors.textMuted} size={14} />
                <TextInput
                  accessibilityLabel="Event location"
                  style={s.iconInputText}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Venue or city"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <TextInput
                accessibilityLabel="Event description"
                style={[s.input, s.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional details…"
                placeholderTextColor={Colors.textDisabled}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Make public</Text>
                <Text style={s.toggleSub}>Visible to other athletes on the platform</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                thumbColor={isPublic ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Create event"
              style={[s.createBtn, loading && { opacity: 0.7 }]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={s.createTxt}>Create Event</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    maxHeight: '92%',
    ...Shadows.card,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heading: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  errorBanner: {
    backgroundColor: `${Colors.error}18`,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.error}35`,
    marginBottom: Spacing.md,
  },
  errorTxt: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
  field: { marginBottom: Spacing.md },
  row2: { flexDirection: 'row', gap: Spacing.md },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 11,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  iconInputText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipTxt: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  cancelTxt: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textMuted,
  },
  createBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
  },
  createTxt: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
  },
});
