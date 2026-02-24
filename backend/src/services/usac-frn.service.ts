import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES
// ================================================================

export interface FRNStatusRecord {
  // Internal fields
  Id?: string;
  PrimaryKey: string;
  FirstSeenAt?: Date;
  LastSeenAt?: Date;
  LastRefreshId?: string;
  UserStatus?: string;
  IsNew?: boolean;

  // Form identification
  ApplicationNumber?: string;
  FundingYear?: string;
  State?: string;
  FormVersion?: string;
  IsCertifiedInWindow?: string;
  Ben?: string;
  OrganizationName?: string;
  CnctEmail?: string;
  CrnData?: string;

  // FRN details
  FundingRequestNumber?: string;
  Form471FrnStatusName?: string;
  Nickname?: string;
  Form471ServiceTypeName?: string;

  // Contract info
  UsacContractId?: string;
  ContractNumber?: string;
  ContractTypeName?: string;
  BidCount?: string;
  IsBasedOnStateMasterContract?: string;
  IsMultipleAward?: string;
  EstablishingForm470?: string;
  Old470Number?: string;
  WasFccForm470Posted?: string;
  AwardDate?: string;
  ExtendedExpirationDate?: string;
  ServiceDeliveryDeadline?: string;

  // Service provider info
  AccountNumber?: string;
  SpinName?: string;
  SpacFiled?: string;
  EpcOrganizationId?: string;

  // Extension info
  HasVoluntaryExtension?: string;
  RemainingExtensionCount?: string;
  TotalRemainingMonthsCount?: string;

  // Pricing & contract restrictions
  PricingConfidentiality?: string;
  EpcContractRestrictionTypeName?: string;
  RestrictionCitation?: string;
  OldFundingRequestNumber?: string;

  // Dates
  ServiceStartDate?: string;
  ContractExpirationDate?: string;

  // Narrative
  Narrative?: string;

  // Costs
  TotalMonthlyRecurringCost?: string;
  TotalMonthlyRecurringIneligibleCosts?: string;
  TotalMonthlyRecurringEligibleCosts?: string;
  MonthsOfService?: string;
  TotalPreDiscountEligibleRecurringCosts?: string;
  TotalOneTimeCosts?: string;
  TotalIneligibleOneTimeCosts?: string;
  TotalPreDiscountEligibleOneTimeCosts?: string;
  TotalPreDiscountCosts?: string;
  DisPct?: string;
  FundingCommitmentRequest?: string;

  // Fiber info
  Form471FrnFiberTypeName?: string;
  Form471FrnFiberSubTypeName?: string;
  IsLease?: string;
  TotalProjPlantRouteFeet?: string;
  AvgCostPerFtOfPlant?: string;
  TotalStrandsQty?: string;
  EligibleStrandsQty?: string;

  // State/Tribe matching
  StateTribeMatchAmt?: string;
  SourceOfMatchingFundsDesc?: string;

  // Financing
  TotalFinancedAmt?: string;
  NumberOfTerms?: string;
  AnnualInterestRate?: string;
  BalloonPaymentDesc?: string;
  ScRate?: string;

  // Status info
  PendingReason?: string;
  OrganizationEntityTypeName?: string;

  // Form 486
  ActualStartDate?: string;
  Form486No?: string;
  F486CaseStatus?: string;
  InvoicingReady?: string;
  LastDateToInvoice?: string;

  // FCDL info
  WaveSequenceNumber?: string;
  FcdlLetterDate?: string;
  UserGeneratedFcdlDate?: string;
  FcdlCommentApp?: string;
  FcdlCommentFrn?: string;
  AppealWaveNumber?: string;
  RevisedFcdlDate?: string;

  // Invoicing
  InvoicingMode?: string;
  TotalAuthorizedDisbursement?: string;
  PostCommitmentRationale?: string;
  RevisedFcdlComment?: string;
}

export interface FRNRefreshResult {
  refreshId: string;
  totalFetched: number;
  totalNew: number;
  totalUpdated: number;
  newKeys: string[];
  error?: string;
}

export interface FRNRefreshHistory {
  Id: string;
  RefreshStartedAt: Date;
  RefreshCompletedAt?: Date;
  Status: string;
  TotalFetched?: number;
  TotalNew?: number;
  TotalUpdated?: number;
  ErrorMessage?: string;
}

// ================================================================
// USAC FRN STATUS SERVICE
// ================================================================

// The full SODA query URL from the user's request
const SODA_BASE_URL = 'https://opendata.usac.org/resource/qdmp-ygft.json';

const TARGET_STATES = ['ID', 'WA', 'OR', 'MT'];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;
const PAGE_SIZE = 1000;

