-- Add AITemperature column to AssessmentTypes table
-- Controls the temperature parameter sent to Azure OpenAI for each assessment type
-- Default 0.7 (balanced creativity). Range: 0.0 (deterministic) to 2.0 (most creative)
-- Note: Reasoning models (o1, o3, o4-mini) do not support temperature — it will be ignored for those models.

ALTER TABLE dbo.AssessmentTypes
ADD AITemperature FLOAT NULL DEFAULT 0.7;

-- Backfill existing rows
UPDATE dbo.AssessmentTypes SET AITemperature = 0.7 WHERE AITemperature IS NULL;
