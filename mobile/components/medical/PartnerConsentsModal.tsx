import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Shield, X } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { fetchConnectedPartners, PartnerConsentInfo } from '@/lib/medicalService';

interface Props {
  visible: boolean;
  athleteId: string | null | undefined;
  onClose: () => void;
}

function consentLabel(status: string | null): { text: string; color: string; granted: boolean } {
  if (status === 'granted') return { text: 'Access granted', color: Colors.success, granted: true };
  if (status === 'revoked') return { text: 'Access revoked', color: Colors.textMuted, granted: false };
  return { text: 'No active consent', color: Colors.textMuted, granted: false };
}

export function PartnerConsentsModal({ visible, athleteId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [partners, setPartners] = useState<PartnerConsentInfo[]>([]);

  useEffect(() => {
    if (!visible || !athleteId) return;
    let mounted = true;
    setLoading(true);
    setError(false);
    fetchConnectedPartners(athleteId).then(({ data, error: fetchError }) => {
      if (!mounted) return;
      if (fetchError) {
        setError(true);
        setPartners([]);
      } else {
        setPartners(data);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [visible, athleteId]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.iconBox}>
              <Shield color={Colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Connected Medical Partners</Text>
              <Text style={s.sub}>Who has issued or has access to your records</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : error ? (
              <Text style={s.stateTxt}>Couldn't load partner data — pull to refresh or try again.</Text>
            ) : partners.length === 0 ? (
              <Text style={s.stateTxt}>No medical partners are currently connected to your account.</Text>
            ) : (
              partners.map((partner) => {
                const pill = consentLabel(partner.consentStatus);
                const accreditation = partner.accreditationStatus === 'accredited'
                  ? 'Accredited partner'
                  : partner.accreditationStatus;
                const meta = partner.consentScope
                  ? `${accreditation} · Scope: ${partner.consentScope}`
                  : accreditation;
                return (
                  <View key={partner.partnerId} style={s.card}>
                    <Text style={s.partnerName}>{partner.partnerName}</Text>
                    <View style={[s.pill, { backgroundColor: `${pill.color}18`, borderColor: `${pill.color}40` }]}>
                      {pill.granted && <Check color={pill.color} size={12} />}
                      <Text style={[s.pillTxt, { color: pill.color }]}>{pill.text}</Text>
                    </View>
                    <Text style={s.meta}>{meta}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
    paddingTop: Spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}40` },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1 },
  body: { padding: Spacing.xl, gap: Spacing.md },
  stateTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  card: { backgroundColor: Colors.elevated, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  partnerName: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  pillTxt: { fontFamily: Typography.family.bold, fontSize: 10 },
  meta: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
});
