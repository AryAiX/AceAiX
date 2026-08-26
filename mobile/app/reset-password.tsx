import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';

function parseTokensFromUrl(url: string) {
  const fragment = url.split('#')[1];
  const search = url.split('?')[1]?.split('#')[0];
  const params = new URLSearchParams(fragment || search || '');
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    code: params.get('code'),
  };
}

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function establishSession(url: string | null) {
      if (!url) return;
      const { access_token, refresh_token, code } = parseTokensFromUrl(url);
      if (access_token && refresh_token) {
        const { error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionErr) setSessionError(sessionErr.message);
        else setReady(true);
      } else if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) setSessionError(exchangeErr.message);
        else setReady(true);
      } else {
        setSessionError('This reset link is missing or invalid. Please request a new one.');
      }
    }

    Linking.getInitialURL().then(establishSession);
    const subscription = Linking.addEventListener('url', (event) => establishSession(event.url));
    return () => subscription.remove();
  }, []);

  async function handleSubmit() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0B0F17', '#0D1420', '#0B0F17']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={styles.card}>
          {done ? (
            <>
              <Text style={styles.cardTitle}>Password updated</Text>
              <Text style={styles.cardSub}>You can now sign in with your new password.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/login')}>
                <LinearGradient colors={[Colors.primary, '#1A6AD4']} style={styles.btnGradient}>
                  <Text style={styles.btnText}>Back to sign in</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : sessionError ? (
            <>
              <Text style={styles.cardTitle}>Link expired</Text>
              <Text style={styles.cardSub}>{sessionError}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/forgot-password')}>
                <LinearGradient colors={[Colors.primary, '#1A6AD4']} style={styles.btnGradient}>
                  <Text style={styles.btnText}>Request a new link</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : !ready ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : (
            <>
              <Text style={styles.cardTitle}>Set a new password</Text>
              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  editable={!loading}
                  onSubmitEditing={handleSubmit}
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
                <LinearGradient colors={[Colors.primary, '#1A6AD4']} style={styles.btnGradient}>
                  {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Update password</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  kav: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center' },
  card: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xxl, color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.xxl, lineHeight: 20 },
  errorBanner: { backgroundColor: 'rgba(255, 90, 95, 0.12)', borderWidth: 1, borderColor: Colors.error, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg },
  errorText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error },
  field: { marginBottom: Spacing.lg },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontFamily: Typography.family.regular, fontSize: Typography.size.md, color: Colors.textPrimary },
  primaryBtn: { borderRadius: Radii.md, overflow: 'hidden', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
});
