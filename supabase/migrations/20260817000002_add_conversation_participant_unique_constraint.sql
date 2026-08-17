ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS participant_pair_key text
GENERATED ALWAYS AS (
  least(participant_1_id, participant_2_id)::text || '_' || greatest(participant_1_id, participant_2_id)::text
) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_participant_pair_unique
ON conversations (participant_pair_key);