export class USACFRNStatusService {

  /**
   * Generate primary key from record fields
   * Composite key: funding_request_number + form_version
   */
  static generatePrimaryKey(record: any): string {
    const frn = record.funding_request_number || '';
    const formVersion = record.form_version || '';
    return `FRN|${frn}|${formVersion}`;
  }

  /**
   * Map SODA record to database record
   */
  static mapToDbRecord(record: any): Partial<FRNStatusRecord> {
    return {
      PrimaryKey: this.generatePrimaryKey(record),
      ApplicationNumber: record.application_number || null,
      FundingYear: record.funding_year || null,
      State: record.state || null,
      FormVersion: record.form_version || null,
      IsCertifiedInWindow: record.is_certified_in_window || null,
      Ben: record.ben || null,
      OrganizationName: record.organization_name || null,
      CnctEmail: record.cnct_email || null,
      CrnData: record.crn_data || null,
      FundingRequestNumber: record.funding_request_number || null,
      Form471FrnStatusName: record.form_471_frn_status_name || null,
      Nickname: record.nickname || null,
      Form471ServiceTypeName: record.form_471_service_type_name || null,
      UsacContractId: record.usac_contract_id || null,
      ContractNumber: record.contract_number || null,
      ContractTypeName: record.contract_type_name || null,
      BidCount: record.bid_count || null,
      IsBasedOnStateMasterContract: record.is_based_on_state_master_contract || null,
      IsMultipleAward: record.is_multiple_award || null,
      EstablishingForm470: record.establishing_form_470 || null,
      Old470Number: record.old_470_number || null,
      WasFccForm470Posted: record.was_fcc_form_470_posted || null,
      AwardDate: record.award_date || null,
      ExtendedExpirationDate: record.extended_expiration_date || null,
      ServiceDeliveryDeadline: record.service_delivery_deadline || null,
      AccountNumber: record.account_number || null,
      SpinName: record.spin_name || null,
      SpacFiled: record.spac_filed || null,
      EpcOrganizationId: record.epc_organization_id || null,
      HasVoluntaryExtension: record.has_voluntary_extension || null,
      RemainingExtensionCount: record.remaining_extension_count || null,
      TotalRemainingMonthsCount: record.total_remaining_months_count || null,
      PricingConfidentiality: record.pricing_confidentiality || null,
      EpcContractRestrictionTypeName: record.epc_contract_restriction_type_name || null,
      RestrictionCitation: record.restriction_citation || null,
      OldFundingRequestNumber: record.old_funding_request_number || null,
      ServiceStartDate: record.service_start_date || null,
      ContractExpirationDate: record.contract_expiration_date || null,
      Narrative: record.narrative || null,
      TotalMonthlyRecurringCost: record.total_monthly_recurring_cost || null,
      TotalMonthlyRecurringIneligibleCosts: record.total_monthly_recurring_ineligible_costs || null,
      TotalMonthlyRecurringEligibleCosts: record.total_monthly_recurring_eligible_costs || null,
      MonthsOfService: record.months_of_service || null,
      TotalPreDiscountEligibleRecurringCosts: record.total_pre_discount_eligible_recurring_costs || null,
      TotalOneTimeCosts: record.total_one_time_costs || null,
      TotalIneligibleOneTimeCosts: record.total_ineligible_one_time_costs || null,
      TotalPreDiscountEligibleOneTimeCosts: record.total_pre_discount_eligible_one_time_costs || null,
      TotalPreDiscountCosts: record.total_pre_discount_costs || null,
      DisPct: record.dis_pct || null,
      FundingCommitmentRequest: record.funding_commitment_request || null,
      Form471FrnFiberTypeName: record.form_471_frn_fiber_type_name || null,
      Form471FrnFiberSubTypeName: record.form_471_frn_fiber_sub_type_name || null,
      IsLease: record.is_lease || null,
      TotalProjPlantRouteFeet: record.total_proj_plant_route_feet || null,
      AvgCostPerFtOfPlant: record.avg_cost_per_ft_of_plant || null,
      TotalStrandsQty: record.total_strands_qty || null,
      EligibleStrandsQty: record.eligible_strands_qty || null,
      StateTribeMatchAmt: record.state_tribe_match_amt || null,
      SourceOfMatchingFundsDesc: record.source_of_matching_funds_desc || null,
      TotalFinancedAmt: record.total_financed_amt || null,
      NumberOfTerms: record.number_of_terms || null,
      AnnualInterestRate: record.annual_interest_rate || null,
      BalloonPaymentDesc: record.balloon_payment_desc || null,
      ScRate: record.sc_rate || null,
      PendingReason: record.pending_reason || null,
      OrganizationEntityTypeName: record.organization_entity_type_name || null,
      ActualStartDate: record.actual_start_date || null,
      Form486No: record.form_486_no || null,
      F486CaseStatus: record.f486_case_status || null,
      InvoicingReady: record.invoicing_ready || null,
      LastDateToInvoice: record.last_date_to_invoice || null,
      WaveSequenceNumber: record.wave_sequence_number || null,
      FcdlLetterDate: record.fcdl_letter_date || null,
      UserGeneratedFcdlDate: record.user_generated_fcdl_date || null,
      FcdlCommentApp: record.fcdl_comment_app || null,
      FcdlCommentFrn: record.fcdl_comment_frn || null,
      AppealWaveNumber: record.appeal_wave_number || null,
      RevisedFcdlDate: record.revised_fcdl_date || null,
      InvoicingMode: record.invoicing_mode || null,
      TotalAuthorizedDisbursement: record.total_authorized_disbursement || null,
      PostCommitmentRationale: record.post_commitment_rationale || null,
      RevisedFcdlComment: record.revised_fcdl_comment || null,
    };
  }

