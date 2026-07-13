import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth, SignUpData } from '@/context/AuthContext';

const LOGO = require('@/assets/images/AceAiX_logo_transparent_(1) copy.png');
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  ArrowLeft,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
} from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORTS = [
  'Athletics (Track & Field)', 'Basketball', 'Boxing', 'Cycling',
  'Football (Soccer)', 'Golf', 'Gymnastics', 'Hockey (Field)',
  'Hockey (Ice)', 'Martial Arts', 'MMA', 'Rowing', 'Rugby',
  'Skiing', 'Surfing', 'Swimming', 'Table Tennis', 'Tennis',
  'Triathlon', 'Volleyball', 'Weightlifting', 'Wrestling',
  'American Football', 'Baseball', 'Cricket', 'Badminton',
  'Fencing', 'Other',
];

const PHONE_CODES = [
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
];

const NATIONALITIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Argentinian', 'Australian',
  'Austrian', 'Bahraini', 'Bangladeshi', 'Belgian', 'Brazilian', 'British',
  'Bulgarian', 'Cameroonian', 'Canadian', 'Chilean', 'Chinese', 'Colombian',
  'Croatian', 'Czech', 'Danish', 'Dutch', 'Egyptian', 'Emirati', 'Ethiopian',
  'Finnish', 'French', 'German', 'Ghanaian', 'Greek', 'Hungarian', 'Indian',
  'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Italian', 'Ivorian', 'Japanese',
  'Jordanian', 'Kenyan', 'Korean', 'Kuwaiti', 'Lebanese', 'Libyan', 'Malaysian',
  'Moroccan', 'Mexican', 'Nigerian', 'Norwegian', 'Omani', 'Pakistani', 'Peruvian',
  'Philippine', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Saudi',
  'Senegalese', 'Serbian', 'South African', 'Spanish', 'Swedish', 'Swiss',
  'Tunisian', 'Turkish', 'Ukrainian', 'Uruguayan', 'Venezuelan',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => String(currentYear - 10 - i));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pwd: string): { label: string; color: string; pct: number } {
  if (!pwd) return { label: '', color: Colors.border, pct: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: 'Weak', color: Colors.error, pct: 30 };
  if (score <= 3) return { label: 'Fair', color: Colors.warning, pct: 60 };
  return { label: 'Strong', color: Colors.success, pct: 100 };
}

