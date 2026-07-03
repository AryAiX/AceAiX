import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Calendar, FlaskConical, ChevronDown, Clock, Plus, Minus } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  bookAppointment,
  ACADEMY_LOCATIONS,
  TEST_TYPES,
} from '@/lib/sportifyService';
import { useAuth } from '@/context/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBooked: () => void;
}

const PREFERRED_TIMES_OPTIONS = [
  'Weekday Morning (9am–12pm)',
  'Weekday Afternoon (1pm–5pm)',
  'Weekend Morning (9am–12pm)',
  'Weekend Afternoon (1pm–5pm)',
];

export function AppointmentBookingSheet({ visible, onClose, onBooked }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [location, setLocation] = useState(ACADEMY_LOCATIONS[0]);
  const [testType, setTestType] = useState(TEST_TYPES[0]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([PREFERRED_TIMES_OPTIONS[0]]);
  const [notes, setNotes] = useState('');
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTime = (t: string) => {
    setPreferredTimes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleBook = async () => {
    if (!user || preferredTimes.length === 0) return;
    setSubmitting(true);
    setError(null);
    const { id, error: err } = await bookAppointment({
      athleteId: user.id,
      academyLocation: location,
      testType,
      preferredTimes,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    onBooked();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.sheet, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Book Academy Visit</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}><X color={Colors.textMuted} size={20} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {/* Location */}
            <Field label="Academy Location" icon={MapPin}>
              <TouchableOpacity style={s.picker} onPress={() => setShowLocPicker((v) => !v)}>
                <Text style={s.pickerVal} numberOfLines={1}>{location}</Text>
                <ChevronDown color={Colors.textMuted} size={16} />
              </TouchableOpacity>
              {showLocPicker && (
                <View style={s.dropdownBox}>
                  {ACADEMY_LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[s.dropdownItem, location === loc && s.dropdownItemActive]}
                      onPress={() => { setLocation(loc); setShowLocPicker(false); }}
                    >
                      <Text style={[s.dropdownTxt, location === loc && s.dropdownTxtActive]}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            {/* Test type */}
            <Field label="Test Type" icon={FlaskConical}>
              <TouchableOpacity style={s.picker} onPress={() => setShowTypePicker((v) => !v)}>
                <Text style={s.pickerVal} numberOfLines={1}>{testType}</Text>
                <ChevronDown color={Colors.textMuted} size={16} />
              </TouchableOpacity>
              {showTypePicker && (
                <View style={s.dropdownBox}>
                  {TEST_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.dropdownItem, testType === t && s.dropdownItemActive]}
                      onPress={() => { setTestType(t); setShowTypePicker(false); }}
                    >
                      <Text style={[s.dropdownTxt, testType === t && s.dropdownTxtActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            {/* Preferred times */}
            <Field label="Preferred Times (select all that work)" icon={Clock}>
              <View style={s.timesGrid}>
                {PREFERRED_TIMES_OPTIONS.map((t) => {
                  const active = preferredTimes.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.timeChip, active && s.timeChipActive]}
                      onPress={() => toggleTime(t)}
                    >
                      {active ? <Minus color={Colors.primary} size={12} /> : <Plus color={Colors.textMuted} size={12} />}
                      <Text style={[s.timeChipTxt, active && s.timeChipTxtActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {preferredTimes.length === 0 && (
                <Text style={s.warnTxt}>Please select at least one preferred time.</Text>
              )}
            </Field>

            {/* Notes */}
            <Field label="Notes (optional)" icon={Calendar}>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special requirements or questions…"
                placeholderTextColor={Colors.textDisabled}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            <View style={s.infoBox}>
              <Text style={s.infoTxt}>
                The academy will review your request and confirm a slot. You&apos;ll receive a notification once confirmed. You can reschedule or cancel at any time from My Appointments.
              </Text>
            </View>

            {error && <Text style={s.errorTxt}>{error}</Text>}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.bookBtn, (submitting || preferredTimes.length === 0) && { opacity: 0.4 }]}
              onPress={handleBook}
              disabled={submitting || preferredTimes.length === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.black} />
              ) : (
                <Text style={s.bookTxt}>Request Appointment</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <View style={f.wrap}>
      <View style={f.labelRow}>
        <Icon color={Colors.textMuted} size={14} />
        <Text style={f.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, maxHeight: '88%', paddingTop: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  body: { padding: Spacing.xl, gap: Spacing.xl },

  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  pickerVal: { flex: 1, fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },

  dropdownBox: { backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  dropdownItemActive: { backgroundColor: `${Colors.primary}20` },
  dropdownTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  dropdownTxtActive: { color: Colors.primary, fontFamily: Typography.family.bold },

  timesGrid: { gap: Spacing.sm },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  timeChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  timeChipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  timeChipTxtActive: { color: Colors.primary },
  warnTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.warning },

  notesInput: { backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, minHeight: 70 },

  infoBox: { backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  infoTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, lineHeight: 17 },

  errorTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error },

  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  bookBtn: { flex: 2, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.lg, backgroundColor: Colors.accent },
  bookTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.black },
});

const f = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  label: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.sm, color: Colors.textMuted },
});