  /**
   * Get all existing primary keys from database
   */
  static async getExistingPrimaryKeys(): Promise<Set<string>> {
    const results = await executeQuery<{ PrimaryKey: string }>(
      `SELECT PrimaryKey FROM dbo.ERateFRNStatus`,
      {}
    );
    return new Set(results.map(r => r.PrimaryKey));
  }

  /**
   * Create a new refresh history record
   */
  static async createRefreshHistory(): Promise<string> {
    const id = uuidv4();
    await executeQuery(
      `INSERT INTO dbo.ERateFRNRefreshHistory (Id, RefreshStartedAt, Status)
       VALUES (@id, GETUTCDATE(), 'InProgress')`,
      { id }
    );
    return id;
  }

  /**
   * Complete a refresh history record
   */
  static async completeRefreshHistory(
    id: string,
    status: 'Completed' | 'Failed',
    totalFetched: number,
    totalNew: number,
    totalUpdated: number,
    errorMessage?: string
  ): Promise<void> {
    await executeQuery(
      `UPDATE dbo.ERateFRNRefreshHistory
       SET RefreshCompletedAt = GETUTCDATE(),
           Status = @status,
           TotalFetched = @totalFetched,
           TotalNew = @totalNew,
           TotalUpdated = @totalUpdated,
           ErrorMessage = @errorMessage
       WHERE Id = @id`,
      { id, status, totalFetched, totalNew, totalUpdated, errorMessage }
    );
  }

