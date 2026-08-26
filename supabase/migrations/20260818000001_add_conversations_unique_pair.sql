CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_pair_idx
ON conversations (LEAST(participant_1_id, participant_2_id), GREATEST(participant_1_id, participant_2_id));