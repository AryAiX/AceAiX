import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Camera,
  ChevronDown,
  Send,
  MapPin,
  Award,
  Target,
  Zap,
  FlipHorizontal,
  Trash2,
  Images,
  Play,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  PostAudience,
  PostTag,
  PostType,
  createPost,
  uploadPostMedia,
} from '@/lib/postsService';

const { width: SW } = Dimensions.get('window');

const AUDIENCE_OPTIONS: { value: PostAudience; label: string; sub: string }[] = [
  { value: 'followers', label: 'Followers', sub: 'Everyone following you (default)' },
  { value: 'connections', label: 'Connections', sub: 'Mutual connections only' },
  { value: 'public', label: 'Public', sub: 'Anyone on AceAiX' },
];

const TAG_PRESETS: Array<{ label: string; tag: PostTag }> = [
  { label: '🎯 Open to Trials', tag: { type: 'open_to_trials', value: 'Open to Trials' } },
  { label: '⚽ Shooting', tag: { type: 'attribute', value: 'Shooting' } },
  { label: '💨 Pace', tag: { type: 'attribute', value: 'Pace' } },
  { label: '🎯 Dribbling', tag: { type: 'attribute', value: 'Dribbling' } },
  { label: '🏋 Physical', tag: { type: 'attribute', value: 'Physical' } },
  { label: '🎵 Training', tag: { type: 'match', value: 'Training' } },
  { label: '🏆 Match Day', tag: { type: 'match', value: 'Match Day' } },
];

interface CapturedMedia {
  uri: string;
  type: 'photo' | 'video';
}

interface Props {
  visible: boolean;
  postType: PostType;
  onClose: () => void;
  onPosted: () => void;
}