  /**
   * Fast upsert using pre-loaded existing keys
   */
  static async upsertRecordFast(record: Partial<FRNStatusRecord>, refreshId: string, existingKeys: Set<string>): Promise<boolean> {
    const isNew = !existingKeys.has(record.PrimaryKey!);

    if (isNew) {
      const id = uuidv4();
      await executeQuery(
        `INSERT INTO dbo.ERateFRNStatus (
          Id, PrimaryKey, FirstSeenAt, LastSeenAt, LastRefreshId,
          ApplicationNumber, FundingYear, State, FormVersion, IsCertifiedInWindow,
          Ben, OrganizationName, CnctEmail, CrnData,
          FundingRequestNumber, Form471FrnStatusName, Nickname, Form471ServiceTypeName,
          UsacContractId, ContractNumber, ContractTypeName, BidCount,
          IsBasedOnStateMasterContract, IsMultipleAward, EstablishingForm470,
          Old470Number, WasFccForm470Posted, AwardDate, ExtendedExpirationDate, ServiceDeliveryDeadline,
          AccountNumber, SpinName, SpacFiled, EpcOrganizationId,
          HasVoluntaryExtension, RemainingExtensionCount, TotalRemainingMonthsCount,
          PricingConfidentiality, EpcContractRestrictionTypeName, RestrictionCitation, OldFundingRequestNumber,
          ServiceStartDate, ContractExpirationDate, Narrative,
          TotalMonthlyRecurringCost, TotalMonthlyRecurringIneligibleCosts, TotalMonthlyRecurringEligibleCosts,
          MonthsOfService, TotalPreDiscountEligibleRecurringCosts,
          TotalOneTimeCosts, TotalIneligibleOneTimeCosts, TotalPreDiscountEligibleOneTimeCosts,
          TotalPreDiscountCosts, DisPct, FundingCommitmentRequest,
          Form471FrnFiberTypeName, Form471FrnFiberSubTypeName, IsLease,
          TotalProjPlantRouteFeet, AvgCostPerFtOfPlant, TotalStrandsQty, EligibleStrandsQty,
          StateTribeMatchAmt, SourceOfMatchingFundsDesc,
          TotalFinancedAmt, NumberOfTerms, AnnualInterestRate, BalloonPaymentDesc, ScRate,
          PendingReason, OrganizationEntityTypeName,
          ActualStartDate, Form486No, F486CaseStatus, InvoicingReady, LastDateToInvoice,
          WaveSequenceNumber, FcdlLetterDate, UserGeneratedFcdlDate, FcdlCommentApp, FcdlCommentFrn,
          AppealWaveNumber, RevisedFcdlDate,
          InvoicingMode, TotalAuthorizedDisbursement, PostCommitmentRationale, RevisedFcdlComment
        ) VALUES (
          @id, @primaryKey, GETUTCDATE(), GETUTCDATE(), @refreshId,
          @applicationNumber, @fundingYear, @state, @formVersion, @isCertifiedInWindow,
          @ben, @organizationName, @cnctEmail, @crnData,
          @fundingRequestNumber, @form471FrnStatusName, @nickname, @form471ServiceTypeName,
          @usacContractId, @contractNumber, @contractTypeName, @bidCount,
          @isBasedOnStateMasterContract, @isMultipleAward, @establishingForm470,
          @old470Number, @wasFccForm470Posted, @awardDate, @extendedExpirationDate, @serviceDeliveryDeadline,
          @accountNumber, @spinName, @spacFiled, @epcOrganizationId,
          @hasVoluntaryExtension, @remainingExtensionCount, @totalRemainingMonthsCount,
          @pricingConfidentiality, @epcContractRestrictionTypeName, @restrictionCitation, @oldFundingRequestNumber,
          @serviceStartDate, @contractExpirationDate, @narrative,
          @totalMonthlyRecurringCost, @totalMonthlyRecurringIneligibleCosts, @totalMonthlyRecurringEligibleCosts,
          @monthsOfService, @totalPreDiscountEligibleRecurringCosts,
          @totalOneTimeCosts, @totalIneligibleOneTimeCosts, @totalPreDiscountEligibleOneTimeCosts,
          @totalPreDiscountCosts, @disPct, @fundingCommitmentRequest,
          @form471FrnFiberTypeName, @form471FrnFiberSubTypeName, @isLease,
          @totalProjPlantRouteFeet, @avgCostPerFtOfPlant, @totalStrandsQty, @eligibleStrandsQty,
          @stateTribeMatchAmt, @sourceOfMatchingFundsDesc,
          @totalFinancedAmt, @numberOfTerms, @annualInterestRate, @balloonPaymentDesc, @scRate,
          @pendingReason, @organizationEntityTypeName,
          @actualStartDate, @form486No, @f486CaseStatus, @invoicingReady, @lastDateToInvoice,
          @waveSequenceNumber, @fcdlLetterDate, @userGeneratedFcdlDate, @fcdlCommentApp, @fcdlCommentFrn,
          @appealWaveNumber, @revisedFcdlDate,
          @invoicingMode, @totalAuthorizedDisbursement, @postCommitmentRationale, @revisedFcdlComment
        )`,
        this.buildParams(record, id, refreshId)
      );
      existingKeys.add(record.PrimaryKey!);
    } else {
      // Update existing record with key fields
      await executeQuery(
        `UPDATE dbo.ERateFRNStatus SET
          LastSeenAt = GETUTCDATE(),
          LastRefreshId = @refreshId,
          Form471FrnStatusName = @form471FrnStatusName,
          Form471ServiceTypeName = @form471ServiceTypeName,
          SpinName = @spinName,
          OrganizationName = @organizationName,
          FundingCommitmentRequest = @fundingCommitmentRequest,
          DisPct = @disPct,
          TotalPreDiscountCosts = @totalPreDiscountCosts,
          F486CaseStatus = @f486CaseStatus,
          InvoicingReady = @invoicingReady,
          TotalAuthorizedDisbursement = @totalAuthorizedDisbursement,
          PendingReason = @pendingReason
        WHERE PrimaryKey = @primaryKey`,
        {
          refreshId,
          primaryKey: record.PrimaryKey,
          form471FrnStatusName: record.Form471FrnStatusName,
          form471ServiceTypeName: record.Form471ServiceTypeName,
          spinName: record.SpinName,
          organizationName: record.OrganizationName,
          fundingCommitmentRequest: record.FundingCommitmentRequest,
          disPct: record.DisPct,
          totalPreDiscountCosts: record.TotalPreDiscountCosts,
          f486CaseStatus: record.F486CaseStatus,
          invoicingReady: record.InvoicingReady,
          totalAuthorizedDisbursement: record.TotalAuthorizedDisbursement,
          pendingReason: record.PendingReason,
        }
      );
    }

    return isNew;
  }

