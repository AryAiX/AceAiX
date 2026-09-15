import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from, select, or, eq, maybeSingle, insert } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const or = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ or, eq }));
  const insert = vi.fn();
  const from = vi.fn(() => ({ select, insert }));
  return {
    rpc: vi.fn(),
    from,
    select,
    or,
    eq,
    maybeSingle,
    insert,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { rpc, from },
}));

import {
  canMessageUser,
  getOrCreateConversation,
  messagePermissionReason,
  sendMessage,
} from './messaging';

describe('message permissions', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockClear();
    select.mockClear();
    or.mockClear();
    eq.mockClear();
    maybeSingle.mockReset();
    insert.mockClear();
  });

  it('calls the permission RPC with the recipient', async () => {
    rpc.mockResolvedValue({ data: { allowed: true }, error: null });

    await expect(canMessageUser('recipient-1')).resolves.toEqual({
      allowed: true,
      reason: null,
    });
    expect(rpc).toHaveBeenCalledWith('can_message_user', {
      p_recipient: 'recipient-1',
    });
  });

  it('preserves known denial reasons and safely defaults unknown responses', async () => {
    rpc
      .mockResolvedValueOnce({
        data: { allowed: false, reason: 'minor_requires_guardian_consent' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { allowed: false, reason: 'future_reason' },
        error: null,
      });

    await expect(canMessageUser('minor')).resolves.toEqual({
      allowed: false,
      reason: 'minor_requires_guardian_consent',
    });
    await expect(canMessageUser('other')).resolves.toEqual({
      allowed: false,
      reason: 'not_permitted',
    });
  });

  it('maps youth-safety and privacy denials to clear copy', () => {
    expect(messagePermissionReason('minor_requires_verified_sender'))
      .toBe('Only verified adults can message this young person.');
    expect(messagePermissionReason('minor_requires_guardian_consent'))
      .toBe('Messaging is unavailable until this young person has guardian approval.');
    expect(messagePermissionReason('recipient_messages_off'))
      .toBe('This person has turned off new messages.');
    expect(messagePermissionReason('recipient_only_accepts_followed'))
      .toBe('This person only accepts messages from people they follow.');
  });

  it('rejects a new conversation before attempting its insert', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({
      data: { allowed: false, reason: 'recipient_messages_off' },
      error: null,
    });

    await expect(getOrCreateConversation('sender', 'recipient'))
      .rejects.toThrow('This person has turned off new messages.');
    expect(insert).not.toHaveBeenCalled();
  });

  it('rechecks permission before sending into an existing conversation', async () => {
    maybeSingle.mockResolvedValue({
      data: { participant_1_id: 'sender', participant_2_id: 'minor' },
      error: null,
    });
    rpc.mockResolvedValue({
      data: { allowed: false, reason: 'minor_requires_guardian_consent' },
      error: null,
    });

    await expect(sendMessage('conversation-1', 'sender', 'Hello'))
      .rejects.toThrow('Messaging is unavailable until this young person has guardian approval.');
    expect(insert).not.toHaveBeenCalled();
  });
});
