import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

/** What a FlatList offers for going back to the top. */
interface ListLike {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

/** What a ScrollView offers. */
interface ScrollLike {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
}

/** Anything this hook can send back to the top: a FlatList or a ScrollView. */
export type TabScrollable = ListLike | ScrollLike;

/**
 * The two parts of a tab screen's navigation object this hook needs.
 *
 * `useNavigation()` is typed for the events every navigator has. `tabPress`
 * belongs to the tab navigator, so it is named here — expo-router's own
 * `useScrollToTop` does the same.
 */
interface TabScreenNavigation {
  isFocused: () => boolean;
  addListener: (event: 'tabPress', listener: () => void) => () => void;
}

/**
 * Tap the tab you are already on: back to the top, then reload.
 *
 * The tab bar already answers a re-tap by bumping the icon (`onTabPress` in
 * `app/(tabs)/_layout.tsx`); this makes the screen answer too, the way every
 * feed app does. `tabPress` arrives before the navigator acts, so
 * `isFocused()` still describes the tab you were on — true only for a re-tap.
 * Every visited tab stays mounted and keeps its listener, which is why the
 * check matters.
 *
 * Returns a callback ref: put it on the list with `ref={…}`. Several lists
 * that are never on screen together can share it. With no list mounted (an
 * error state), the scroll is skipped and `onReselect` still runs. The latest
 * `onReselect` is always the one called, so an inline function is fine.
 */
export function useTabReselect(onReselect?: () => void): (node: TabScrollable | null) => void {
  const navigation = useNavigation() as unknown as TabScreenNavigation;
  const node = useRef<TabScrollable | null>(null);
  const latest = useRef(onReselect);
  latest.current = onReselect;

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      const current = node.current;
      if (current) {
        if ('scrollToOffset' in current) current.scrollToOffset({ offset: 0, animated: true });
        else current.scrollTo({ y: 0, animated: true });
      }
      latest.current?.();
    });
  }, [navigation]);

  return useCallback((next: TabScrollable | null) => {
    node.current = next;
  }, []);
}
