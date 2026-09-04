import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Is the person asking us to keep still?
 *
 * Every animation in the app consults this. "Reduce motion" is not "no
 * feedback" — the rule we follow is that a motion-reduced build still tells you
 * what changed, it just tells you instantly or with a fade instead of moving
 * something across the screen.
 *
 * The last known answer is cached at module scope so a card scrolling into view
 * never gets one frame of animation before the async read comes back.
 */
let cached = false;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(cached);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        cached = value;
        if (alive) setReduced(value);
      })
      .catch(() => {
        /* platform can't tell us — assume motion is welcome */
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value: boolean) => {
        cached = value;
        if (alive) setReduced(value);
      },
    );

    return () => {
      alive = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
