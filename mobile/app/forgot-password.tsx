import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';

function getFriendlyErrorMessage(message: string): string {
  if (/network request failed|network/i.test(message)) {
    return 'No internet connection. Please check your network and try again.';
  }
  return message;
}

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) {
      setError(getFriendlyErrorMessage(result.error));
      return;
    }
    setSent(true);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0B0F17', '#0D1420', '#0B0F17']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset your password</Text>
          <Text style={styles.cardSub}>
            {sent
              ? 'If an account exists for that email, a reset link is on its way.'
              : "Enter your account email and we'll send you a reset link."}
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!sent && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  accessibilityLabel="Email"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="athlete@example.com"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient colors={[Colors.primary, '#1A6AD4']} style={styles.btnGradient}>
                  {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Send reset link</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  kav: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center' },
  card: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: Radii.xl,
    padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xxl, color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.xxl, lineHeight: 20 },
  errorBanner: { backgroundColor: 'rgba(255, 90, 95, 0.12)', borderWidth: 1, borderColor: Colors.error, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg },
  errorText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error },
  field: { marginBottom: Spacing.lg },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontFamily: Typography.family.regular,
    fontSize: Typography.size.md, color: Colors.textPrimary,
  },
  primaryBtn: { borderRadius: Radii.md, overflow: 'hidden', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  backText: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
});