export function PostComposer({ visible, postType, onClose, onPosted }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [step, setStep] = useState<'compose' | 'camera'>('compose');
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<CapturedMedia[]>([]);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [audience, setAudience] = useState<PostAudience>('followers');
  const [showAudience, setShowAudience] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  const reset = useCallback(() => {
    setStep('compose');
    setCaption('');
    setMedia([]);
    setTags([]);
    setAudience('followers');
    setLocationText('');
    setShowTagSheet(false);
    setPosting(false);
    setProgress(0);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setMedia((prev) => [...prev, { uri: photo.uri, type: 'photo' }]);
        setStep('compose');
      }
    } catch (_) {}
  }, []);

  const openCamera = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStep('camera');
      return;
    }
    if (permission?.granted) {
      setStep('camera');
      return;
    }

    const nextPermission = await requestPermission();
    if (nextPermission.granted) {
      setStep('camera');
    } else {
      Alert.alert('Camera access is off', 'Enable camera access in Settings to attach media.');
    }
  }, [permission?.granted, requestPermission]);

  const chooseMedia = useCallback(async () => {
    const isReel = postType === 'reel';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isReel ? ['videos'] : ['images', 'videos'],
      allowsMultipleSelection: !isReel,
      selectionLimit: isReel ? 1 : 6,
      quality: 0.85,
      videoMaxDuration: 90,
    });
    if (result.canceled) return;

    const selected = result.assets.map((asset): CapturedMedia => ({
      uri: asset.uri,
      type: asset.type === 'video' ? 'video' : 'photo',
    }));
    setMedia((previous) => isReel ? selected.slice(0, 1) : [...previous, ...selected].slice(0, 6));
  }, [postType]);

  const removeMedia = useCallback((idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const toggleTag = useCallback((tag: PostTag) => {
    setTags((prev) => {
      const exists = prev.find((t) => t.type === tag.type && t.value === tag.value);
      return exists ? prev.filter((t) => !(t.type === tag.type && t.value === tag.value)) : [...prev, tag];
    });
  }, []);

  const handlePost = useCallback(async () => {
    if (!user) return;
    if (!caption.trim() && media.length === 0) {
      Alert.alert('Add something', 'Write a caption or add media.');
      return;
    }
    if (postType === 'reel' && !media.some((item) => item.type === 'video')) {
      Alert.alert('Choose a video', 'Reels require a video from your photo library.');
      return;
    }
    setPosting(true);
    setProgress(0.1);

    const allTags: PostTag[] = [...tags];
    if (locationText.trim()) allTags.push({ type: 'location', value: locationText.trim() });

    // Upload media
    const uploadedMedia: Array<{ path: string; type: 'photo' | 'video' }> = [];
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      const { path, error } = await uploadPostMedia(user.id, m.uri, m.type);
      if (error || !path) {
        Alert.alert('Upload failed', error ?? 'Could not upload photo');
        setPosting(false);
        return;
      }
      uploadedMedia.push({ path, type: m.type });
      setProgress(0.1 + 0.7 * ((i + 1) / media.length));
    }

    setProgress(0.85);
    const { error: createError } = await createPost({
      author_id: user.id,
      type: postType,
      caption: caption.trim() || null,
      media: uploadedMedia,
      tags: allTags,
      audience,
    });

    setProgress(1);
    setPosting(false);

    if (createError) {
      Alert.alert('Error', createError);
      return;
    }
    reset();
    onPosted();
  }, [user, caption, media, tags, locationText, audience, postType, reset, onPosted]);

  if (!visible) return null;

  const isReel = postType === 'reel';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* ── CAMERA VIEW ──────────────────────────────────────────────────── */}
        {step === 'camera' && (
          <View style={s.fill}>
            {Platform.OS === 'web' ? (
              <View style={s.permWrap}>
                <Camera color={Colors.textMuted} size={44} strokeWidth={1.5} />
                <Text style={s.permTitle}>Camera not available on web</Text>
                <Text style={s.permBody}>Use a real device or simulator camera/photo picker to attach media.</Text>
                <TouchableOpacity onPress={() => setStep('compose')}>
                  <Text style={s.permSkipTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : !permission?.granted ? (
              <View style={s.permWrap}>
                <Camera color={Colors.textMuted} size={44} strokeWidth={1.5} />
                <Text style={s.permTitle}>Camera access is off</Text>
                <Text style={s.permBody}>Enable camera access in Settings to attach media.</Text>
                <TouchableOpacity onPress={() => setStep('compose')}>
                  <Text style={s.permSkipTxt}>Back to post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView ref={cameraRef} style={s.fill} facing={facing} />
                <TouchableOpacity style={s.camClose} onPress={() => setStep('compose')}>
                  <X color={Colors.white} size={24} />
                </TouchableOpacity>
                <View style={[s.camControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
                  <TouchableOpacity style={s.flipBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}>
                    <FlipHorizontal color={Colors.white} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.captureBtn} onPress={handleCapture} activeOpacity={0.8} />
                  <View style={{ width: 56 }} />
                </View>
              </>
            )}
          </View>
        )}

        {/* ── COMPOSE STEP ─────────────────────────────────────────────────── */}
        {step === 'compose' && (
          <ScrollView style={s.fill} contentContainerStyle={[s.composeContent, { paddingBottom: insets.bottom + 80 }]} keyboardShouldPersistTaps="handled">

            {/* Top bar */}
            <View style={s.topBar}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close post composer"
                onPress={handleClose}
                hitSlop={8}
              >
                <X color={Colors.textPrimary} size={24} />
              </TouchableOpacity>
              <Text style={s.topTitle}>{isReel ? 'New Reel' : 'New Post'}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isReel ? 'Share reel' : 'Publish post'}
                style={[s.postBtn, posting && { opacity: 0.6 }]}
                onPress={handlePost}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={Colors.bg} />
                ) : (
                  <Text style={s.postBtnTxt}>{isReel ? 'Share Reel' : 'Post'}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            {posting && (
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
            )}

            {/* Caption */}
            <View style={s.captionArea}>
              <TextInput
                accessibilityLabel="Post caption"
                style={s.captionInput}
                value={caption}
                onChangeText={setCaption}
                placeholder={isReel ? 'Describe this reel...' : "What's on your mind?"}
                placeholderTextColor={Colors.textDisabled}
                multiline
                maxLength={2200}
              />
            </View>

            {/* Media preview row */}
            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mediaRow}>
                {media.map((m, i) => (
                  <View key={i} style={s.mediaThumb}>
                    {m.type === 'video' ? (
                      <View style={[s.mediaThumbImg, s.videoThumb]}>
                        <Play color={Colors.white} size={24} fill={Colors.white} />
                        <Text style={s.videoThumbText}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: m.uri }} style={s.mediaThumbImg} />
                    )}
                    <TouchableOpacity style={s.mediaRemove} onPress={() => removeMedia(i)}>
                      <Trash2 color={Colors.white} size={14} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Add media buttons */}
            <View style={s.mediaButtons}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isReel ? 'Choose reel video' : 'Choose post media'}
                style={s.addMediaBtn}
                onPress={() => void chooseMedia()}
              >
                <Images color={Colors.primary} size={20} />
                <Text style={s.addMediaTxt}>
                  {isReel ? 'Choose video' : media.length > 0 ? 'Add more' : 'Photo or video'}
                </Text>
              </TouchableOpacity>
              {!isReel && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Take post photo"
                  style={s.addMediaBtn}
                  onPress={openCamera}
                >
                  <Camera color={Colors.primary} size={20} />
                  <Text style={s.addMediaTxt}>Take photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tags section */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Tags</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagRow}>
                {TAG_PRESETS.map((p) => {
                  const active = tags.some((t) => t.type === p.tag.type && t.value === p.tag.value);
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[s.tagChip, active && s.tagChipActive]}
                      onPress={() => toggleTag(p.tag)}
                    >
                      <Text style={[s.tagChipTxt, active && s.tagChipTxtActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Location */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Location</Text>
              <View style={s.locationRow}>
                <MapPin color={Colors.textMuted} size={16} />
                <TextInput
                  style={s.locationInput}
                  value={locationText}
                  onChangeText={setLocationText}
                  placeholder="City or area"
                  placeholderTextColor={Colors.textDisabled}
                  maxLength={60}
                />
              </View>
            </View>

            {/* Audience */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Audience</Text>
              <TouchableOpacity style={s.audienceBtn} onPress={() => setShowAudience((p) => !p)}>
                <Text style={s.audienceTxt}>
                  {AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label ?? 'Followers'}
                </Text>
                <ChevronDown color={Colors.textMuted} size={16} />
              </TouchableOpacity>
              {showAudience && (
                <View style={s.audienceMenu}>
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.audienceOpt, audience === opt.value && s.audienceOptActive]}
                      onPress={() => { setAudience(opt.value); setShowAudience(false); }}
                    >
                      <Text style={s.audienceOptLabel}>{opt.label}</Text>
                      <Text style={s.audienceOptSub}>{opt.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  fill: { flex: 1 },

  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.lg },
  permTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary, textAlign: 'center' },
  permBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center' },
  permBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxxl },
  permBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  permSkipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginTop: Spacing.sm },

  camClose: { position: 'absolute', top: Spacing.xl, left: Spacing.lg },
  camControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  flipBtn: { padding: Spacing.md },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: Colors.white, backgroundColor: 'rgba(255,255,255,0.25)' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  postBtn: { backgroundColor: Colors.primary, borderRadius: Radii.full, paddingHorizontal: Spacing.lg, paddingVertical: 7 },
  postBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },

  progressTrack: { height: 2, backgroundColor: Colors.border },
  progressFill: { height: '100%', backgroundColor: Colors.accent },

  composeContent: { gap: Spacing.xl, paddingTop: Spacing.md },
  captionArea: { paddingHorizontal: Spacing.lg },
  captionInput: { fontFamily: Typography.family.regular, fontSize: Typography.size.md, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },

  mediaRow: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  mediaThumb: { width: 100, height: 100, borderRadius: Radii.md, overflow: 'hidden', position: 'relative' },
  mediaThumbImg: { width: '100%', height: '100%' },
  videoThumb: { backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center', gap: 4 },
  videoThumbText: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },
  mediaRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  mediaButtons: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  addMediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, borderStyle: 'dashed', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  addMediaTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.primary },

  section: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.8 },

  tagRow: { gap: Spacing.sm },
  tagChip: { borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  tagChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  tagChipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  tagChipTxtActive: { color: Colors.primary },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md },
  locationInput: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, paddingVertical: Spacing.sm },

  audienceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  audienceTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.md, color: Colors.textPrimary },
  audienceMenu: { backgroundColor: Colors.elevated, borderRadius: Radii.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  audienceOpt: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  audienceOptActive: { backgroundColor: Colors.surface },
  audienceOptLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  audienceOptSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
});
