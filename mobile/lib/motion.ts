import { Platform } from 'react-native';

/**
 * Whether `Animated` may hand an animation to the native driver.
 *
 * There is no native animated module in a browser, so every
 * `useNativeDriver: true` on web produces this, once per animation, forever:
 *
 *     Animated: `useNativeDriver` is not supported because the native animated
 *     module is missing. Falling back to JS-based animation.
 *
 * The fallback it describes is exactly what we want on web — the animation
 * still runs, on the JS thread, which is the only thread there is. So the
 * warning reports a correct outcome and asks for nothing, which is the worst
 * kind: it trains everyone reading the console to skim past warnings, and the
 * next one will be real.
 *
 * Passing this constant says the same thing to `Animated` without being told
 * about it sixty-five times. On iOS and Android nothing changes.
 *
 * It is not a blanket answer — `useNativeDriver: false` is still required for
 * anything animating a layout or colour property (width, borderColor, and the
 * score ring's stroke), and those stay written out as `false` so the reason is
 * visible where it applies rather than hidden behind a name.
 */
export const NATIVE_DRIVER = Platform.OS !== 'web';
