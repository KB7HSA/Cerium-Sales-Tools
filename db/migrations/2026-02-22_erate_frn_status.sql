-- ================================================================
-- Migration: Create E-Rate FRN Status tables
-- Date: 2026-02-22
-- Purpose: Store FRN (Funding Request Number) status data from USAC Form 471
-- ================================================================

-- FRN Status records table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateFRNStatus')
BEGIN
    CREATE TABLE dbo.ERateFRNStatus (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PrimaryKey NVARCHAR(200) NOT NULL,
        FirstSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        LastRefreshId UNIQUEIDENTIFIER NULL,
        UserStatus NVARCHAR(50) NULL,

        -- Form identification
        ApplicationNumber NVARCHAR(50) NULL,
        FundingYear NVARCHAR(10) NULL,
        State NVARCHAR(10) NULL,
        FormVersion NVARCHAR(20) NULL,
        IsCertifiedInWindow NVARCHAR(20) NULL,
        Ben NVARCHAR(50) NULL,
        OrganizationName NVARCHAR(500) NULL,
        CnctEmail NVARCHAR(500) NULL,
        CrnData NVARCHAR(MAX) NULL,

        -- FRN details
        FundingRequestNumber NVARCHAR(50) NULL,
        Form471FrnStatusName NVARCHAR(100) NULL,
        Nickname NVARCHAR(500) NULL,
        Form471ServiceTypeName NVARCHAR(200) NULL,

        -- Contract info
        UsacContractId NVARCHAR(100) NULL,
        ContractNumber NVARCHAR(200) NULL,
        ContractTypeName NVARCHAR(200) NULL,
        BidCount NVARCHAR(20) NULL,
        IsBasedOnStateMasterContract NVARCHAR(20) NULL,
        IsMultipleAward NVARCHAR(20) NULL,
        EstablishingForm470 NVARCHAR(50) NULL,
        Old470Number NVARCHAR(50) NULL,
        WasFccForm470Posted NVARCHAR(20) NULL,
        AwardDate NVARCHAR(50) NULL,
        ExtendedExpirationDate NVARCHAR(50) NULL,
        ServiceDeliveryDeadline NVARCHAR(50) NULL,

        -- Service provider info
        AccountNumber NVARCHAR(100) NULL,
        SpinName NVARCHAR(500) NULL,
        SpacFiled NVARCHAR(20) NULL,
        EpcOrganizationId NVARCHAR(100) NULL,

        -- Extension info
        HasVoluntaryExtension NVARCHAR(20) NULL,
        RemainingExtensionCount NVARCHAR(20) NULL,
        TotalRemainingMonthsCount NVARCHAR(20) NULL,

        -- Pricing & contract restrictions
        PricingConfidentiality NVARCHAR(100) NULL,
        EpcContractRestrictionTypeName NVARCHAR(200) NULL,
        RestrictionCitation NVARCHAR(MAX) NULL,
        OldFundingRequestNumber NVARCHAR(50) NULL,

        -- Dates
        ServiceStartDate NVARCHAR(50) NULL,
        ContractExpirationDate NVARCHAR(50) NULL,

        -- Narrative
        Narrative NVARCHAR(MAX) NULL,

        -- Costs
        TotalMonthlyRecurringCost NVARCHAR(50) NULL,
        TotalMonthlyRecurringIneligibleCosts NVARCHAR(50) NULL,
        TotalMonthlyRecurringEligibleCosts NVARCHAR(50) NULL,
        MonthsOfService NVARCHAR(20) NULL,
        TotalPreDiscountEligibleRecurringCosts NVARCHAR(50) NULL,
        TotalOneTimeCosts NVARCHAR(50) NULL,
        TotalIneligibleOneTimeCosts NVARCHAR(50) NULL,
        TotalPreDiscountEligibleOneTimeCosts NVARCHAR(50) NULL,
        TotalPreDiscountCosts NVARCHAR(50) NULL,
        DisPct NVARCHAR(20) NULL,
        FundingCommitmentRequest NVARCHAR(50) NULL,

        -- Fiber info
        Form471FrnFiberTypeName NVARCHAR(200) NULL,
        Form471FrnFiberSubTypeName NVARCHAR(200) NULL,
        IsLease NVARCHAR(20) NULL,
        TotalProjPlantRouteFeet NVARCHAR(50) NULL,
        AvgCostPerFtOfPlant NVARCHAR(50) NULL,
        TotalStrandsQty NVARCHAR(50) NULL,
        EligibleStrandsQty NVARCHAR(50) NULL,

        -- State/Tribe matching
        StateTribeMatchAmt NVARCHAR(50) NULL,
        SourceOfMatchingFundsDesc NVARCHAR(MAX) NULL,

        -- Financing
        TotalFinancedAmt NVARCHAR(50) NULL,
        NumberOfTerms NVARCHAR(20) NULL,
        AnnualInterestRate NVARCHAR(20) NULL,
        BalloonPaymentDesc NVARCHAR(MAX) NULL,
        ScRate NVARCHAR(20) NULL,

        -- Status info
        PendingReason NVARCHAR(500) NULL,
        OrganizationEntityTypeName NVARCHAR(200) NULL,

        -- Form 486
        ActualStartDate NVARCHAR(50) NULL,
        Form486No NVARCHAR(50) NULL,
        F486CaseStatus NVARCHAR(100) NULL,
        InvoicingReady NVARCHAR(20) NULL,
        LastDateToInvoice NVARCHAR(50) NULL,

        -- FCDL info
        WaveSequenceNumber NVARCHAR(50) NULL,
        FcdlLetterDate NVARCHAR(50) NULL,
        UserGeneratedFcdlDate NVARCHAR(50) NULL,
        FcdlCommentApp NVARCHAR(MAX) NULL,
        FcdlCommentFrn NVARCHAR(MAX) NULL,
        AppealWaveNumber NVARCHAR(50) NULL,
        RevisedFcdlDate NVARCHAR(50) NULL,

        -- Invoicing
        InvoicingMode NVARCHAR(100) NULL,
        TotalAuthorizedDisbursement NVARCHAR(50) NULL,
        PostCommitmentRationale NVARCHAR(MAX) NULL,
        RevisedFcdlComment NVARCHAR(MAX) NULL
    );

    CREATE UNIQUE NONCLUSTERED INDEX IX_ERateFRNStatus_PrimaryKey ON dbo.ERateFRNStatus (PrimaryKey);
    CREATE NONCLUSTERED INDEX IX_ERateFRNStatus_State ON dbo.ERateFRNStatus (State);
    CREATE NONCLUSTERED INDEX IX_ERateFRNStatus_FundingYear ON dbo.ERateFRNStatus (FundingYear);
    CREATE NONCLUSTERED INDEX IX_ERateFRNStatus_SpinName ON dbo.ERateFRNStatus (SpinName);
    CREATE NONCLUSTERED INDEX IX_ERateFRNStatus_Form471FrnStatusName ON dbo.ERateFRNStatus (Form471FrnStatusName);
    CREATE NONCLUSTERED INDEX IX_ERateFRNStatus_LastRefreshId ON dbo.ERateFRNStatus (LastRefreshId);

    PRINT 'Created ERateFRNStatus table with indexes';
END
ELSE
BEGIN
    PRINT 'ERateFRNStatus table already exists';
END
GO

-- FRN Refresh History table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateFRNRefreshHistory')
BEGIN
    CREATE TABLE dbo.ERateFRNRefreshHistory (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RefreshStartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        RefreshCompletedAt DATETIME2 NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'InProgress',
        TotalFetched INT NULL,
        TotalNew INT NULL,
        TotalUpdated INT NULL,
        ErrorMessage NVARCHAR(MAX) NULL
    );

    CREATE NONCLUSTERED INDEX IX_ERateFRNRefreshHistory_Status ON dbo.ERateFRNRefreshHistory (Status);
    CREATE NONCLUSTERED INDEX IX_ERateFRNRefreshHistory_RefreshStartedAt ON dbo.ERateFRNRefreshHistory (RefreshStartedAt DESC);

    PRINT 'Created ERateFRNRefreshHistory table with indexes';
END
ELSE
BEGIN
    PRINT 'ERateFRNRefreshHistory table already exists';
END
GO
