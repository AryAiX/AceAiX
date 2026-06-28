// No-op stub for react-native-reanimated.
// Prevents react-native-worklets-core from loading in Expo Go,
// where the native worklets version may not match the JS version.

const Animated = require('react-native').Animated;

module.exports = {
  default: Animated,
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: (fn) => ({}),
  useAnimatedProps: (fn) => ({}),
  useAnimatedScrollHandler: () => () => {},
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: () => {},
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedGestureHandler: () => () => {},
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDecay: (v) => v,
  withRepeat: (v) => v,
  withSequence: (...args) => args[args.length - 1],
  withDelay: (_, v) => v,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  Easing: require('react-native').Easing,
  interpolate: (v, input, output) => v,
  interpolateColor: (v, input, output) => output[0],
  createAnimatedComponent: (Component) => Component,
  FadeIn: {},
  FadeOut: {},
  SlideInRight: {},
  SlideOutLeft: {},
  ZoomIn: {},
  ZoomOut: {},
};
