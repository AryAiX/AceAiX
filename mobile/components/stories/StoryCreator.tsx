import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Camera,
  Type,
  Smile,
  Send,
  ChevronDown,
  Check,
  FlipHorizontal,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  createStory,
  StoryAudience,
  StoryOverlay,
  uploadStoryMedia,
} from '@/lib/storiesService';

const { width: SW, height: SH } = Dimensions.get('window');

const STICKER_OPTIONS = [
  { label: 'Open to Trials', value: 'open_to_trials', emoji: '🎯' },
  { label: 'Match Day', value: 'match_day', emoji: '⚽' },
  { label: 'Training', value: 'training', emoji: '💪' },
  { label: 'New PB', value: 'new_pb', emoji: '🏆' },
  { label: 'Recovery Day', value: 'recovery', emoji: '🧘' },
  { label: 'Team Win', value: 'team_win', emoji: '🎉' },
];

const AUDIENCE_OPTIONS: { value: StoryAudience; label: string; sub: string }[] = [
  { value: 'connections', label: 'Connections', sub: 'People you follow' },
  { value: 'followers', label: 'Followers', sub: 'Everyone following you' },
  { value: 'public', label: 'Public', sub: 'Anyone on AceAiX' },
];

const TEXT_COLORS = [
  Colors.white,
  Colors.accent,
  Colors.primary,
  Colors.error,
  Colors.warning,
  Colors.success,
];

type CreatorStep = 'camera' | 'preview' | 'edit';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
}