  /**
   * Build parameters for INSERT query
   */
  private static buildParams(record: Partial<FRNStatusRecord>, id: string, refreshId: string): Record<string, any> {
    return {
      id,
      refreshId,
      primaryKey: record.PrimaryKey,
      applicationNumber: record.ApplicationNumber,
      fundingYear: record.FundingYear,
      state: record.State,
      formVersion: record.FormVersion,
      isCertifiedInWindow: record.IsCertifiedInWindow,
      ben: record.Ben,
      organizationName: record.OrganizationName,
      cnctEmail: record.CnctEmail,
      crnData: record.CrnData,
      fundingRequestNumber: record.FundingRequestNumber,
      form471FrnStatusName: record.Form471FrnStatusName,
      nickname: record.Nickname,
      form471ServiceTypeName: record.Form471ServiceTypeName,
      usacContractId: record.UsacContractId,
      contractNumber: record.ContractNumber,
      contractTypeName: record.ContractTypeName,
      bidCount: record.BidCount,
      isBasedOnStateMasterContract: record.IsBasedOnStateMasterContract,
      isMultipleAward: record.IsMultipleAward,
      establishingForm470: record.EstablishingForm470,
      old470Number: record.Old470Number,
      wasFccForm470Posted: record.WasFccForm470Posted,
      awardDate: record.AwardDate,
      extendedExpirationDate: record.ExtendedExpirationDate,
      serviceDeliveryDeadline: record.ServiceDeliveryDeadline,
      accountNumber: record.AccountNumber,
      spinName: record.SpinName,
      spacFiled: record.SpacFiled,
      epcOrganizationId: record.EpcOrganizationId,
      hasVoluntaryExtension: record.HasVoluntaryExtension,
      remainingExtensionCount: record.RemainingExtensionCount,
      totalRemainingMonthsCount: record.TotalRemainingMonthsCount,
      pricingConfidentiality: record.PricingConfidentiality,
      epcContractRestrictionTypeName: record.EpcContractRestrictionTypeName,
      restrictionCitation: record.RestrictionCitation,
      oldFundingRequestNumber: record.OldFundingRequestNumber,
      serviceStartDate: record.ServiceStartDate,
      contractExpirationDate: record.ContractExpirationDate,
      narrative: record.Narrative,
      totalMonthlyRecurringCost: record.TotalMonthlyRecurringCost,
      totalMonthlyRecurringIneligibleCosts: record.TotalMonthlyRecurringIneligibleCosts,
      totalMonthlyRecurringEligibleCosts: record.TotalMonthlyRecurringEligibleCosts,
      monthsOfService: record.MonthsOfService,
      totalPreDiscountEligibleRecurringCosts: record.TotalPreDiscountEligibleRecurringCosts,
      totalOneTimeCosts: record.TotalOneTimeCosts,
      totalIneligibleOneTimeCosts: record.TotalIneligibleOneTimeCosts,
      totalPreDiscountEligibleOneTimeCosts: record.TotalPreDiscountEligibleOneTimeCosts,
      totalPreDiscountCosts: record.TotalPreDiscountCosts,
      disPct: record.DisPct,
      fundingCommitmentRequest: record.FundingCommitmentRequest,
      form471FrnFiberTypeName: record.Form471FrnFiberTypeName,
      form471FrnFiberSubTypeName: record.Form471FrnFiberSubTypeName,
      isLease: record.IsLease,
      totalProjPlantRouteFeet: record.TotalProjPlantRouteFeet,
      avgCostPerFtOfPlant: record.AvgCostPerFtOfPlant,
      totalStrandsQty: record.TotalStrandsQty,
      eligibleStrandsQty: record.EligibleStrandsQty,
      stateTribeMatchAmt: record.StateTribeMatchAmt,
      sourceOfMatchingFundsDesc: record.SourceOfMatchingFundsDesc,
      totalFinancedAmt: record.TotalFinancedAmt,
      numberOfTerms: record.NumberOfTerms,
      annualInterestRate: record.AnnualInterestRate,
      balloonPaymentDesc: record.BalloonPaymentDesc,
      scRate: record.ScRate,
      pendingReason: record.PendingReason,
      organizationEntityTypeName: record.OrganizationEntityTypeName,
      actualStartDate: record.ActualStartDate,
      form486No: record.Form486No,
      f486CaseStatus: record.F486CaseStatus,
      invoicingReady: record.InvoicingReady,
      lastDateToInvoice: record.LastDateToInvoice,
      waveSequenceNumber: record.WaveSequenceNumber,
      fcdlLetterDate: record.FcdlLetterDate,
      userGeneratedFcdlDate: record.UserGeneratedFcdlDate,
      fcdlCommentApp: record.FcdlCommentApp,
      fcdlCommentFrn: record.FcdlCommentFrn,
      appealWaveNumber: record.AppealWaveNumber,
      revisedFcdlDate: record.RevisedFcdlDate,
      invoicingMode: record.InvoicingMode,
      totalAuthorizedDisbursement: record.TotalAuthorizedDisbursement,
      postCommitmentRationale: record.PostCommitmentRationale,
      revisedFcdlComment: record.RevisedFcdlComment,
    };
  }

