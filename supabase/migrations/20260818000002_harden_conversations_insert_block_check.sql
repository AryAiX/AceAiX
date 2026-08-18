ALTER POLICY conv_insert ON conversations
WITH CHECK (
  ((participant_1_id = auth.uid()) OR (participant_2_id = auth.uid()))
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id = participant_1_id AND b.blocked_id = participant_2_id)
       OR (b.blocker_id = participant_2_id AND b.blocked_id = participant_1_id)
  )
);