function calcAge(day: string, month: string, year: string): number | null {
  if (!day || !month || !year) return null;
  const mIdx = MONTHS.indexOf(month);
  if (mIdx === -1) return null;
  const birth = new Date(Number(year), mIdx, Number(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function buildBirthdate(day: string, month: string, year: string): string {
  const mIdx = MONTHS.indexOf(month) + 1;
  return `${year}-${String(mIdx).padStart(2, '0')}-${day}`;
}

// ─── PickerModal ──────────────────────────────────────────────────────────────

interface PickerItem { label: string; value: string; prefix?: string }

function PickerModal({
  visible, title, items, selected, onSelect, onClose, searchable = false,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string;
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = searchable && query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  function handleSelect(item: PickerItem) {
    Keyboard.dismiss();
    onSelect(item);
    onClose();
    setQuery('');
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
    setQuery('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* KAV is the full-screen container so the sheet lifts above the keyboard */}
      <KeyboardAvoidingView
        style={pm.kavOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <View style={pm.header}>
            <Text style={pm.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>
          {searchable && (
            <View style={pm.searchRow}>
              <Search color={Colors.textMuted} size={15} />
              <TextInput
                style={pm.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={Colors.textDisabled}
                autoFocus
                returnKeyType="search"
              />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={i => i.value}
            style={pm.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <TouchableOpacity
                  style={[pm.item, active && pm.itemActive]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.prefix ? <Text style={pm.prefix}>{item.prefix}</Text> : null}
                  <Text style={[pm.itemText, active && pm.itemTextActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {active && <CheckCircle2 color={Colors.primary} size={16} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pm = StyleSheet.create({
  kavOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing.xxxl,
  },
  handle: {
    width: 36,
    height: 4,
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
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xxl,
    marginVertical: Spacing.md,
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  list: { flexShrink: 1, maxHeight: 340 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemActive: { backgroundColor: 'rgba(46, 139, 255, 0.08)' },
  prefix: { fontSize: Typography.size.lg, width: 28 },
  itemText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textMuted,
  },
  itemTextActive: { color: Colors.textPrimary, fontFamily: Typography.family.medium },
});

// ─── Field sub-components ─────────────────────────────────────────────────────

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
      <Text style={s.label}>{label}</Text>
      {optional && (
        <View style={s.optionalBadge}>
          <Text style={s.optionalText}>Optional</Text>
        </View>
      )}
    </View>
  );
}

function SelectButton({
  value, placeholder, onPress, error, style, textStyle,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  style?: any;
  textStyle?: any;
}) {
  return (
    <TouchableOpacity
      style={[s.selectBtn, style, error ? s.inputError : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.selectText, textStyle, !value && s.placeholderText]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <ChevronDown color={Colors.textMuted} size={16} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type PickerTarget =
  | 'sport' | 'nationality' | 'phoneCode'
  | 'day' | 'month' | 'year' | null;

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const screenWidth = Dimensions.get('window').width;

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phone, setPhone] = useState('');

  // Step 2 fields
  const [sport, setSport] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [hometown, setHometown] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [nationality, setNationality] = useState('');
  const [league, setLeague] = useState('');

  // UI state
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pwdStrength = getPasswordStrength(password);
  const age = calcAge(birthDay, birthMonth, birthYear);

  // ── Picker config ──
  const pickerConfig = useMemo(() => {
    switch (pickerTarget) {
      case 'sport':
        return {
          title: 'Select Sport', searchable: false,
          items: SPORTS.map(s => ({ label: s, value: s })),
          selected: sport,
          onSelect: (item: PickerItem) => setSport(item.value),
        };
      case 'nationality':
        return {
          title: 'Select Nationality', searchable: true,
          items: NATIONALITIES.map(n => ({ label: n, value: n })),
          selected: nationality,
          onSelect: (item: PickerItem) => setNationality(item.value),
        };
      case 'phoneCode':
        return {
          title: 'Country Code', searchable: true,
          items: PHONE_CODES.map(c => ({ label: `${c.name} (${c.dial})`, value: c.code, prefix: c.flag })),
          selected: phoneCode.code,
          onSelect: (item: PickerItem) => {
            const found = PHONE_CODES.find(c => c.code === item.value);
            if (found) setPhoneCode(found);
          },
        };
      case 'day':
        return {
          title: 'Day', searchable: false,
          items: DAYS.map(d => ({ label: d, value: d })),
          selected: birthDay,
          onSelect: (item: PickerItem) => setBirthDay(item.value),
        };
      case 'month':
        return {
          title: 'Month', searchable: false,
          items: MONTHS.map(m => ({ label: m, value: m })),
          selected: birthMonth,
          onSelect: (item: PickerItem) => setBirthMonth(item.value),
        };
      case 'year':
        return {
          title: 'Year', searchable: false,
          items: YEARS.map(y => ({ label: y, value: y })),
          selected: birthYear,
          onSelect: (item: PickerItem) => setBirthYear(item.value),
        };
      default:
        return null;
    }
  }, [pickerTarget, sport, nationality, phoneCode, birthDay, birthMonth, birthYear]);

  // ── Validation ──
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!validateEmail(email.trim())) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Must be at least 8 characters';
    if (phone.trim() && phone.replace(/\D/g, '').length < 6) e.phone = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!sport) e.sport = 'Please select your sport';
    if (!birthDay || !birthMonth || !birthYear) e.birthdate = 'Please complete your birthday';
    if (!hometown.trim()) e.hometown = 'Hometown is required';
    if (!currentLocation.trim()) e.currentLocation = 'Current location is required';
    if (!nationality) e.nationality = 'Please select your nationality';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Navigation ──
  function goToStep2() {
    if (!validateStep1()) return;
    setErrors({});
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setCurrentStep(2);
  }

  function goToStep1() {
    setErrors({});
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setCurrentStep(1);
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!validateStep2()) return;
    setLoading(true);
    const data: SignUpData = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      phone: phone.trim() ? `${phoneCode.dial}${phone.trim()}` : null,
      sport_category: sport,
      birthdate: buildBirthdate(birthDay, birthMonth, birthYear),
      hometown: hometown.trim(),
      current_location: currentLocation.trim(),
      nationality,
      league: league.trim() || null,
    };
    const { error } = await signUp(data);
    setLoading(false);
    if (error) {
      setErrors({ submit: error });
    }
    // On success, onAuthStateChange fires and redirects automatically
  }

  // ── Progress bar widths ──
  const progressWidth = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '100%'],
  });

  const containerTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenWidth],
  });

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0B0F17', '#0D1420', '#0B0F17']} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, { top: -80, left: -100, backgroundColor: Colors.primaryGlow }]} />
      <View style={[s.glow, { bottom: 60, right: -80, backgroundColor: Colors.accentGlow, width: 240, height: 240 }]} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={currentStep === 1 ? () => router.back() : goToStep1}
          hitSlop={8}
        >
          <ArrowLeft color={Colors.textMuted} size={20} />
        </TouchableOpacity>

        <View style={s.progressContainer}>
          <Image source={LOGO} style={s.headerLogo} resizeMode="contain" />
          <Text style={s.stepLabel}>Step {currentStep} of 2</Text>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <X color={Colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* Steps carousel */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior="padding"
      >
        <View style={[s.carousel, { width: screenWidth }]}>
          <Animated.View
            style={[
              s.stepsRow,
              { width: screenWidth * 2, transform: [{ translateX: containerTranslateX }] },
            ]}
          >
            {/* ── Step 1 ── */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={[s.stepContent, { paddingBottom: 120 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.stepTitle}>Create Account</Text>
              <Text style={s.stepSub}>Set up your athlete credentials</Text>

              {/* Full Name */}
              <View style={s.field}>
                <FieldLabel label="Full Name" />
                <TextInput
                  style={[s.input, errors.fullName ? s.inputError : null]}
                  value={fullName}
                  onChangeText={t => { setFullName(t); setErrors(e => ({ ...e, fullName: '' })); }}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                {errors.fullName ? <Text style={s.errorHint}>{errors.fullName}</Text> : null}
              </View>

              {/* Email */}
              <View style={s.field}>
                <FieldLabel label="Email" />
                <TextInput
                  style={[s.input, errors.email ? s.inputError : null]}
                  value={email}
                  onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
                  placeholder="athlete@example.com"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                {errors.email ? <Text style={s.errorHint}>{errors.email}</Text> : null}
              </View>

              {/* Password */}
              <View style={s.field}>
                <FieldLabel label="Password" />
                <View style={s.passwordWrap}>
                  <TextInput
                    style={[s.input, s.passwordInput, errors.password ? s.inputError : null]}
                    value={password}
                    onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={Colors.textDisabled}
                    secureTextEntry={!showPwd}
                    returnKeyType="next"
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} hitSlop={8}>
                    {showPwd
                      ? <EyeOff color={Colors.textMuted} size={18} />
                      : <Eye color={Colors.textMuted} size={18} />}
                  </TouchableOpacity>
                </View>
                {password.length > 0 && (
                  <View style={s.strengthRow}>
                    <View style={s.strengthTrack}>
                      <View style={[s.strengthFill, { width: `${pwdStrength.pct}%`, backgroundColor: pwdStrength.color }]} />
                    </View>
                    <Text style={[s.strengthLabel, { color: pwdStrength.color }]}>{pwdStrength.label}</Text>
                  </View>
                )}
                {errors.password ? <Text style={s.errorHint}>{errors.password}</Text> : null}
              </View>

              {/* Phone */}
              <View style={s.field}>
                <FieldLabel label="Phone Number" optional />
                <View style={s.phoneRow}>
                  <TouchableOpacity
                    style={[s.codeBtn, errors.phone ? s.inputError : null]}
                    onPress={() => setPickerTarget('phoneCode')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.codeFlag}>{phoneCode.flag}</Text>
                    <Text style={s.codeDial}>{phoneCode.dial}</Text>
                    <ChevronDown color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                  <TextInput
                    style={[s.input, s.phoneInput, errors.phone ? s.inputError : null]}
                    value={phone}
                    onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }}
                    placeholder="50 123 4567"
                    placeholderTextColor={Colors.textDisabled}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
                {errors.phone ? <Text style={s.errorHint}>{errors.phone}</Text> : null}
              </View>

              <TouchableOpacity style={s.primaryBtn} onPress={goToStep2} activeOpacity={0.85}>
                <LinearGradient
                  colors={[Colors.primary, '#1A6AD4']}
                  style={s.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={s.btnText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

            {/* ── Step 2 ── */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={[s.stepContent, { paddingBottom: 120 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.stepTitle}>Athlete Profile</Text>
              <Text style={s.stepSub}>Tell us about your sport and background</Text>

              {errors.submit ? (
                <View style={s.errorBanner}>
                  <Text style={s.errorBannerText}>{errors.submit}</Text>
                </View>
              ) : null}

              {/* Sport */}
              <View style={s.field}>
                <FieldLabel label="Sport" />
                <SelectButton
                  value={sport}
                  placeholder="Select your sport"
                  onPress={() => setPickerTarget('sport')}
                  error={errors.sport}
                />
                {errors.sport ? <Text style={s.errorHint}>{errors.sport}</Text> : null}
              </View>

              {/* Birthday */}
              <View style={s.field}>
                <FieldLabel label="Date of Birth" />
                <View style={s.dateRow}>
                  <SelectButton
                    value={birthDay}
                    placeholder="Day"
                    onPress={() => setPickerTarget('day')}
                    error={errors.birthdate}
                    style={s.dateSelectDay}
                    textStyle={s.dateSelectText}
                  />
                  <SelectButton
                    value={birthMonth}
                    placeholder="Month"
                    onPress={() => setPickerTarget('month')}
                    error={errors.birthdate}
                    style={s.dateSelectMonth}
                    textStyle={s.dateSelectText}
                  />
                  <SelectButton
                    value={birthYear}
                    placeholder="Year"
                    onPress={() => setPickerTarget('year')}
                    error={errors.birthdate}
                    style={s.dateSelectYear}
                    textStyle={s.dateSelectText}
                  />
                </View>
                {age !== null && (
                  <View style={s.ageChip}>
                    <Text style={s.ageChipText}>Age: {age}</Text>
                  </View>
                )}
                {errors.birthdate ? <Text style={s.errorHint}>{errors.birthdate}</Text> : null}
              </View>

              {/* Hometown */}
              <View style={s.field}>
                <FieldLabel label="Hometown" />
                <TextInput
                  style={[s.input, errors.hometown ? s.inputError : null]}
                  value={hometown}
                  onChangeText={t => { setHometown(t); setErrors(e => ({ ...e, hometown: '' })); }}
                  placeholder="e.g. Dubai, UAE"
                  placeholderTextColor={Colors.textDisabled}
                  returnKeyType="next"
                />
                {errors.hometown ? <Text style={s.errorHint}>{errors.hometown}</Text> : null}
              </View>

              {/* Current Location */}
              <View style={s.field}>
                <FieldLabel label="Current Location" />
                <TextInput
                  style={[s.input, errors.currentLocation ? s.inputError : null]}
                  value={currentLocation}
                  onChangeText={t => { setCurrentLocation(t); setErrors(e => ({ ...e, currentLocation: '' })); }}
                  placeholder="e.g. Abu Dhabi, UAE"
                  placeholderTextColor={Colors.textDisabled}
                  returnKeyType="next"
                />
                {errors.currentLocation ? <Text style={s.errorHint}>{errors.currentLocation}</Text> : null}
              </View>

              {/* Nationality */}
              <View style={s.field}>
                <FieldLabel label="Nationality" />
                <SelectButton
                  value={nationality}
                  placeholder="Select nationality"
                  onPress={() => setPickerTarget('nationality')}
                  error={errors.nationality}
                />
                {errors.nationality ? <Text style={s.errorHint}>{errors.nationality}</Text> : null}
              </View>

              {/* League (optional) */}
              <View style={s.field}>
                <FieldLabel label="League / Club" optional />
                <TextInput
                  style={s.input}
                  value={league}
                  onChangeText={setLeague}
                  placeholder="e.g. UAE Pro League"
                  placeholderTextColor={Colors.textDisabled}
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primary, '#1A6AD4']}
                  style={s.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={s.btnText}>Create Account</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: Spacing.xxxl }} />
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* Picker modal */}
      {pickerConfig && (
        <PickerModal
          visible={pickerTarget !== null}
          title={pickerConfig.title}
          items={pickerConfig.items}
          selected={pickerConfig.selected}
          onSelect={pickerConfig.onSelect}
          onClose={() => setPickerTarget(null)}
          searchable={pickerConfig.searchable}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, opacity: 0.35 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressContainer: { flex: 1, alignItems: 'center', gap: 6 },
  headerLogo: { width: 90, height: 26 },
  stepLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },

  kav: { flex: 1 },
  carousel: { flex: 1, overflow: 'hidden' },
  stepsRow: { flexDirection: 'row', flex: 1 },

  stepContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  stepTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xxl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  stepSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xxl,
  },

  field: { marginBottom: Spacing.lg },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  optionalBadge: {
    backgroundColor: 'rgba(198,255,26,0.1)',
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(198,255,26,0.25)',
  },
  optionalText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.accent,
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
  inputError: { borderColor: Colors.error },
  errorHint: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
  strengthTrack: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    width: 44,
  },

  phoneRow: { flexDirection: 'row', gap: Spacing.sm },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  codeFlag: { fontSize: 18 },
  codeDial: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  phoneInput: { flex: 1 },

  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  selectText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  placeholderText: { color: Colors.textDisabled },

  dateRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'stretch' },
  dateSelectDay: { flex: 0.95, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
  dateSelectMonth: { flex: 1.35, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
  dateSelectYear: { flex: 1.05, minWidth: 0, paddingHorizontal: Spacing.md, minHeight: 54 },
  dateSelectText: { fontSize: Typography.size.sm },

  ageChip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(46, 139, 255, 0.1)',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(46, 139, 255, 0.3)',
  },
  ageChipText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.primary,
  },

  errorBanner: {
    backgroundColor: 'rgba(255, 90, 95, 0.12)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
  },

  primaryBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