  /**
   * Progress callback type for SSE streaming
   */
  static progressCallback: ((event: { phase: string; current: number; total: number; message: string }) => void) | null = null;

  /**
   * Download updates from SODA API and sync to database
   * Includes error resilience — individual record failures are skipped
   */
  static async downloadUpdates(): Promise<FRNRefreshResult> {
    const refreshId = await this.createRefreshHistory();
    const newKeys: string[] = [];
    let totalFetched = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const errorSamples: string[] = [];

    try {
      // Phase 1: Fetch from SODA API
      this.emitProgress('fetching', 0, 0, 'Connecting to USAC SODA API...');
      const records = await this.fetchFromSODAWithProgress();
      totalFetched = records.length;

      // Phase 2: Load existing keys
      this.emitProgress('processing', 0, totalFetched, 'Loading existing records from database...');
      console.log('[USAC-FRN] Loading existing primary keys...');
      const existingKeys = await this.getExistingPrimaryKeys();
      console.log(`[USAC-FRN] Found ${existingKeys.size} existing records`);

      // Phase 3: Process records with error resilience
      let processed = 0;
      const batchSize = 100;

      for (const rawRecord of records) {
        try {
          const dbRecord = this.mapToDbRecord(rawRecord);
          const isNew = await this.upsertRecordFast(dbRecord, refreshId, existingKeys);

          if (isNew) {
            totalNew++;
            newKeys.push(dbRecord.PrimaryKey!);
          } else {
            totalUpdated++;
          }
        } catch (recordError: any) {
          totalErrors++;
          if (errorSamples.length < 5) {
            const frn = rawRecord.funding_request_number || 'unknown';
            errorSamples.push(`FRN ${frn}: ${recordError.message?.substring(0, 100)}`);
          }
          if (totalErrors <= 3) {
            console.warn(`[USAC-FRN] Skipping record ${rawRecord.funding_request_number || '?'}: ${recordError.message}`);
          }
        }

        processed++;
        if (processed % batchSize === 0) {
          console.log(`[USAC-FRN] Processed ${processed}/${totalFetched} records (${totalNew} new, ${totalErrors} errors)...`);
          this.emitProgress('processing', processed, totalFetched, `Processing records: ${processed}/${totalFetched} (${totalNew} new)`);
        }
      }

      const hasErrors = totalErrors > 0;
      const status = hasErrors ? 'Completed' : 'Completed';
      const errorMsg = hasErrors ? `${totalErrors} records failed: ${errorSamples.join('; ')}` : undefined;

      await this.completeRefreshHistory(refreshId, status, totalFetched, totalNew, totalUpdated, errorMsg);
      console.log(`[USAC-FRN] Refresh complete: ${totalFetched} fetched, ${totalNew} new, ${totalUpdated} updated, ${totalErrors} errors`);

      this.emitProgress('complete', totalFetched, totalFetched, `Complete: ${totalNew} new, ${totalUpdated} updated${hasErrors ? `, ${totalErrors} errors` : ''}`);

      return {
        refreshId, totalFetched, totalNew, totalUpdated, newKeys,
        ...(hasErrors ? { error: `${totalErrors} records skipped due to errors` } : {})
      };
    } catch (error: any) {
      console.error('[USAC-FRN] Download failed:', error);
      await this.completeRefreshHistory(refreshId, 'Failed', totalFetched, totalNew, totalUpdated, error.message);
      this.emitProgress('error', 0, 0, `Download failed: ${error.message}`);
      return { refreshId, totalFetched, totalNew, totalUpdated, newKeys, error: error.message };
    }
  }

  /**
   * Emit progress event if callback is registered
   */
  private static emitProgress(phase: string, current: number, total: number, message: string): void {
    if (this.progressCallback) {
      try {
        this.progressCallback({ phase, current, total, message });
      } catch (e) {
        // Ignore callback errors
      }
    }
  }

