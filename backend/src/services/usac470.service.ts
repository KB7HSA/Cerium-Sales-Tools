import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES
// ================================================================

export interface Form470Record {
  // Internal fields
  Id?: string;
  PrimaryKey: string;
  FirstSeenAt?: Date;
  LastSeenAt?: Date;
  LastRefreshId?: string;
  UserStatus?: string; // User-defined status: Bypassed, Responded, In Process, etc.
  IsNew?: boolean; // Transient UI field
  
  // Form identification
  ApplicationNumber?: string;
  FormNickname?: string;
  FormPdf?: string; // JSON string
  ServiceRequestId?: string;
  ServiceRequestRfpAttachment?: string;
  RfpDocuments?: string; // JSON string
  RfpUploadDate?: string;
  FormVersion?: string;
  FundingYear?: string;
  Fcc470Status?: string;
  AllowableContractDate?: string;
  CertifiedDateTime?: string;
  LastModifiedDateTime?: string;
  
  // Billed Entity info
  BilledEntityNumber?: string;
  BilledEntityName?: string;
  ApplicantType?: string;
  WebsiteUrl?: string;
  BenFccRegistrationNumber?: string;
  BenAddress1?: string;
  BenAddress2?: string;
  BilledEntityCity?: string;
  BilledEntityState?: string;
  BilledEntityZip?: string;
  BilledEntityZipExt?: string;
  BilledEntityEmail?: string;
  BilledEntityPhone?: string;
  BilledEntityPhoneExt?: string;
  NumberOfEligibleEntities?: number;
  
  // Contact info
  ContactName?: string;
  ContactAddress1?: string;
  ContactAddress2?: string;
  ContactCity?: string;
  ContactState?: string;
  ContactZip?: string;
  ContactZipExt?: string;
  ContactPhone?: string;
  ContactPhoneExt?: string;
  ContactEmail?: string;
  
  // Technical Contact
  TechnicalContactName?: string;
  TechnicalContactTitle?: string;
  TechnicalContactPhone?: string;
  TechnicalContactPhoneExt?: string;
  TechnicalContactEmail?: string;
  
  // Authorized Person
  AuthorizedPersonName?: string;
  AuthorizedPersonAddress?: string;
  AuthorizedPersonCity?: string;
  AuthorizedPersonState?: string;
  AuthorizedPersonZip?: string;
  AuthorizedPersonZipExt?: string;
  AuthorizedPersonPhone?: string;
  AuthorizedPersonPhoneExt?: string;
  AuthorizedPersonEmail?: string;
  AuthorizedPersonTitle?: string;
  AuthorizedPersonEmployer?: string;
  
  // Consulting/Additional info
  ConsultingFirmData?: string;
  CategoryOneDescription?: string;
  CategoryTwoDescription?: string;
  InstallmentType?: string;
  InstallmentMinRangeYears?: string;
  InstallmentMaxRangeYears?: string;
  RfpIdentifier?: string;
  StateOrLocalRestrictions?: string;
  StateOrLocalRestrictions1?: string;
  StatewideState?: string;
  AllPublicSchoolsDistricts?: string;
  AllNonPublicSchools?: string;
  AllLibraries?: string;
  
  // Service details
  ServiceCategory?: string;
  ServiceType?: string;
  Function?: string;
  OtherFunction?: string;
  Entities?: string;
  Quantity?: string;
  Unit?: string;
  MinimumCapacity?: string;
  MaximumCapacity?: string;
  InstallationInitial?: string;
  MaintenanceTechnicalSupport?: string;
  Manufacturer?: string;
  OtherManufacturer?: string;
}

export interface RefreshResult {
  refreshId: string;
  totalFetched: number;
  totalNew: number;
  totalUpdated: number;
  newKeys: string[];
  error?: string;
}

export interface RefreshHistory {
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
// USAC FORM 470 SERVICE
// ================================================================

// SODA API Base URL
const SODA_BASE_URL = 'https://opendata.usac.org/resource/jt8s-3q52.json';

// Target states and funding year
const TARGET_STATES = ['ID', 'WA', 'OR', 'MT', 'AK'];
const FUNDING_YEAR = '2026';

const DEFAULT_PAGE_SIZE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

export class USACForm470Service {
  
  /**
   * Generate primary key from record fields
   * Composite key: application_number + service_request_id + form_version
   */
  static generatePrimaryKey(record: any): string {
    const appNum = record.application_number || '';
    const serviceReqId = record.service_request_id || '';
    const formVersion = record.form_version || '';
    return `${appNum}|${serviceReqId}|${formVersion}`;
  }
  
