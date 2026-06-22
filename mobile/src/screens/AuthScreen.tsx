import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryButton, Pill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUpAthlete } = useAuth();

  async function submit() {
    if (!email || !password || (mode === 'signup' && !fullName)) {
      Alert.alert('Missing details', 'Complete all required fields to continue.');
      return;
    }

    setLoading(true);
    const result =
      mode === 'signup'
        ? await signUpAthlete(fullName, email, password)
        : await signIn(email, password);
    setLoading(false);

    if (result.error) Alert.alert('Authentication failed', result.error.message);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>AX</Text>
        </View>
        <Pill label="Athlete mobile app" tone="info" />
        <Text style={styles.title}>AceAiX for Athletes</Text>
        <Text style={styles.subtitle}>
          Track your profile strength, upload highlights, log matches, and discover opportunities from the same verified AceAiX backend.
        </Text>

        <View style={styles.switcher}>
          <Text onPress={() => setMode('signin')} style={[styles.switchText, mode === 'signin' && styles.switchActive]}>
            Sign in
          </Text>
          <Text onPress={() => setMode('signup')} style={[styles.switchText, mode === 'signup' && styles.switchActive]}>
            Create account
          </Text>
        </View>

        {mode === 'signup' ? (
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
        ) : null}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" secureTextEntry />

        <PrimaryButton
          disabled={loading}
          label={loading ? 'Working...' : mode === 'signup' ? 'Create athlete account' : 'Sign in'}
          onPress={submit}
        />

        <Text style={styles.note}>
          This native build is scoped to the athlete role. Scout, club, admin, and medical partner workspaces remain in the web app.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.navy900,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.azure,
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    marginBottom: 18,
    width: 64,
  },
  logoText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 14,
  },
  subtitle: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
    marginTop: 10,
  },
  switcher: {
    backgroundColor: colors.navy800,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    padding: 6,
  },
  switchText: {
    borderRadius: 14,
    color: colors.slate,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    overflow: 'hidden',
    paddingVertical: 12,
    textAlign: 'center',
  },
  switchActive: {
    backgroundColor: colors.navy600,
    color: colors.white,
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: 'center',
  },
});
