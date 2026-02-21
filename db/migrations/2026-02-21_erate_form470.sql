-- E-Rate Form 470 Opportunities Schema
-- Migration: 2026-02-21_erate_form470.sql

-- Create table for storing USAC Form 470 data
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateForm470')
BEGIN
    CREATE TABLE dbo.ERateForm470 (
        -- Internal fields
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PrimaryKey NVARCHAR(200) NOT NULL, -- Composite key: application_number + service_request_id + form_version
        FirstSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        LastRefreshId UNIQUEIDENTIFIER NULL, -- Track which refresh added/updated this record
        
        -- Form identification
        ApplicationNumber NVARCHAR(50) NULL,
        FormNickname NVARCHAR(500) NULL,
        FormPdf NVARCHAR(MAX) NULL, -- JSON object with url
        ServiceRequestId NVARCHAR(50) NULL,
        ServiceRequestRfpAttachment NVARCHAR(MAX) NULL,
        RfpDocuments NVARCHAR(MAX) NULL, -- JSON object with url
        RfpUploadDate NVARCHAR(50) NULL,
        FormVersion NVARCHAR(20) NULL,
        FundingYear NVARCHAR(10) NULL,
        Fcc470Status NVARCHAR(100) NULL,
        AllowableContractDate NVARCHAR(50) NULL,
        CertifiedDateTime NVARCHAR(50) NULL,
        LastModifiedDateTime NVARCHAR(50) NULL,
        
        -- Billed Entity info
        BilledEntityNumber NVARCHAR(50) NULL,
        BilledEntityName NVARCHAR(500) NULL,
        ApplicantType NVARCHAR(200) NULL,
        WebsiteUrl NVARCHAR(1000) NULL,
        BenFccRegistrationNumber NVARCHAR(100) NULL,
        BenAddress1 NVARCHAR(500) NULL,
        BenAddress2 NVARCHAR(500) NULL,
        BilledEntityCity NVARCHAR(200) NULL,
        BilledEntityState NVARCHAR(10) NULL,
        BilledEntityZip NVARCHAR(20) NULL,
        BilledEntityZipExt NVARCHAR(10) NULL,
        BilledEntityEmail NVARCHAR(500) NULL,
        BilledEntityPhone NVARCHAR(50) NULL,
        BilledEntityPhoneExt NVARCHAR(20) NULL,
        NumberOfEligibleEntities INT NULL,
        
        -- Contact info
        ContactName NVARCHAR(500) NULL,
        ContactAddress1 NVARCHAR(500) NULL,
        ContactAddress2 NVARCHAR(500) NULL,
        ContactCity NVARCHAR(200) NULL,
        ContactState NVARCHAR(10) NULL,
        ContactZip NVARCHAR(20) NULL,
        ContactZipExt NVARCHAR(10) NULL,
        ContactPhone NVARCHAR(50) NULL,
        ContactPhoneExt NVARCHAR(20) NULL,
        ContactEmail NVARCHAR(500) NULL,
        
        -- Technical Contact
        TechnicalContactName NVARCHAR(500) NULL,
        TechnicalContactTitle NVARCHAR(200) NULL,
        TechnicalContactPhone NVARCHAR(50) NULL,
        TechnicalContactPhoneExt NVARCHAR(20) NULL,
        TechnicalContactEmail NVARCHAR(500) NULL,
        
        -- Authorized Person
        AuthorizedPersonName NVARCHAR(500) NULL,
        AuthorizedPersonAddress NVARCHAR(500) NULL,
        AuthorizedPersonCity NVARCHAR(200) NULL,
        AuthorizedPersonState NVARCHAR(10) NULL,
        AuthorizedPersonZip NVARCHAR(20) NULL,
        AuthorizedPersonZipExt NVARCHAR(10) NULL,
        AuthorizedPersonPhone NVARCHAR(50) NULL,
        AuthorizedPersonPhoneExt NVARCHAR(20) NULL,
        AuthorizedPersonEmail NVARCHAR(500) NULL,
        AuthorizedPersonTitle NVARCHAR(200) NULL,
        AuthorizedPersonEmployer NVARCHAR(500) NULL,
        
        -- Consulting/Additional info
        ConsultingFirmData NVARCHAR(MAX) NULL,
        CategoryOneDescription NVARCHAR(MAX) NULL,
        CategoryTwoDescription NVARCHAR(MAX) NULL,
        InstallmentType NVARCHAR(100) NULL,
        InstallmentMinRangeYears NVARCHAR(20) NULL,
        InstallmentMaxRangeYears NVARCHAR(20) NULL,
        RfpIdentifier NVARCHAR(200) NULL,
        StateOrLocalRestrictions NVARCHAR(MAX) NULL,
        StateOrLocalRestrictions1 NVARCHAR(MAX) NULL,
        StatewideState NVARCHAR(10) NULL,
        AllPublicSchoolsDistricts NVARCHAR(100) NULL,
        AllNonPublicSchools NVARCHAR(100) NULL,
        AllLibraries NVARCHAR(100) NULL,
        
        -- Service details
        ServiceCategory NVARCHAR(200) NULL,
        ServiceType NVARCHAR(500) NULL,
        [Function] NVARCHAR(500) NULL,
        OtherFunction NVARCHAR(500) NULL,
        Entities NVARCHAR(MAX) NULL,
        Quantity NVARCHAR(100) NULL,
        Unit NVARCHAR(100) NULL,
        MinimumCapacity NVARCHAR(100) NULL,
        MaximumCapacity NVARCHAR(100) NULL,
        InstallationInitial NVARCHAR(100) NULL,
        MaintenanceTechnicalSupport NVARCHAR(100) NULL,
        Manufacturer NVARCHAR(500) NULL,
        OtherManufacturer NVARCHAR(500) NULL,
        
        -- Indexes
        INDEX IX_ERateForm470_PrimaryKey UNIQUE NONCLUSTERED (PrimaryKey),
        INDEX IX_ERateForm470_BilledEntityState NONCLUSTERED (BilledEntityState),
        INDEX IX_ERateForm470_FundingYear NONCLUSTERED (FundingYear),
        INDEX IX_ERateForm470_AllowableContractDate NONCLUSTERED (AllowableContractDate),
        INDEX IX_ERateForm470_LastRefreshId NONCLUSTERED (LastRefreshId)
    );
    
    PRINT 'Created table dbo.ERateForm470';
END
GO

-- Create table for tracking refresh history
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateRefreshHistory')
BEGIN
    CREATE TABLE dbo.ERateRefreshHistory (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RefreshStartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        RefreshCompletedAt DATETIME2 NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'InProgress', -- InProgress, Completed, Failed
        TotalFetched INT NULL,
        TotalNew INT NULL,
        TotalUpdated INT NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        
        INDEX IX_ERateRefreshHistory_Status NONCLUSTERED (Status),
        INDEX IX_ERateRefreshHistory_RefreshStartedAt NONCLUSTERED (RefreshStartedAt DESC)
    );
    
    PRINT 'Created table dbo.ERateRefreshHistory';
END
GO