  /**
   * Fetch from SODA with progress reporting
   */
  private static async fetchFromSODAWithProgress(): Promise<any[]> {
    const allRecords: any[] = [];
    const appToken = process.env.USAC_SODA_APP_TOKEN;

    console.log('[USAC-FRN] Starting SODA fetch for FRN Status...');

    const columns = [
      'application_number', 'funding_year', 'state', 'form_version',
      'is_certified_in_window', 'ben', 'organization_name', 'cnct_email', 'crn_data',
      'funding_request_number', 'form_471_frn_status_name', 'nickname', 'form_471_service_type_name',
      'usac_contract_id', 'contract_number', 'contract_type_name', 'bid_count',
      'is_based_on_state_master_contract', 'is_multiple_award', 'establishing_form_470',
      'old_470_number', 'was_fcc_form_470_posted', 'award_date', 'extended_expiration_date',
      'service_delivery_deadline', 'account_number', 'spin_name', 'spac_filed',
      'epc_organization_id', 'has_voluntary_extension', 'remaining_extension_count',
      'total_remaining_months_count', 'pricing_confidentiality', 'epc_contract_restriction_type_name',
      'restriction_citation', 'old_funding_request_number', 'service_start_date',
      'contract_expiration_date', 'narrative', 'total_monthly_recurring_cost',
      'total_monthly_recurring_ineligible_costs', 'total_monthly_recurring_eligible_costs',
      'months_of_service', 'total_pre_discount_eligible_recurring_costs', 'total_one_time_costs',
      'total_ineligible_one_time_costs', 'total_pre_discount_eligible_one_time_costs',
      'total_pre_discount_costs', 'dis_pct', 'funding_commitment_request',
      'form_471_frn_fiber_type_name', 'form_471_frn_fiber_sub_type_name', 'is_lease',
      'total_proj_plant_route_feet', 'avg_cost_per_ft_of_plant', 'total_strands_qty',
      'eligible_strands_qty', 'state_tribe_match_amt', 'source_of_matching_funds_desc',
      'total_financed_amt', 'number_of_terms', 'annual_interest_rate', 'balloon_payment_desc',
      'sc_rate', 'pending_reason', 'organization_entity_type_name', 'actual_start_date',
      'form_486_no', 'f486_case_status', 'invoicing_ready', 'last_date_to_invoice',
      'wave_sequence_number', 'fcdl_letter_date', 'user_generated_fcdl_date',
      'fcdl_comment_app', 'fcdl_comment_frn', 'appeal_wave_number', 'revised_fcdl_date',
      'invoicing_mode', 'total_authorized_disbursement', 'post_commitment_rationale',
      'revised_fcdl_comment'
    ];

    const selectClause = columns.map(c => `\`${c}\``).join(', ');
    const stateValues = TARGET_STATES.map(s => `"${s}"`).join(', ');
    const whereClause = `caseless_one_of(\`state\`, ${stateValues})`;

    let offset = 0;
    let hasMore = true;
    let pageNum = 0;

    while (hasMore) {
      let retries = 0;
      let success = false;
      let lastError: Error | null = null;

      while (retries < MAX_RETRIES && !success) {
        try {
          const query = `SELECT ${selectClause} WHERE ${whereClause} LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
          const params = new URLSearchParams();
          params.append('$query', query);

          const url = `${SODA_BASE_URL}?${params.toString()}`;

          const headers: Record<string, string> = {
            'Accept': 'application/json',
          };
          if (appToken) {
            headers['X-App-Token'] = appToken;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          const response = await fetch(url, {
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.log(`[USAC-FRN] Rate limited, waiting ${retryAfter}s...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            retries++;
            continue;
          }

          if (response.status >= 500) {
            console.log(`[USAC-FRN] Server error ${response.status}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries)));
            retries++;
            continue;
          }

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`SODA API error: ${response.status} ${response.statusText} - ${body}`);
          }

          const data = await response.json();

          if (!Array.isArray(data)) {
            throw new Error('SODA API returned non-array response');
          }

          pageNum++;
          console.log(`[USAC-FRN] Fetched ${data.length} records at offset ${offset}`);
          this.emitProgress('fetching', allRecords.length + data.length, 0, `Fetching from USAC: ${allRecords.length + data.length} records (page ${pageNum})...`);
          allRecords.push(...data);

          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            offset += PAGE_SIZE;
          }

          success = true;

        } catch (error: any) {
          lastError = error;
          if (error.name === 'AbortError') {
            console.log(`[USAC-FRN] Request timeout, retrying...`);
          } else {
            console.error(`[USAC-FRN] Fetch error:`, error.message);
          }
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries)));
          }
        }
      }

      if (!success) {
        throw lastError || new Error('Failed to fetch SODA FRN data after retries');
      }

      if (offset > 200000) {
        console.warn('[USAC-FRN] Safety limit reached at 200k records');
        break;
      }
    }

    console.log(`[USAC-FRN] Total FRN records fetched: ${allRecords.length}`);
    this.emitProgress('fetching', allRecords.length, allRecords.length, `Fetched ${allRecords.length} records from USAC`);
    return allRecords;
  }

  /**
   * Update the user status on a record
   */
  static async updateUserStatus(id: string, userStatus: string | null): Promise<boolean> {
    await executeQuery(
      `UPDATE dbo.ERateFRNStatus SET UserStatus = @userStatus WHERE Id = @id`,
      { id, userStatus }
    );
    return true;
  }

  /**
   * Get all FRN Status records with optional new record highlighting
   */
  static async getAll(lastRefreshId?: string): Promise<FRNStatusRecord[]> {
    let query = `
      SELECT
        Id, PrimaryKey, FirstSeenAt, LastSeenAt, LastRefreshId, UserStatus,
        ApplicationNumber, FundingYear, State, FormVersion, IsCertifiedInWindow,
        Ben, OrganizationName, CnctEmail, CrnData,
        FundingRequestNumber, Form471FrnStatusName, Nickname, Form471ServiceTypeName,
        UsacContractId, ContractNumber, ContractTypeName, BidCount,
        IsBasedOnStateMasterContract, IsMultipleAward, EstablishingForm470,
        Old470Number, WasFccForm470Posted, AwardDate, ExtendedExpirationDate, ServiceDeliveryDeadline,
        AccountNumber, SpinName, SpacFiled, EpcOrganizationId,
        HasVoluntaryExtension, RemainingExtensionCount, TotalRemainingMonthsCount,
        PricingConfidentiality, EpcContractRestrictionTypeName, RestrictionCitation, OldFundingRequestNumber,
        ServiceStartDate, ContractExpirationDate, Narrative,
        TotalMonthlyRecurringCost, TotalMonthlyRecurringIneligibleCosts, TotalMonthlyRecurringEligibleCosts,
        MonthsOfService, TotalPreDiscountEligibleRecurringCosts,
        TotalOneTimeCosts, TotalIneligibleOneTimeCosts, TotalPreDiscountEligibleOneTimeCosts,
        TotalPreDiscountCosts, DisPct, FundingCommitmentRequest,
        Form471FrnFiberTypeName, Form471FrnFiberSubTypeName, IsLease,
        TotalProjPlantRouteFeet, AvgCostPerFtOfPlant, TotalStrandsQty, EligibleStrandsQty,
        StateTribeMatchAmt, SourceOfMatchingFundsDesc,
        TotalFinancedAmt, NumberOfTerms, AnnualInterestRate, BalloonPaymentDesc, ScRate,
        PendingReason, OrganizationEntityTypeName,
        ActualStartDate, Form486No, F486CaseStatus, InvoicingReady, LastDateToInvoice,
        WaveSequenceNumber, FcdlLetterDate, UserGeneratedFcdlDate, FcdlCommentApp, FcdlCommentFrn,
        AppealWaveNumber, RevisedFcdlDate,
        InvoicingMode, TotalAuthorizedDisbursement, PostCommitmentRationale, RevisedFcdlComment
    `;

    if (lastRefreshId) {
      query += `,
        CASE WHEN LastRefreshId = @lastRefreshId AND FirstSeenAt = LastSeenAt THEN 1 ELSE 0 END AS IsNew`;
    }

    query += `
      FROM dbo.ERateFRNStatus
      ORDER BY FundingRequestNumber DESC
    `;

    const results = await executeQuery<FRNStatusRecord>(query, { lastRefreshId });
    return results;
  }

  /**
   * Get the latest refresh history
   */
  static async getLatestRefresh(): Promise<FRNRefreshHistory | null> {
    const results = await executeQuery<FRNRefreshHistory>(
      `SELECT TOP 1 Id, RefreshStartedAt, RefreshCompletedAt, Status, TotalFetched, TotalNew, TotalUpdated, ErrorMessage
       FROM dbo.ERateFRNRefreshHistory
       WHERE Status = 'Completed'
       ORDER BY RefreshStartedAt DESC`,
      {}
    );
    return results[0] || null;
  }

  /**
   * Get refresh history
   */
  static async getRefreshHistory(limit: number = 10): Promise<FRNRefreshHistory[]> {
    return await executeQuery<FRNRefreshHistory>(
      `SELECT TOP (@limit) Id, RefreshStartedAt, RefreshCompletedAt, Status, TotalFetched, TotalNew, TotalUpdated, ErrorMessage
       FROM dbo.ERateFRNRefreshHistory
       ORDER BY RefreshStartedAt DESC`,
      { limit }
    );
  }
}