export function StoryCreator({ visible, onClose, onPosted }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [step, setStep] = useState<CreatorStep>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [audience, setAudience] = useState<StoryAudience>('connections');
  const [showAudience, setShowAudience] = useState(false);
  const [showTextTool, setShowTextTool] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState(Colors.white);
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const requestedCameraPermission = useRef(false);

  useEffect(() => {
    if (!visible) {
      requestedCameraPermission.current = false;
      return;
    }
    if (
      Platform.OS === 'web' ||
      permission?.granted ||
      permission?.canAskAgain === false ||
      requestedCameraPermission.current
    ) {
      return;
    }
    requestedCameraPermission.current = true;
    requestPermission();
  }, [visible, permission?.granted, permission?.canAskAgain, requestPermission]);

  const reset = useCallback(() => {
    setStep('camera');
    setCapturedUri(null);
    setCaption('');
    setOverlays([]);
    setAudience('connections');
    setShowTextTool(false);
    setTextInput('');
    setShowStickers(false);
    setUploading(false);
    setUploadProgress(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setStep('preview');
      }
    } catch (e) {
      // camera error — silently fail on web
    }
  }, []);

  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;
    setOverlays((prev) => [
      ...prev,
      { type: 'text', value: textInput.trim(), color: textColor },
    ]);
    setTextInput('');
    setShowTextTool(false);
  }, [textInput, textColor]);

  const handleAddSticker = useCallback((sticker: typeof STICKER_OPTIONS[0]) => {
    setOverlays((prev) => [
      ...prev,
      { type: 'sticker', value: sticker.value },
    ]);
    setShowStickers(false);
  }, []);

  const handlePost = useCallback(async () => {
    if (!capturedUri || !user) return;
    setUploading(true);
    setUploadProgress(0.1);

    const { path, error: uploadError } = await uploadStoryMedia(user.id, capturedUri, 'photo');
    setUploadProgress(0.7);
    if (uploadError || !path) {
      setUploading(false);
      Alert.alert('Upload failed', uploadError ?? 'Could not upload photo');
      return;
    }

    const { error: createError } = await createStory({
      author_id: user.id,
      media_path: path,
      media_type: 'photo',
      caption: caption.trim() || null,
      overlays,
      audience,
    });
    setUploadProgress(1);
    setUploading(false);

    if (createError) {
      Alert.alert('Error', createError);
      return;
    }

    reset();
    onPosted();
  }, [capturedUri, user, caption, overlays, audience, reset, onPosted]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* ── STEP: CAMERA ───────────────────────────────────────────────────── */}
        {step === 'camera' && (
          <View style={s.fill}>
            {Platform.OS === 'web' ? (
              <View style={s.permWrap}>
                <Camera color={Colors.textMuted} size={48} strokeWidth={1.5} />
                <Text style={s.permTitle}>Camera not available</Text>
                <Text style={s.permBody}>Live camera is not supported in the web preview. Use a real device or simulator camera/photo picker to create a story.</Text>
                <TouchableOpacity style={s.permSkip} onPress={handleClose}>
                  <Text style={s.permSkipTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : !permission ? (
              <View style={s.permWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={s.permTitle}>Preparing camera</Text>
              </View>
            ) : !permission.granted ? (
              <View style={s.permWrap}>
                <Camera color={Colors.textMuted} size={48} strokeWidth={1.5} />
                <Text style={s.permTitle}>Camera access is off</Text>
                <Text style={s.permBody}>Enable camera access in Settings to capture stories.</Text>
                <TouchableOpacity style={s.permSkip} onPress={handleClose}>
                  <Text style={s.permSkipTxt}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.fill}>
                <CameraView ref={cameraRef} style={s.fill} facing={facing} />
                {/* Controls */}
                <View style={[s.camControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
                  <TouchableOpacity style={s.camClose} onPress={handleClose}>
                    <X color={Colors.white} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.captureBtn} onPress={handleCapture} activeOpacity={0.8} />
                  <TouchableOpacity
                    style={s.flipBtn}
                    onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  >
                    <FlipHorizontal color={Colors.white} size={24} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── STEP: PREVIEW + EDIT ───────────────────────────────────────────── */}
        {(step === 'preview' || step === 'edit') && capturedUri && (
          <View style={s.fill}>
            {/* Media preview */}
            <View style={s.previewBg}>
              <Image source={{ uri: capturedUri }} style={s.fill} resizeMode="cover" />

              {/* Overlays rendered on top */}
              <View style={s.overlayContainer} pointerEvents="none">
                {overlays.map((ov, i) => (
                  <View key={i} style={s.overlayItem}>
                    {ov.type === 'text' ? (
                      <View style={s.textOverlay}>
                        <Text style={[s.textOverlayTxt, { color: ov.color ?? Colors.white }]}>
                          {ov.value}
                        </Text>
                      </View>
                    ) : (
                      <View style={s.stickerOverlay}>
                        <Text style={s.stickerEmoji}>
                          {STICKER_OPTIONS.find((st) => st.value === ov.value)?.emoji ?? '🏅'}
                        </Text>
                        <Text style={s.stickerLabel}>
                          {STICKER_OPTIONS.find((st) => st.value === ov.value)?.label ?? ov.value}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Top bar */}
            <View style={[s.previewTop, { top: 0 }]}>
              <TouchableOpacity onPress={() => { setCapturedUri(null); setStep('camera'); reset(); setStep('camera'); }} hitSlop={8}>
                <X color={Colors.white} size={24} />
              </TouchableOpacity>
              <View style={s.topTools}>
                <TouchableOpacity style={s.toolBtn} onPress={() => setShowTextTool((p) => !p)}>
                  <Type color={Colors.white} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={s.toolBtn} onPress={() => setShowStickers((p) => !p)}>
                  <Smile color={Colors.white} size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Text tool overlay */}
            {showTextTool && (
              <View style={s.textTool}>
                <View style={s.colorRow}>
                  {TEXT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setTextColor(c)}
                      style={[s.colorDot, { backgroundColor: c }, textColor === c && s.colorDotActive]}
                    />
                  ))}
                </View>
                <View style={s.textInputRow}>
                  <TextInput
                    style={[s.textInputField, { color: textColor }]}
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder="Add text..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddText}
                  />
                  <TouchableOpacity onPress={handleAddText} style={s.addTextBtn}>
                    <Check color={Colors.white} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Sticker sheet */}
            {showStickers && (
              <View style={s.stickerSheet}>
                <Text style={s.stickerSheetTitle}>Add a sticker</Text>
                <View style={s.stickerGrid}>
                  {STICKER_OPTIONS.map((st) => (
                    <TouchableOpacity
                      key={st.value}
                      style={s.stickerOption}
                      onPress={() => handleAddSticker(st)}
                    >
                      <Text style={s.stickerOptionEmoji}>{st.emoji}</Text>
                      <Text style={s.stickerOptionLabel}>{st.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.stickerClose} onPress={() => setShowStickers(false)}>
                  <X color={Colors.textMuted} size={20} />
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom: caption + audience + post */}
            <View style={[s.previewBottom, { paddingBottom: insets.bottom + Spacing.md }]}>
              <TextInput
                style={s.captionInput}
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                maxLength={150}
              />

              {/* Audience picker */}
              <TouchableOpacity
                style={s.audienceBtn}
                onPress={() => setShowAudience((p) => !p)}
                activeOpacity={0.8}
              >
                <Text style={s.audienceTxt}>
                  {AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label ?? 'Connections'}
                </Text>
                <ChevronDown color={Colors.white} size={14} />
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

              <TouchableOpacity
                style={[s.postBtn, uploading && { opacity: 0.7 }]}
                onPress={handlePost}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <View style={s.postBtnInner}>
                    <ActivityIndicator color={Colors.bg} size="small" />
                    <Text style={s.postBtnTxt}>Uploading {Math.round(uploadProgress * 100)}%</Text>
                  </View>
                ) : (
                  <View style={s.postBtnInner}>
                    <Send color={Colors.bg} size={18} />
                    <Text style={s.postBtnTxt}>Share Story</Text>
                  </View>
                )}
              </TouchableOpacity>

              {uploading && (
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${uploadProgress * 100}%` as any }]} />
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  fill: { flex: 1 },

  // Permission / web fallback
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.lg },
  permTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary, textAlign: 'center' },
  permBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxxl, marginTop: Spacing.md },
  permBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  permSkip: { marginTop: Spacing.sm },
  permSkipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },

  // Camera
  camControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
  },
  camClose: { padding: Spacing.md },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  flipBtn: { padding: Spacing.md },

  // Preview
  previewBg: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.bg },
  overlayContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  overlayItem: { alignItems: 'center' },
  textOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  textOverlayTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl },
  stickerOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radii.md, padding: Spacing.sm },
  stickerEmoji: { fontSize: 28 },
  stickerLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.white },

  previewTop: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topTools: { flexDirection: 'row', gap: Spacing.md },
  toolBtn: { padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: Radii.full },

  textTool: {
    position: 'absolute', left: 0, right: 0, bottom: 200,
    paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  colorDotActive: { borderWidth: 2.5, borderColor: Colors.white, transform: [{ scale: 1.2 }] },
  textInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radii.md, paddingHorizontal: Spacing.md },
  textInputField: { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.size.lg, paddingVertical: Spacing.md },
  addTextBtn: { padding: Spacing.sm },

  stickerSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Spacing.xl, paddingBottom: Spacing.xxxl,
  },
  stickerSheetTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, marginBottom: Spacing.lg },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  stickerOption: { width: 100, alignItems: 'center', backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, gap: 4 },
  stickerOptionEmoji: { fontSize: 28 },
  stickerOptionLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textPrimary, textAlign: 'center' },
  stickerClose: { position: 'absolute', top: Spacing.lg, right: Spacing.xl },

  previewBottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: Spacing.lg, gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: Spacing.lg,
  },
  captionInput: {
    fontFamily: Typography.family.regular, fontSize: Typography.size.sm,
    color: Colors.white, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)',
    paddingVertical: Spacing.sm, maxHeight: 80,
  },
  audienceBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 4 },
  audienceTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  audienceMenu: { backgroundColor: Colors.surface, borderRadius: Radii.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  audienceOpt: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  audienceOptActive: { backgroundColor: Colors.elevated },
  audienceOptLabel: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  audienceOptSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  postBtn: {
    backgroundColor: Colors.accent, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  postBtnInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  postBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.bg },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent },
});
