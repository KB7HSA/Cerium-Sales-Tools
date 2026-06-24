-- Add AITemperature column to AssessmentTypes table
-- Controls the temperature parameter sent to Azure OpenAI for each assessment type
-- Default 0.7 (balanced creativity). Range: 0.0 (deterministic) to 2.0 (most creative)
-- Note: Reasoning models (o1, o3, o4-mini) do not support temperature — it will be ignored for those models.

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AssessmentTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.AssessmentTypes') AND name = 'AITemperature'
    )
    BEGIN
        ALTER TABLE dbo.AssessmentTypes
        ADD AITemperature FLOAT NULL DEFAULT 0.7;
        PRINT 'Added AITemperature column to AssessmentTypes';
    END

    UPDATE dbo.AssessmentTypes SET AITemperature = 0.7 WHERE AITemperature IS NULL;
END
ELSE
BEGIN
    PRINT 'AssessmentTypes table not found — skipping AITemperature migration.';
END
GO