  /**
   * Fetch all data from SODA API with paging support
   */
  static async fetchFromSODA(): Promise<any[]> {
    const allRecords: any[] = [];
    const appToken = process.env.USAC_SODA_APP_TOKEN;
    
    console.log('[USAC470] Starting SODA fetch...');
    
    // Fetch each state separately to avoid complex SoQL
    for (const state of TARGET_STATES) {
      let offset = 0;
      let hasMore = true;
      
      console.log(`[USAC470] Fetching records for state: ${state}`);
      
      while (hasMore) {
        let retries = 0;
        let success = false;
        let lastError: Error | null = null;
        
        while (retries < MAX_RETRIES && !success) {
          try {
            // Build URL with simple filtering
            const params = new URLSearchParams();
            params.append('billed_entity_state', state);
            params.append('funding_year', FUNDING_YEAR);
            params.append('$limit', DEFAULT_PAGE_SIZE.toString());
            params.append('$offset', offset.toString());
            
            const url = `${SODA_BASE_URL}?${params.toString()}`;
            
            // Build headers
            const headers: Record<string, string> = {
              'Accept': 'application/json',
            };
            if (appToken) {
              headers['X-App-Token'] = appToken;
            }
            
            // Fetch with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            
            const response = await fetch(url, {
              headers,
              signal: controller.signal,
            });
            
            clearTimeout(timeout);
          
            // Handle rate limiting
            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
              console.log(`[USAC470] Rate limited, waiting ${retryAfter}s...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              retries++;
              continue;
            }
            
            // Handle server errors
            if (response.status >= 500) {
              console.log(`[USAC470] Server error ${response.status}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries)));
              retries++;
              continue;
            }
            
            if (!response.ok) {
              throw new Error(`SODA API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
              throw new Error('SODA API returned non-array response');
            }
            
            console.log(`[USAC470] Fetched ${data.length} records for ${state} at offset ${offset}`);
            allRecords.push(...data);
            
            // Check if we got a full page (more data might exist)
            if (data.length < DEFAULT_PAGE_SIZE) {
              hasMore = false;
            } else {
              offset += DEFAULT_PAGE_SIZE;
            }
            
            success = true;
            
          } catch (error: any) {
            lastError = error;
            if (error.name === 'AbortError') {
              console.log(`[USAC470] Request timeout, retrying...`);
            } else {
              console.error(`[USAC470] Fetch error:`, error.message);
            }
            retries++;
            if (retries < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries)));
            }
          }
        }
        
        if (!success) {
          throw lastError || new Error('Failed to fetch SODA data after retries');
        }
        
        // Safety limit to prevent infinite loops
        if (offset > 100000) {
          console.warn('[USAC470] Safety limit reached at 100k records');
          break;
        }
      }
    }
    
    console.log(`[USAC470] Total records fetched: ${allRecords.length}`);
    return allRecords;
  }
  
  /**
   * Map SODA record to database record
   */
  static mapToDbRecord(record: any): Partial<Form470Record> {
    return {
      PrimaryKey: this.generatePrimaryKey(record),
      ApplicationNumber: record.application_number || null,
      FormNickname: record.form_nickname || null,
      FormPdf: typeof record.form_pdf === 'object' ? JSON.stringify(record.form_pdf) : record.form_pdf || null,
      ServiceRequestId: record.service_request_id || null,
      ServiceRequestRfpAttachment: record.service_request_rfp_attachment || null,
      RfpDocuments: typeof record.rfp_documents === 'object' ? JSON.stringify(record.rfp_documents) : record.rfp_documents || null,
      RfpUploadDate: record.rfp_upload_date || null,
      FormVersion: record.form_version || null,
      FundingYear: record.funding_year || null,
      Fcc470Status: record.fcc_form_470_status || null,
      AllowableContractDate: record.allowable_contract_date || null,
      CertifiedDateTime: record.certified_date_time || null,
      LastModifiedDateTime: record.last_modified_date_time || null,
      BilledEntityNumber: record.billed_entity_number || null,
      BilledEntityName: record.billed_entity_name || null,
      ApplicantType: record.applicant_type || null,
      WebsiteUrl: record.website_url || null,
      BenFccRegistrationNumber: record.ben_fcc_registration_number || null,
      BenAddress1: record.ben_address_1 || null,
      BenAddress2: record.ben_address_2 || null,
      BilledEntityCity: record.billed_entity_city || null,
      BilledEntityState: record.billed_entity_state || null,
      BilledEntityZip: record.billed_entity_zip || null,
      BilledEntityZipExt: record.billed_entity_zip_ext || null,
      BilledEntityEmail: record.billed_entity_email || null,
      BilledEntityPhone: record.billed_entity_phone || null,
      BilledEntityPhoneExt: record.billed_entity_phone_ext || null,
      NumberOfEligibleEntities: record.number_of_eligible_entities ? parseInt(record.number_of_eligible_entities, 10) : undefined,
      ContactName: record.contact_name || null,
      ContactAddress1: record.contact_address1 || null,
      ContactAddress2: record.contact_address2 || null,
      ContactCity: record.contact_city || null,
      ContactState: record.contact_state || null,
      ContactZip: record.contact_zip || null,
      ContactZipExt: record.contact_zip_ext || null,
      ContactPhone: record.contact_phone || null,
      ContactPhoneExt: record.contact_phone_ext || null,
      ContactEmail: record.contact_email || null,
      TechnicalContactName: record.technical_contact_name || null,
      TechnicalContactTitle: record.technical_contact_title || null,
      TechnicalContactPhone: record.technical_contact_phone || null,
      TechnicalContactPhoneExt: record.technical_contact_phone_ext || null,
      TechnicalContactEmail: record.technical_contact_email || null,
      AuthorizedPersonName: record.authorized_person_name || null,
      AuthorizedPersonAddress: record.authorized_person_address || null,
      AuthorizedPersonCity: record.authorized_person_city || null,
      AuthorizedPersonState: record.authorized_person_state || null,
      AuthorizedPersonZip: record.authorized_person_zip || null,
      AuthorizedPersonZipExt: record.authorized_person_zip_ext || null,
      AuthorizedPersonPhone: record.authorized_person_phone || null,
      AuthorizedPersonPhoneExt: record.authorized_person_phone_ext || null,
      AuthorizedPersonEmail: record.authorized_person_email || null,
      AuthorizedPersonTitle: record.authorized_person_title || null,
      AuthorizedPersonEmployer: record.authorized_person_employer || null,
      ConsultingFirmData: record.consulting_firm_data || null,
      CategoryOneDescription: record.category_one_description || null,
      CategoryTwoDescription: record.category_two_description || null,
      InstallmentType: record.installment_type || null,
      InstallmentMinRangeYears: record.installment_min_range_years || null,
      InstallmentMaxRangeYears: record.installment_max_range_years || null,
      RfpIdentifier: record.rfp_identifier || null,
      StateOrLocalRestrictions: record.state_or_local_restrictions || null,
      StateOrLocalRestrictions1: record.state_or_local_restrictions_1 || null,
      StatewideState: record.statewide_state || null,
      AllPublicSchoolsDistricts: record.all_public_schools_districts || null,
      AllNonPublicSchools: record.all_non_public_schools || null,
      AllLibraries: record.all_libraries || null,
      ServiceCategory: record.service_category || null,
      ServiceType: record.service_type || null,
      Function: record.function || null,
      OtherFunction: record.other_function || null,
      Entities: record.entities || null,
      Quantity: record.quantity || null,
      Unit: record.unit || null,
      MinimumCapacity: record.minimum_capacity || null,
      MaximumCapacity: record.maximum_capacity || null,
      InstallationInitial: record.installation_initial || null,
      MaintenanceTechnicalSupport: record.maintenance_technical_support || null,
      Manufacturer: record.manufacturer || null,
      OtherManufacturer: record.other_manufacturer || null,
    };
  }
  
  /**
   * Get all existing primary keys from database
   */
  static async getExistingPrimaryKeys(): Promise<Set<string>> {
    const results = await executeQuery<{ PrimaryKey: string }>(
      `SELECT PrimaryKey FROM dbo.ERateForm470`,
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
      `INSERT INTO dbo.ERateRefreshHistory (Id, RefreshStartedAt, Status)
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
      `UPDATE dbo.ERateRefreshHistory 
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
   * Fast upsert using pre-loaded existing keys (no SELECT per record)
   */
  static async upsertRecordFast(record: Partial<Form470Record>, refreshId: string, existingKeys: Set<string>): Promise<boolean> {
    const isNew = !existingKeys.has(record.PrimaryKey!);
    
    if (isNew) {
      // Insert new record
      const id = uuidv4();
      await executeQuery(
        `INSERT INTO dbo.ERateForm470 (
          Id, PrimaryKey, FirstSeenAt, LastSeenAt, LastRefreshId,
          ApplicationNumber, FormNickname, FormPdf, ServiceRequestId, ServiceRequestRfpAttachment,
          RfpDocuments, RfpUploadDate, FormVersion, FundingYear, Fcc470Status,
          AllowableContractDate, CertifiedDateTime, LastModifiedDateTime,
          BilledEntityNumber, BilledEntityName, ApplicantType, WebsiteUrl, BenFccRegistrationNumber,
          BenAddress1, BenAddress2, BilledEntityCity, BilledEntityState, BilledEntityZip,
          BilledEntityZipExt, BilledEntityEmail, BilledEntityPhone, BilledEntityPhoneExt,
          NumberOfEligibleEntities, ContactName, ContactAddress1, ContactAddress2,
          ContactCity, ContactState, ContactZip, ContactZipExt, ContactPhone, ContactPhoneExt, ContactEmail,
          TechnicalContactName, TechnicalContactTitle, TechnicalContactPhone, TechnicalContactPhoneExt, TechnicalContactEmail,
          AuthorizedPersonName, AuthorizedPersonAddress, AuthorizedPersonCity, AuthorizedPersonState,
          AuthorizedPersonZip, AuthorizedPersonZipExt, AuthorizedPersonPhone, AuthorizedPersonPhoneExt,
          AuthorizedPersonEmail, AuthorizedPersonTitle, AuthorizedPersonEmployer,
          ConsultingFirmData, CategoryOneDescription, CategoryTwoDescription,
          InstallmentType, InstallmentMinRangeYears, InstallmentMaxRangeYears, RfpIdentifier,
          StateOrLocalRestrictions, StateOrLocalRestrictions1, StatewideState,
          AllPublicSchoolsDistricts, AllNonPublicSchools, AllLibraries,
          ServiceCategory, ServiceType, [Function], OtherFunction, Entities,
          Quantity, Unit, MinimumCapacity, MaximumCapacity,
          InstallationInitial, MaintenanceTechnicalSupport, Manufacturer, OtherManufacturer
        ) VALUES (
          @id, @primaryKey, GETUTCDATE(), GETUTCDATE(), @refreshId,
          @applicationNumber, @formNickname, @formPdf, @serviceRequestId, @serviceRequestRfpAttachment,
          @rfpDocuments, @rfpUploadDate, @formVersion, @fundingYear, @fcc470Status,
          @allowableContractDate, @certifiedDateTime, @lastModifiedDateTime,
          @billedEntityNumber, @billedEntityName, @applicantType, @websiteUrl, @benFccRegistrationNumber,
          @benAddress1, @benAddress2, @billedEntityCity, @billedEntityState, @billedEntityZip,
          @billedEntityZipExt, @billedEntityEmail, @billedEntityPhone, @billedEntityPhoneExt,
          @numberOfEligibleEntities, @contactName, @contactAddress1, @contactAddress2,
          @contactCity, @contactState, @contactZip, @contactZipExt, @contactPhone, @contactPhoneExt, @contactEmail,
          @technicalContactName, @technicalContactTitle, @technicalContactPhone, @technicalContactPhoneExt, @technicalContactEmail,
          @authorizedPersonName, @authorizedPersonAddress, @authorizedPersonCity, @authorizedPersonState,
          @authorizedPersonZip, @authorizedPersonZipExt, @authorizedPersonPhone, @authorizedPersonPhoneExt,
          @authorizedPersonEmail, @authorizedPersonTitle, @authorizedPersonEmployer,
          @consultingFirmData, @categoryOneDescription, @categoryTwoDescription,
          @installmentType, @installmentMinRangeYears, @installmentMaxRangeYears, @rfpIdentifier,
          @stateOrLocalRestrictions, @stateOrLocalRestrictions1, @statewideState,
          @allPublicSchoolsDistricts, @allNonPublicSchools, @allLibraries,
          @serviceCategory, @serviceType, @function, @otherFunction, @entities,
          @quantity, @unit, @minimumCapacity, @maximumCapacity,
          @installationInitial, @maintenanceTechnicalSupport, @manufacturer, @otherManufacturer
        )`,
        {
          id,
          refreshId,
          primaryKey: record.PrimaryKey,
          applicationNumber: record.ApplicationNumber,
          formNickname: record.FormNickname,
          formPdf: record.FormPdf,
          serviceRequestId: record.ServiceRequestId,
          serviceRequestRfpAttachment: record.ServiceRequestRfpAttachment,
          rfpDocuments: record.RfpDocuments,
          rfpUploadDate: record.RfpUploadDate,
          formVersion: record.FormVersion,
          fundingYear: record.FundingYear,
          fcc470Status: record.Fcc470Status,
          allowableContractDate: record.AllowableContractDate,
          certifiedDateTime: record.CertifiedDateTime,
          lastModifiedDateTime: record.LastModifiedDateTime,
          billedEntityNumber: record.BilledEntityNumber,
          billedEntityName: record.BilledEntityName,
          applicantType: record.ApplicantType,
          websiteUrl: record.WebsiteUrl,
          benFccRegistrationNumber: record.BenFccRegistrationNumber,
          benAddress1: record.BenAddress1,
          benAddress2: record.BenAddress2,
          billedEntityCity: record.BilledEntityCity,
          billedEntityState: record.BilledEntityState,
          billedEntityZip: record.BilledEntityZip,
          billedEntityZipExt: record.BilledEntityZipExt,
          billedEntityEmail: record.BilledEntityEmail,
          billedEntityPhone: record.BilledEntityPhone,
          billedEntityPhoneExt: record.BilledEntityPhoneExt,
          numberOfEligibleEntities: record.NumberOfEligibleEntities,
          contactName: record.ContactName,
          contactAddress1: record.ContactAddress1,
          contactAddress2: record.ContactAddress2,
          contactCity: record.ContactCity,
          contactState: record.ContactState,
          contactZip: record.ContactZip,
          contactZipExt: record.ContactZipExt,
          contactPhone: record.ContactPhone,
          contactPhoneExt: record.ContactPhoneExt,
          contactEmail: record.ContactEmail,
          technicalContactName: record.TechnicalContactName,
          technicalContactTitle: record.TechnicalContactTitle,
          technicalContactPhone: record.TechnicalContactPhone,
          technicalContactPhoneExt: record.TechnicalContactPhoneExt,
          technicalContactEmail: record.TechnicalContactEmail,
          authorizedPersonName: record.AuthorizedPersonName,
          authorizedPersonAddress: record.AuthorizedPersonAddress,
          authorizedPersonCity: record.AuthorizedPersonCity,
          authorizedPersonState: record.AuthorizedPersonState,
          authorizedPersonZip: record.AuthorizedPersonZip,
          authorizedPersonZipExt: record.AuthorizedPersonZipExt,
          authorizedPersonPhone: record.AuthorizedPersonPhone,
          authorizedPersonPhoneExt: record.AuthorizedPersonPhoneExt,
          authorizedPersonEmail: record.AuthorizedPersonEmail,
          authorizedPersonTitle: record.AuthorizedPersonTitle,
          authorizedPersonEmployer: record.AuthorizedPersonEmployer,
          consultingFirmData: record.ConsultingFirmData,
          categoryOneDescription: record.CategoryOneDescription,
          categoryTwoDescription: record.CategoryTwoDescription,
          installmentType: record.InstallmentType,
          installmentMinRangeYears: record.InstallmentMinRangeYears,
          installmentMaxRangeYears: record.InstallmentMaxRangeYears,
          rfpIdentifier: record.RfpIdentifier,
          stateOrLocalRestrictions: record.StateOrLocalRestrictions,
          stateOrLocalRestrictions1: record.StateOrLocalRestrictions1,
          statewideState: record.StatewideState,
          allPublicSchoolsDistricts: record.AllPublicSchoolsDistricts,
          allNonPublicSchools: record.AllNonPublicSchools,
          allLibraries: record.AllLibraries,
          serviceCategory: record.ServiceCategory,
          serviceType: record.ServiceType,
          function: record.Function,
          otherFunction: record.OtherFunction,
          entities: record.Entities,
          quantity: record.Quantity,
          unit: record.Unit,
          minimumCapacity: record.MinimumCapacity,
          maximumCapacity: record.MaximumCapacity,
          installationInitial: record.InstallationInitial,
          maintenanceTechnicalSupport: record.MaintenanceTechnicalSupport,
          manufacturer: record.Manufacturer,
          otherManufacturer: record.OtherManufacturer,
        }
      );
      // Track the new key in the set for subsequent checks
      existingKeys.add(record.PrimaryKey!);
    } else {
      // Update existing record
      await executeQuery(
        `UPDATE dbo.ERateForm470 SET
          LastSeenAt = GETUTCDATE(),
          LastRefreshId = @refreshId,
          FormNickname = @formNickname,
          FormPdf = @formPdf,
          RfpDocuments = @rfpDocuments,
          RfpUploadDate = @rfpUploadDate,
          Fcc470Status = @fcc470Status,
          AllowableContractDate = @allowableContractDate,
          CertifiedDateTime = @certifiedDateTime,
          LastModifiedDateTime = @lastModifiedDateTime,
          BilledEntityName = @billedEntityName,
          ServiceType = @serviceType,
          Manufacturer = @manufacturer
        WHERE PrimaryKey = @primaryKey`,
        {
          refreshId,
          primaryKey: record.PrimaryKey,
          formNickname: record.FormNickname,
          formPdf: record.FormPdf,
          rfpDocuments: record.RfpDocuments,
          rfpUploadDate: record.RfpUploadDate,
          fcc470Status: record.Fcc470Status,
          allowableContractDate: record.AllowableContractDate,
          certifiedDateTime: record.CertifiedDateTime,
          lastModifiedDateTime: record.LastModifiedDateTime,
          billedEntityName: record.BilledEntityName,
          serviceType: record.ServiceType,
          manufacturer: record.Manufacturer,
        }
      );
    }
    
    return isNew;
  }
  
  /**
   * Upsert a single Form 470 record
   */
  static async upsertRecord(record: Partial<Form470Record>, refreshId: string): Promise<boolean> {
    // Check if exists
    const existing = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM dbo.ERateForm470 WHERE PrimaryKey = @primaryKey`,
      { primaryKey: record.PrimaryKey }
    );
    
    const isNew = existing[0].cnt === 0;
    
    if (isNew) {
      // Insert new record
      const id = uuidv4();
      await executeQuery(
        `INSERT INTO dbo.ERateForm470 (
          Id, PrimaryKey, FirstSeenAt, LastSeenAt, LastRefreshId,
          ApplicationNumber, FormNickname, FormPdf, ServiceRequestId, ServiceRequestRfpAttachment,
          RfpDocuments, RfpUploadDate, FormVersion, FundingYear, Fcc470Status,
          AllowableContractDate, CertifiedDateTime, LastModifiedDateTime,
          BilledEntityNumber, BilledEntityName, ApplicantType, WebsiteUrl, BenFccRegistrationNumber,
          BenAddress1, BenAddress2, BilledEntityCity, BilledEntityState, BilledEntityZip,
          BilledEntityZipExt, BilledEntityEmail, BilledEntityPhone, BilledEntityPhoneExt,
          NumberOfEligibleEntities, ContactName, ContactAddress1, ContactAddress2,
          ContactCity, ContactState, ContactZip, ContactZipExt, ContactPhone, ContactPhoneExt, ContactEmail,
          TechnicalContactName, TechnicalContactTitle, TechnicalContactPhone, TechnicalContactPhoneExt, TechnicalContactEmail,
          AuthorizedPersonName, AuthorizedPersonAddress, AuthorizedPersonCity, AuthorizedPersonState,
          AuthorizedPersonZip, AuthorizedPersonZipExt, AuthorizedPersonPhone, AuthorizedPersonPhoneExt,
          AuthorizedPersonEmail, AuthorizedPersonTitle, AuthorizedPersonEmployer,
          ConsultingFirmData, CategoryOneDescription, CategoryTwoDescription,
          InstallmentType, InstallmentMinRangeYears, InstallmentMaxRangeYears, RfpIdentifier,
          StateOrLocalRestrictions, StateOrLocalRestrictions1, StatewideState,
          AllPublicSchoolsDistricts, AllNonPublicSchools, AllLibraries,
          ServiceCategory, ServiceType, [Function], OtherFunction, Entities,
          Quantity, Unit, MinimumCapacity, MaximumCapacity,
          InstallationInitial, MaintenanceTechnicalSupport, Manufacturer, OtherManufacturer
        ) VALUES (
          @id, @primaryKey, GETUTCDATE(), GETUTCDATE(), @refreshId,
          @applicationNumber, @formNickname, @formPdf, @serviceRequestId, @serviceRequestRfpAttachment,
          @rfpDocuments, @rfpUploadDate, @formVersion, @fundingYear, @fcc470Status,
          @allowableContractDate, @certifiedDateTime, @lastModifiedDateTime,
          @billedEntityNumber, @billedEntityName, @applicantType, @websiteUrl, @benFccRegistrationNumber,
          @benAddress1, @benAddress2, @billedEntityCity, @billedEntityState, @billedEntityZip,
          @billedEntityZipExt, @billedEntityEmail, @billedEntityPhone, @billedEntityPhoneExt,
          @numberOfEligibleEntities, @contactName, @contactAddress1, @contactAddress2,
          @contactCity, @contactState, @contactZip, @contactZipExt, @contactPhone, @contactPhoneExt, @contactEmail,
          @technicalContactName, @technicalContactTitle, @technicalContactPhone, @technicalContactPhoneExt, @technicalContactEmail,
          @authorizedPersonName, @authorizedPersonAddress, @authorizedPersonCity, @authorizedPersonState,
          @authorizedPersonZip, @authorizedPersonZipExt, @authorizedPersonPhone, @authorizedPersonPhoneExt,
          @authorizedPersonEmail, @authorizedPersonTitle, @authorizedPersonEmployer,
          @consultingFirmData, @categoryOneDescription, @categoryTwoDescription,
          @installmentType, @installmentMinRangeYears, @installmentMaxRangeYears, @rfpIdentifier,
          @stateOrLocalRestrictions, @stateOrLocalRestrictions1, @statewideState,
          @allPublicSchoolsDistricts, @allNonPublicSchools, @allLibraries,
          @serviceCategory, @serviceType, @function, @otherFunction, @entities,
          @quantity, @unit, @minimumCapacity, @maximumCapacity,
          @installationInitial, @maintenanceTechnicalSupport, @manufacturer, @otherManufacturer
        )`,
        {
          id,
          refreshId,
          primaryKey: record.PrimaryKey,
          applicationNumber: record.ApplicationNumber,
          formNickname: record.FormNickname,
          formPdf: record.FormPdf,
          serviceRequestId: record.ServiceRequestId,
          serviceRequestRfpAttachment: record.ServiceRequestRfpAttachment,
          rfpDocuments: record.RfpDocuments,
          rfpUploadDate: record.RfpUploadDate,
          formVersion: record.FormVersion,
          fundingYear: record.FundingYear,
          fcc470Status: record.Fcc470Status,
          allowableContractDate: record.AllowableContractDate,
          certifiedDateTime: record.CertifiedDateTime,
          lastModifiedDateTime: record.LastModifiedDateTime,
          billedEntityNumber: record.BilledEntityNumber,
          billedEntityName: record.BilledEntityName,
          applicantType: record.ApplicantType,
          websiteUrl: record.WebsiteUrl,
          benFccRegistrationNumber: record.BenFccRegistrationNumber,
          benAddress1: record.BenAddress1,
          benAddress2: record.BenAddress2,
          billedEntityCity: record.BilledEntityCity,
          billedEntityState: record.BilledEntityState,
          billedEntityZip: record.BilledEntityZip,
          billedEntityZipExt: record.BilledEntityZipExt,
          billedEntityEmail: record.BilledEntityEmail,
          billedEntityPhone: record.BilledEntityPhone,
          billedEntityPhoneExt: record.BilledEntityPhoneExt,
          numberOfEligibleEntities: record.NumberOfEligibleEntities,
          contactName: record.ContactName,
          contactAddress1: record.ContactAddress1,
          contactAddress2: record.ContactAddress2,
          contactCity: record.ContactCity,
          contactState: record.ContactState,
          contactZip: record.ContactZip,
          contactZipExt: record.ContactZipExt,
          contactPhone: record.ContactPhone,
          contactPhoneExt: record.ContactPhoneExt,
          contactEmail: record.ContactEmail,
          technicalContactName: record.TechnicalContactName,
          technicalContactTitle: record.TechnicalContactTitle,
          technicalContactPhone: record.TechnicalContactPhone,
          technicalContactPhoneExt: record.TechnicalContactPhoneExt,
          technicalContactEmail: record.TechnicalContactEmail,
          authorizedPersonName: record.AuthorizedPersonName,
          authorizedPersonAddress: record.AuthorizedPersonAddress,
          authorizedPersonCity: record.AuthorizedPersonCity,
          authorizedPersonState: record.AuthorizedPersonState,
          authorizedPersonZip: record.AuthorizedPersonZip,
          authorizedPersonZipExt: record.AuthorizedPersonZipExt,
          authorizedPersonPhone: record.AuthorizedPersonPhone,
          authorizedPersonPhoneExt: record.AuthorizedPersonPhoneExt,
          authorizedPersonEmail: record.AuthorizedPersonEmail,
          authorizedPersonTitle: record.AuthorizedPersonTitle,
          authorizedPersonEmployer: record.AuthorizedPersonEmployer,
          consultingFirmData: record.ConsultingFirmData,
          categoryOneDescription: record.CategoryOneDescription,
          categoryTwoDescription: record.CategoryTwoDescription,
          installmentType: record.InstallmentType,
          installmentMinRangeYears: record.InstallmentMinRangeYears,
          installmentMaxRangeYears: record.InstallmentMaxRangeYears,
          rfpIdentifier: record.RfpIdentifier,
          stateOrLocalRestrictions: record.StateOrLocalRestrictions,
          stateOrLocalRestrictions1: record.StateOrLocalRestrictions1,
          statewideState: record.StatewideState,
          allPublicSchoolsDistricts: record.AllPublicSchoolsDistricts,
          allNonPublicSchools: record.AllNonPublicSchools,
          allLibraries: record.AllLibraries,
          serviceCategory: record.ServiceCategory,
          serviceType: record.ServiceType,
          function: record.Function,
          otherFunction: record.OtherFunction,
          entities: record.Entities,
          quantity: record.Quantity,
          unit: record.Unit,
          minimumCapacity: record.MinimumCapacity,
          maximumCapacity: record.MaximumCapacity,
          installationInitial: record.InstallationInitial,
          maintenanceTechnicalSupport: record.MaintenanceTechnicalSupport,
          manufacturer: record.Manufacturer,
          otherManufacturer: record.OtherManufacturer,
        }
      );
    } else {
      // Update existing record
      await executeQuery(
        `UPDATE dbo.ERateForm470 SET
          LastSeenAt = GETUTCDATE(),
          LastRefreshId = @refreshId,
          FormNickname = @formNickname,
          FormPdf = @formPdf,
          RfpDocuments = @rfpDocuments,
          RfpUploadDate = @rfpUploadDate,
          Fcc470Status = @fcc470Status,
          AllowableContractDate = @allowableContractDate,
          CertifiedDateTime = @certifiedDateTime,
          LastModifiedDateTime = @lastModifiedDateTime,
          BilledEntityName = @billedEntityName,
          ServiceType = @serviceType,
          Manufacturer = @manufacturer
        WHERE PrimaryKey = @primaryKey`,
        {
          refreshId,
          primaryKey: record.PrimaryKey,
          formNickname: record.FormNickname,
          formPdf: record.FormPdf,
          rfpDocuments: record.RfpDocuments,
          rfpUploadDate: record.RfpUploadDate,
          fcc470Status: record.Fcc470Status,
          allowableContractDate: record.AllowableContractDate,
          certifiedDateTime: record.CertifiedDateTime,
          lastModifiedDateTime: record.LastModifiedDateTime,
          billedEntityName: record.BilledEntityName,
          serviceType: record.ServiceType,
          manufacturer: record.Manufacturer,
        }
      );
    }
    
    return isNew;
  }
  
  /**
   * Download updates from SODA API and sync to database
   */
  static async downloadUpdates(): Promise<RefreshResult> {
    const refreshId = await this.createRefreshHistory();
    const newKeys: string[] = [];
    let totalFetched = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    
    try {
      // Fetch all data from SODA
      const records = await this.fetchFromSODA();
      totalFetched = records.length;
      
      // Get existing keys for quick lookup
      console.log('[USAC470] Loading existing primary keys...');
      const existingKeys = await this.getExistingPrimaryKeys();
      console.log(`[USAC470] Found ${existingKeys.size} existing records`);
      
      // Process each record with progress logging
      let processed = 0;
      const batchSize = 100;
      
      for (const rawRecord of records) {
        const dbRecord = this.mapToDbRecord(rawRecord);
        const isNew = await this.upsertRecordFast(dbRecord, refreshId, existingKeys);
        
        if (isNew) {
          totalNew++;
          newKeys.push(dbRecord.PrimaryKey!);
        } else {
          totalUpdated++;
        }
        
        processed++;
        if (processed % batchSize === 0) {
          console.log(`[USAC470] Processed ${processed}/${totalFetched} records (${totalNew} new)...`);
        }
      }
      
      // Complete refresh history
      await this.completeRefreshHistory(refreshId, 'Completed', totalFetched, totalNew, totalUpdated);
      
      console.log(`[USAC470] Refresh complete: ${totalFetched} fetched, ${totalNew} new, ${totalUpdated} updated`);
      
      return {
        refreshId,
        totalFetched,
        totalNew,
        totalUpdated,
        newKeys,
      };
      
    } catch (error: any) {
      console.error('[USAC470] Download failed:', error);
      await this.completeRefreshHistory(refreshId, 'Failed', totalFetched, totalNew, totalUpdated, error.message);
      
      return {
        refreshId,
        totalFetched,
        totalNew,
        totalUpdated,
        newKeys,
        error: error.message,
      };
    }
  }
  
  /**
   * Update the user status on a record
   */
  static async updateUserStatus(id: string, userStatus: string | null): Promise<boolean> {
    const result = await executeQuery(
      `UPDATE dbo.ERateForm470 SET UserStatus = @userStatus WHERE Id = @id`,
      { id, userStatus }
    );
    return true;
  }
  
  /**
   * Get all Form 470 records with optional new record highlighting
   */
  static async getAll(lastRefreshId?: string): Promise<Form470Record[]> {
    let query = `
      SELECT 
        Id, PrimaryKey, FirstSeenAt, LastSeenAt, LastRefreshId, UserStatus,
        ApplicationNumber, FormNickname, FormPdf, ServiceRequestId, ServiceRequestRfpAttachment,
        RfpDocuments, RfpUploadDate, FormVersion, FundingYear, Fcc470Status,
        AllowableContractDate, CertifiedDateTime, LastModifiedDateTime,
        BilledEntityNumber, BilledEntityName, ApplicantType, WebsiteUrl, BenFccRegistrationNumber,
        BenAddress1, BenAddress2, BilledEntityCity, BilledEntityState, BilledEntityZip,
        BilledEntityZipExt, BilledEntityEmail, BilledEntityPhone, BilledEntityPhoneExt,
        NumberOfEligibleEntities, ContactName, ContactAddress1, ContactAddress2,
        ContactCity, ContactState, ContactZip, ContactZipExt, ContactPhone, ContactPhoneExt, ContactEmail,
        TechnicalContactName, TechnicalContactTitle, TechnicalContactPhone, TechnicalContactPhoneExt, TechnicalContactEmail,
        AuthorizedPersonName, AuthorizedPersonAddress, AuthorizedPersonCity, AuthorizedPersonState,
        AuthorizedPersonZip, AuthorizedPersonZipExt, AuthorizedPersonPhone, AuthorizedPersonPhoneExt,
        AuthorizedPersonEmail, AuthorizedPersonTitle, AuthorizedPersonEmployer,
        ConsultingFirmData, CategoryOneDescription, CategoryTwoDescription,
        InstallmentType, InstallmentMinRangeYears, InstallmentMaxRangeYears, RfpIdentifier,
        StateOrLocalRestrictions, StateOrLocalRestrictions1, StatewideState,
        AllPublicSchoolsDistricts, AllNonPublicSchools, AllLibraries,
        ServiceCategory, ServiceType, [Function], OtherFunction, Entities,
        Quantity, Unit, MinimumCapacity, MaximumCapacity,
        InstallationInitial, MaintenanceTechnicalSupport, Manufacturer, OtherManufacturer
    `;
    
    if (lastRefreshId) {
      query += `,
        CASE WHEN LastRefreshId = @lastRefreshId AND FirstSeenAt = LastSeenAt THEN 1 ELSE 0 END AS IsNew`;
    }
    
    query += `
      FROM dbo.ERateForm470
      ORDER BY AllowableContractDate DESC, LastModifiedDateTime DESC
    `;
    
    const results = await executeQuery<Form470Record>(query, { lastRefreshId });
    return results;
  }
  
  /**
   * Get the latest refresh history
   */
  static async getLatestRefresh(): Promise<RefreshHistory | null> {
    const results = await executeQuery<RefreshHistory>(
      `SELECT TOP 1 Id, RefreshStartedAt, RefreshCompletedAt, Status, TotalFetched, TotalNew, TotalUpdated, ErrorMessage
       FROM dbo.ERateRefreshHistory
       WHERE Status = 'Completed'
       ORDER BY RefreshStartedAt DESC`,
      {}
    );
    return results[0] || null;
  }
  
  /**
   * Get refresh history
   */
  static async getRefreshHistory(limit: number = 10): Promise<RefreshHistory[]> {
    return await executeQuery<RefreshHistory>(
      `SELECT TOP (@limit) Id, RefreshStartedAt, RefreshCompletedAt, Status, TotalFetched, TotalNew, TotalUpdated, ErrorMessage
       FROM dbo.ERateRefreshHistory
       ORDER BY RefreshStartedAt DESC`,
      { limit }
    );
  }
}
