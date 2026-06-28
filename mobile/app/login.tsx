import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { Eye, EyeOff, Zap } from 'lucide-react-native';

const LOGO = require('@/assets/images/AceAiX_logo_transparent_(1) copy.png');

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) setError(authError);
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B0F17', '#0D1420', '#0B0F17']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { top: -60, left: -80, backgroundColor: Colors.primaryGlow }]} />
      <View style={[styles.glow, { bottom: 80, right: -60, backgroundColor: Colors.accentGlow, width: 220, height: 220 }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.logoArea}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your athlete account</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="athlete@example.com"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={Colors.textDisabled}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={8}
              >
                {showPassword
                  ? <EyeOff color={Colors.textMuted} size={18} />
                  : <Eye color={Colors.textMuted} size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, '#1A6AD4']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Sign In</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>new athlete?</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Zap color={Colors.accent} size={14} />
            <Text style={styles.infoText}>
              This app is exclusively for athletes. Coaches, doctors, and admins should use the web platform.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>AceAiX — Sports Intelligence Platform</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  kav: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.35,
  },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoImage: { width: 220, height: 140 },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xxl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xxl,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 90, 95, 0.12)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },
  field: { marginBottom: Spacing.lg },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  primaryBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    marginHorizontal: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signUpBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.elevated,
  },
  signUpText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(198, 255, 26, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(198, 255, 26, 0.15)',
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
});
