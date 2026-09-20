import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keeps hidden screens out of the keyboard's reach on web.
 *
 * React Navigation keeps every visited screen mounted and marks the ones you
 * are not looking at with `aria-hidden="true"`. That is half an answer. A
 * screen reader honours it, but `aria-hidden` says nothing about focus: the
 * buttons underneath keep `tabIndex=0`, so tabbing through the profile screen
 * walks into the home feed's like buttons, one invisible control at a time —
 * 101 of them on a signed-in session. Worse, those screens still take clicks,
 * so the header button you can see is sometimes not the one that gets pressed.
 *
 * `inert` is the attribute that means what `aria-hidden` only implies: no
 * focus, no clicks, no hit testing. Mirroring one onto the other fixes the tab
 * order and the swallowed clicks together, and it stays correct as the
 * navigator adds and removes screens because it is driven by the navigator's
 * own markup rather than by a list of routes kept in step by hand.
 *
 * Native has no DOM and no tab order, so this does nothing there.
 */
export function useInertInactiveScreens(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Only ever touch nodes this hook set, so an `inert` that belongs to a
    // modal or to the framework survives us.
    const MARKER = 'data-inert-hidden-screen';

    const sync = (el: Element) => {
      const hidden = el.getAttribute('aria-hidden') === 'true';
      const owned = el.hasAttribute(MARKER);

      if (hidden && !owned) {
        if (!el.hasAttribute('inert')) {
          el.setAttribute('inert', '');
          el.setAttribute(MARKER, '');
        }
      } else if (!hidden && owned) {
        el.removeAttribute('inert');
        el.removeAttribute(MARKER);
      }
    };

    const syncTree = (root: ParentNode) => {
      if (root instanceof Element) sync(root);
      root.querySelectorAll('[aria-hidden], [' + MARKER + ']').forEach(sync);
    };

    syncTree(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) {
          sync(record.target);
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) syncTree(node);
        });
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-hidden'],
    });

    return () => {
      observer.disconnect();
      document.body.querySelectorAll('[' + MARKER + ']').forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute(MARKER);
      });
    };
  }, []);
}
