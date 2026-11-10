import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Sizes that hold on every phone: the dock and the + scale a little with the
 * screen width, within limits, and the dock stops growing on a tablet.
 */
export function useDockMetrics() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const side = Math.round(Math.min(20, Math.max(12, width * 0.035)));
  const height = width < 360 ? 60 : 66;
  /* The + is a capsule as tall as the dock and about two-thirds as wide, so
     the dock itself gets the room it gives up. */
  const plus = height;
  const plusW = Math.round(height * 0.68);
  const gap = 8;
  /* On a phone with a home bar the dock sits a little into the safe area,
     so it does not float too high; on one without, it keeps a margin. */
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - 10, 12) : 12;
  const maxRow = 560;
  /* How far the dock reaches up over the page, which runs clear under it. */
  const overlap = 6 + height + bottom;
  return { side, height, plus, plusW, gap, bottom, maxRow, overlap };
}

/**
 * How much of a tab screen the floating dock covers at the bottom. Zero on
 * screens outside the tabs. A tab screen's scrolling content pads its end by
 * this much so the last thing on it can scroll clear of the dock.
 */
export const DockInsetContext = createContext(0);

/** The empty space left between the end of a tab screen and the dock. */
export const DOCK_END_SPACE = 180;

export function useDockInset(): number {
  return useContext(DockInsetContext);
}

/**
 * The space to leave after the last thing in a scrolling list: the dock's
 * height plus a comfortable margin on a tab screen, so the end of a page
 * has room to breathe above the dock; a plain margin elsewhere.
 */
export function useEndPadding(): number {
  const dock = useDockInset();
  return dock ? dock + DOCK_END_SPACE : 56;
}
