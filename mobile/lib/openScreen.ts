/**
 * Which screen is in front, as plain values.
 *
 * The notification banner decides from these getters at the moment a row
 * arrives (and again just before it is shown). React state captured inside
 * the realtime callback is already stale by then — that is how a banner for
 * the thread you are reading used to appear on top of it.
 */

let openConversation: string | null = null;
let currentPath = '';
let claim = 0;

/**
 * The conversation id the focused chat screen is subscribed to, or null.
 *
 * Setting an id returns a claim. Clearing with that claim does nothing if a
 * newer screen has already taken over — otherwise the chat you just left
 * wipes the chat you just opened, and its banner shows on top of the thread.
 * Clearing with no claim always clears.
 */
export function setOpenConversation(id: string | null, token?: number): number {
  if (id) {
    claim += 1;
    openConversation = id;
    return claim;
  }
  if (token === undefined || token === claim) {
    openConversation = null;
  }
  return claim;
}

export function getOpenConversation(): string | null {
  return openConversation;
}

export function setCurrentPath(path: string): void {
  currentPath = path ?? '';
}

export function getCurrentPath(): string {
  return currentPath;
}
