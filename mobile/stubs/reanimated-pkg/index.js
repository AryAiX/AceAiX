const { Animated, Easing } = require('react-native');

module.exports = {
  default: Animated,
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  useAnimatedGestureHandler: () => ({}),
  useAnimatedScrollHandler: () => ({}),
  useAnimatedRef: () => ({ current: null }),
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedReaction: () => {},
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDelay: (_d, v) => v,
  withSequence: (..._args) => 0,
  withRepeat: (v) => v,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (v, input, output) => {
    if (input.length < 2) return output[0] || 0;
    const idx = input.findIndex((x) => v <= x);
    if (idx <= 0) return output[0];
    if (idx === -1) return output[output.length - 1];
    const t = (v - input[idx - 1]) / (input[idx] - input[idx - 1]);
    return output[idx - 1] + t * (output[idx] - output[idx - 1]);
  },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing,
  Animated,
  FadeIn: {},
  FadeOut: {},
  SlideInRight: {},
  SlideOutLeft: {},
  Layout: {},
  createAnimatedComponent: (C) => C,
};
