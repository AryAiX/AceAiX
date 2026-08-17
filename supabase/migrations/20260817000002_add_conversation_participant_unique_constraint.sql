ALTER POLICY msg_insert ON messages
WITH CHECK (
  (sender_id = auth.uid())
  AND private.in_conversation(conversation_id)
  AND NOT EXISTS (
    SELECT 1 FROM conversations c
    JOIN user_blocks b ON (
      (b.blocker_id = c.participant_1_id AND b.blocked_id = c.participant_2_id)
      OR (b.blocker_id = c.participant_2_id AND b.blocked_id = c.participant_1_id)
    )
    WHERE c.id = conversation_id
  )
);