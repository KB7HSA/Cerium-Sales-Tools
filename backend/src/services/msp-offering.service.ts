import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeTransaction } from '../config/database';

export interface MSPOffering {
  Id?: string;
  Name: string;
  Description?: string;
  ImageUrl?: string;
  Category: string;
  BasePrice?: number;
  PricingUnit?: string;
  SetupFee: number;
  SetupFeeCost?: number;
  SetupFeeMargin?: number;
  IsActive: boolean;
  DisplayOrder?: number;
  CreatedDate?: string;
  LastModified?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  Features?: string[];
  ServiceLevels?: MSPServiceLevel[];
}

export interface MSPServiceLevel {
  Id?: string;
  OfferingId?: string;
  Name: string;
  BasePrice: number;
  BaseCost?: number;
  MarginPercent?: number;
  LicenseCost?: number;
  LicenseMargin?: number;
  ProfessionalServicesPrice?: number;
  ProfessionalServicesCost?: number;
  ProfessionalServicesMargin?: number;
  PricingUnit: string;
  DisplayOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  Options?: MSPOption[];
}

export interface MSPOption {
  Id?: string;
  ServiceLevelId?: string;
  Name: string;
  Description?: string;
  MonthlyPrice: number;
  MonthlyCost?: number;
  MarginPercent?: number;
  PricingUnit: string;
  DisplayOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export class MSPOfferingService {
  /**
   * Get all MSP offerings
   */
  static async getAllOfferings(isActiveOnly: boolean = false): Promise<MSPOffering[]> {
    let query = `
      SELECT 
        Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
        SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
        CreatedDate, LastModified, CreatedAt, UpdatedAt
      FROM dbo.MspOfferings
    `;

    if (isActiveOnly) {
      query += ` WHERE IsActive = 1`;
    }

    query += ` ORDER BY DisplayOrder ASC, Name ASC`;

    try {
      const results = await executeQuery<MSPOffering>(query, {});
      
      // Enhance each offering with features and service levels
      if (Array.isArray(results)) {
        for (let offering of results) {
          // Get features
          const featuresQuery = `
            SELECT Feature FROM dbo.MspOfferingFeatures 
            WHERE OfferingId = @offeringId 
            ORDER BY DisplayOrder ASC
          `;
          const features = await executeQuery<any>(featuresQuery, { offeringId: offering.Id });
          offering.Features = features ? features.map(f => f.Feature) : [];

          // Get service levels with options
          const levelsQuery = `
            SELECT 
              Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
              LicenseCost, LicenseMargin, ProfessionalServicesPrice,
              ProfessionalServicesCost, ProfessionalServicesMargin,
              PricingUnit, DisplayOrder
            FROM dbo.MspServiceLevels 
            WHERE OfferingId = @offeringId 
            ORDER BY DisplayOrder ASC
          `;
          const levels = await executeQuery<any>(levelsQuery, { offeringId: offering.Id });
          
          if (Array.isArray(levels)) {
            for (let level of levels) {
              // Get options for each service level
              const optionsQuery = `
                SELECT 
                  Id, ServiceLevelId, Name, Description, MonthlyPrice,
                  MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
                FROM dbo.MspServiceLevelOptions 
                WHERE ServiceLevelId = @serviceLevelId 
                ORDER BY DisplayOrder ASC
              `;
              const options = await executeQuery<any>(optionsQuery, { serviceLevelId: level.Id });
              level.options = options || [];
            }
          }
          
          offering.ServiceLevels = levels || [];
        }
      }
      
      return results || [];
    } catch (error) {
      console.error('Error getting all offerings:', error);
      throw error;
    }
  }

  /**
   * Get offering by ID
   */
  static async getOfferingById(id: string): Promise<MSPOffering | null> {
    const query = `
      SELECT 
        Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
        SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
        CreatedDate, LastModified, CreatedAt, UpdatedAt
      FROM dbo.MspOfferings
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<MSPOffering>(query, { id });
      let offering = results && results.length > 0 ? results[0] : null;
      
      if (offering) {
        // Get features
        const featuresQuery = `
          SELECT Feature FROM dbo.MspOfferingFeatures 
          WHERE OfferingId = @offeringId 
          ORDER BY DisplayOrder ASC
        `;
        const features = await executeQuery<any>(featuresQuery, { offeringId: offering.Id });
        offering.Features = features ? features.map(f => f.Feature) : [];

        // Get service levels with options
        const levelsQuery = `
          SELECT 
            Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
            LicenseCost, LicenseMargin, ProfessionalServicesPrice,
            ProfessionalServicesCost, ProfessionalServicesMargin,
            PricingUnit, DisplayOrder
          FROM dbo.MspServiceLevels 
          WHERE OfferingId = @offeringId 
          ORDER BY DisplayOrder ASC
        `;
        const levels = await executeQuery<any>(levelsQuery, { offeringId: offering.Id });
        
        if (Array.isArray(levels)) {
          for (let level of levels) {
            // Get options for each service level
            const optionsQuery = `
              SELECT 
                Id, ServiceLevelId, Name, Description, MonthlyPrice,
                MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
              FROM dbo.MspServiceLevelOptions 
              WHERE ServiceLevelId = @serviceLevelId 
              ORDER BY DisplayOrder ASC
            `;
            const options = await executeQuery<any>(optionsQuery, { serviceLevelId: level.Id });
            level.options = options || [];
          }
        }
        
        offering.ServiceLevels = levels || [];
      }
      
      return offering;
    } catch (error) {
      console.error('Error getting offering by ID:', error);
      throw error;
    }
  }

  /**
   * Get offerings by category
   */
  static async getOfferingsByCategory(category: string): Promise<MSPOffering[]> {
    const query = `
      SELECT 
        Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
        SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
        CreatedDate, LastModified, CreatedAt, UpdatedAt
      FROM dbo.MspOfferings
      WHERE Category = @category AND IsActive = 1
      ORDER BY DisplayOrder ASC, Name ASC
    `;

    try {
      const results = await executeQuery<MSPOffering>(query, { category: category.toLowerCase() });
      return results || [];
    } catch (error) {
      console.error('Error getting offerings by category:', error);
      throw error;
    }
  }

  /**
   * Create new offering with features and service levels
   */
  static async createOffering(offering: any): Promise<MSPOffering> {
    const offeringId = uuidv4();
    
    try {
      // Handle both camelCase and PascalCase from frontend
      const name = offering.name || offering.Name || '';
      const description = offering.description || offering.Description || null;
      const imageUrl = offering.imageUrl || offering.ImageUrl || null;
      const category = (offering.category || offering.Category || 'backup');
      
      // First, insert the offering
      const offeringQuery = `
        INSERT INTO dbo.MspOfferings (
          Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
          SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
          CreatedDate, LastModified
        )
        VALUES (
          @id, @name, @description, @imageUrl, @category, @basePrice, @pricingUnit,
          @setupFee, @setupFeeCost, @setupFeeMargin, @isActive, @displayOrder,
          @createdDate, @lastModified
        );
        SELECT 
          Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
          SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
          CreatedDate, LastModified, CreatedAt, UpdatedAt
        FROM dbo.MspOfferings
        WHERE Id = @id
      `;

      // Handle both camelCase and PascalCase from frontend
      const offeringParams = {
        id: offeringId,
        name: name,
        description: description,
        imageUrl: imageUrl,
        category: category.toLowerCase(),
        basePrice: offering.basePrice || offering.BasePrice || null,
        pricingUnit: offering.pricingUnit || offering.PricingUnit || 'per-user',
        setupFee: offering.setupFee || offering.SetupFee || 0,
        setupFeeCost: offering.setupFeeCost || offering.SetupFeeCost || null,
        setupFeeMargin: offering.setupFeeMargin || offering.SetupFeeMargin || null,
        isActive: (offering.isActive !== undefined ? offering.isActive : (offering.IsActive !== undefined ? offering.IsActive : true)) ? 1 : 0,
        displayOrder: offering.displayOrder || offering.DisplayOrder || 0,
        createdDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
      };

      const offeringResults = await executeQuery<MSPOffering>(offeringQuery, offeringParams);
      let newOffering = offeringResults && offeringResults.length > 0 ? offeringResults[0] : { ...offering, Id: offeringId };

      // Now save features
      const features = offering.features || offering.Features || [];
      if (Array.isArray(features)) {
        for (let i = 0; i < features.length; i++) {
          const feature = features[i];
          const featureQuery = `
            INSERT INTO dbo.MspOfferingFeatures (OfferingId, Feature, DisplayOrder)
            VALUES (@offeringId, @feature, @displayOrder)
          `;
          await executeQuery(featureQuery, {
            offeringId,
            feature: feature || '',
            displayOrder: i
          });
        }
      }

      // Now save service levels
      const serviceLevels = offering.serviceLevels || offering.ServiceLevels || [];
      if (Array.isArray(serviceLevels)) {
        for (let levelIndex = 0; levelIndex < serviceLevels.length; levelIndex++) {
          const level = serviceLevels[levelIndex];
          const levelId = level.id || level.Id || uuidv4();

          // Save service level
          const levelQuery = `
            INSERT INTO dbo.MspServiceLevels (
              Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
              LicenseCost, LicenseMargin, ProfessionalServicesPrice,
              ProfessionalServicesCost, ProfessionalServicesMargin,
              PricingUnit, DisplayOrder
            )
            VALUES (
              @id, @offeringId, @name, @basePrice, @baseCost, @marginPercent,
              @licenseCost, @licenseMargin, @professionalServicesPrice,
              @professionalServicesCost, @professionalServicesMargin,
              @pricingUnit, @displayOrder
            )
          `;
          
          await executeQuery(levelQuery, {
            id: levelId,
            offeringId,
            name: level.name || level.Name || '',
            basePrice: level.basePrice || level.BasePrice || 0,
            baseCost: level.baseCost || level.BaseCost || null,
            marginPercent: level.marginPercent || level.MarginPercent || null,
            licenseCost: level.licenseCost || level.LicenseCost || null,
            licenseMargin: level.licenseMargin || level.LicenseMargin || null,
            professionalServicesPrice: level.professionalServicesPrice || level.ProfessionalServicesPrice || null,
            professionalServicesCost: level.professionalServicesCost || level.ProfessionalServicesCost || null,
            professionalServicesMargin: level.professionalServicesMargin || level.ProfessionalServicesMargin || null,
            pricingUnit: level.pricingUnit || level.PricingUnit || 'per-user',
            displayOrder: level.displayOrder || level.DisplayOrder || levelIndex
          });

          // Save service level options
          const options = level.options || level.Options || [];
          if (Array.isArray(options)) {
            for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
              const option = options[optionIndex];
              const optionId = option.id || option.Id || uuidv4();

              const optionQuery = `
                INSERT INTO dbo.MspServiceLevelOptions (
                  Id, ServiceLevelId, Name, Description, MonthlyPrice,
                  MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
                )
                VALUES (
                  @id, @serviceLevelId, @name, @description, @monthlyPrice,
                  @monthlyCost, @marginPercent, @pricingUnit, @displayOrder
                )
              `;

              await executeQuery(optionQuery, {
                id: optionId,
                serviceLevelId: levelId,
                name: option.name || option.Name || '',
                description: option.description || option.Description || null,
                monthlyPrice: option.monthlyPrice || option.MonthlyPrice || 0,
                monthlyCost: option.monthlyCost || option.MonthlyCost || null,
                marginPercent: option.marginPercent || option.MarginPercent || null,
                pricingUnit: option.pricingUnit || option.PricingUnit || 'per-user',
                displayOrder: option.displayOrder || option.DisplayOrder || optionIndex
              });
            }
          }
        }
      }

      // Populate features for response
      const featuresQuery = `
        SELECT Feature FROM dbo.MspOfferingFeatures 
        WHERE OfferingId = @offeringId 
        ORDER BY DisplayOrder ASC
      `;
      const featuresForResponse = await executeQuery<any>(featuresQuery, { offeringId: offeringId });
      newOffering.Features = featuresForResponse ? featuresForResponse.map((f: any) => f.Feature) : [];

      // Populate service levels for response
      const levelsQuery = `
        SELECT 
          Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
          LicenseCost, LicenseMargin, ProfessionalServicesPrice,
          ProfessionalServicesCost, ProfessionalServicesMargin,
          PricingUnit, DisplayOrder
        FROM dbo.MspServiceLevels 
        WHERE OfferingId = @offeringId 
        ORDER BY DisplayOrder ASC
      `;
      const levels = await executeQuery<any>(levelsQuery, { offeringId: offeringId });
      
      if (Array.isArray(levels)) {
        for (let level of levels) {
          // Get options for each service level
          const optionsQuery = `
            SELECT 
              Id, ServiceLevelId, Name, Description, MonthlyPrice,
              MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
            FROM dbo.MspServiceLevelOptions 
            WHERE ServiceLevelId = @serviceLevelId 
            ORDER BY DisplayOrder ASC
          `;
          const options = await executeQuery<any>(optionsQuery, { serviceLevelId: level.Id });
          level.options = options || [];
        }
      }
      
      newOffering.ServiceLevels = levels || [];

      return newOffering;
    } catch (error) {
      console.error('Error creating offering:', error);
      throw error;
    }
  }

  /**
   * Update offering with features and service levels
   */
  static async updateOffering(id: string, updates: Partial<MSPOffering>): Promise<MSPOffering | null> {
    console.log('[updateOffering] Received updates for offering:', {
      id,
      hasServiceLevels: !!((updates as any).ServiceLevels || (updates as any).serviceLevels),
      serviceLevelCount: ((updates as any).ServiceLevels || (updates as any).serviceLevels)?.length || 0,
      firstLevel: ((updates as any).ServiceLevels || (updates as any).serviceLevels)?.[0]
    });

    const fields: string[] = [];
    const params: Record<string, any> = { id };

    if (updates.Name !== undefined) {
      fields.push('Name = @name');
      params.name = updates.Name;
    }
    if (updates.Description !== undefined) {
      fields.push('Description = @description');
      params.description = updates.Description || null;
    }
    if (updates.ImageUrl !== undefined) {
      fields.push('ImageUrl = @imageUrl');
      params.imageUrl = updates.ImageUrl || null;
    }
    if (updates.Category !== undefined) {
      fields.push('Category = @category');
      params.category = updates.Category.toLowerCase();
    }
    if (updates.BasePrice !== undefined) {
      fields.push('BasePrice = @basePrice');
      params.basePrice = updates.BasePrice;
    }
    if (updates.PricingUnit !== undefined) {
      fields.push('PricingUnit = @pricingUnit');
      params.pricingUnit = updates.PricingUnit;
    }
    if (updates.SetupFee !== undefined) {
      fields.push('SetupFee = @setupFee');
      params.setupFee = updates.SetupFee;
    }
    if (updates.SetupFeeCost !== undefined) {
      fields.push('SetupFeeCost = @setupFeeCost');
      params.setupFeeCost = updates.SetupFeeCost;
    }
    if (updates.SetupFeeMargin !== undefined) {
      fields.push('SetupFeeMargin = @setupFeeMargin');
      params.setupFeeMargin = updates.SetupFeeMargin;
    }
    if (updates.IsActive !== undefined) {
      fields.push('IsActive = @isActive');
      params.isActive = updates.IsActive ? 1 : 0;
    }
    if (updates.DisplayOrder !== undefined) {
      fields.push('DisplayOrder = @displayOrder');
      params.displayOrder = updates.DisplayOrder;
    }

    fields.push('LastModified = @lastModified');
    params.lastModified = new Date().toISOString().split('T')[0];

    try {
      // Update base offering fields
      const query = `
        UPDATE dbo.MspOfferings
        SET ${fields.join(', ')}
        WHERE Id = @id;
        
        SELECT 
          Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
          SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
          CreatedDate, LastModified, CreatedAt, UpdatedAt
        FROM dbo.MspOfferings
        WHERE Id = @id
      `;

      const results = await executeQuery<MSPOffering>(query, params);
      let updatedOffering = results && results.length > 0 ? results[0] : null;

      if (!updatedOffering) return null;

      // Handle features updates (support both camelCase and PascalCase)
      const inputFeatures = (updates as any).Features || (updates as any).features;
      if (inputFeatures && Array.isArray(inputFeatures)) {
        // Delete existing features
        await executeQuery(`DELETE FROM dbo.MspOfferingFeatures WHERE OfferingId = @offeringId`, { offeringId: id });

        // Insert new features
        for (let i = 0; i < inputFeatures.length; i++) {
          const feature = inputFeatures[i];
          await executeQuery(
            `INSERT INTO dbo.MspOfferingFeatures (OfferingId, Feature, DisplayOrder)
             VALUES (@offeringId, @feature, @displayOrder)`,
            {
              offeringId: id,
              feature: feature || '',
              displayOrder: i
            }
          );
        }
      }

      // Handle service levels updates (support both camelCase and PascalCase)
      const inputServiceLevels = (updates as any).ServiceLevels || (updates as any).serviceLevels;
      if (inputServiceLevels && Array.isArray(inputServiceLevels)) {
        console.log('[updateOffering] Processing service levels:', {
          count: inputServiceLevels.length,
          firstLevel: JSON.stringify(inputServiceLevels[0], null, 2)
        });

        // Delete existing service levels (cascades to options)
        await executeQuery(`DELETE FROM dbo.MspServiceLevels WHERE OfferingId = @offeringId`, { offeringId: id });

        // Insert new service levels
        for (let levelIndex = 0; levelIndex < inputServiceLevels.length; levelIndex++) {
          const level = inputServiceLevels[levelIndex];
          const levelId = level.Id || level.id || uuidv4();

          // Extract values — check camelCase first (frontend sends camelCase),
          // then PascalCase (database/backend uses PascalCase) as fallback.
          const basePrice = level.basePrice ?? level.BasePrice ?? 0;
          const baseCost = level.baseCost ?? level.BaseCost ?? null;
          const marginPercent = level.marginPercent ?? level.MarginPercent ?? null;
          const licenseCost = level.licenseCost ?? level.LicenseCost ?? null;
          const licenseMargin = level.licenseMargin ?? level.LicenseMargin ?? null;
          const professionalServicesPrice = level.professionalServicesPrice ?? level.ProfessionalServicesPrice ?? null;
          const professionalServicesCost = level.professionalServicesCost ?? level.ProfessionalServicesCost ?? null;
          const professionalServicesMargin = level.professionalServicesMargin ?? level.ProfessionalServicesMargin ?? null;

          console.log(`[updateOffering] Inserting service level ${levelIndex}:`, {
            name: level.Name || level.name,
            basePrice,
            baseCost,
            marginPercent,
            licenseCost,
            licenseMargin,
            professionalServicesPrice,
            professionalServicesCost,
            professionalServicesMargin,
            pricingUnit: level.PricingUnit || level.pricingUnit,
            originalLevel: level
          });

          await executeQuery(
            `INSERT INTO dbo.MspServiceLevels (
              Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
              LicenseCost, LicenseMargin, ProfessionalServicesPrice,
              ProfessionalServicesCost, ProfessionalServicesMargin,
              PricingUnit, DisplayOrder
            )
            VALUES (
              @id, @offeringId, @name, @basePrice, @baseCost, @marginPercent,
              @licenseCost, @licenseMargin, @professionalServicesPrice,
              @professionalServicesCost, @professionalServicesMargin,
              @pricingUnit, @displayOrder
            )`,
            {
              id: levelId,
              offeringId: id,
              name: level.Name || level.name || '',
              basePrice: basePrice,
              baseCost: baseCost,
              marginPercent: marginPercent,
              licenseCost: licenseCost,
              licenseMargin: licenseMargin,
              professionalServicesPrice: professionalServicesPrice,
              professionalServicesCost: professionalServicesCost,
              professionalServicesMargin: professionalServicesMargin,
              pricingUnit: level.PricingUnit || level.pricingUnit || 'per-user',
              displayOrder: (level.DisplayOrder !== undefined ? level.DisplayOrder : level.displayOrder) || levelIndex
            }
          );

          // Insert service level options
          const levelOptions = level.Options || level.options || [];
          if (Array.isArray(levelOptions)) {
            console.log(`[updateOffering] Level has ${levelOptions.length} options`);
            for (let optionIndex = 0; optionIndex < levelOptions.length; optionIndex++) {
              const option = levelOptions[optionIndex];
              const optionId = option.Id || option.id || uuidv4();

              const monthlyPrice = (option.MonthlyPrice !== undefined ? option.MonthlyPrice : option.monthlyPrice) || 0;
              const monthlyCost = option.MonthlyCost || option.monthlyCost || null;
              const optionMarginPercent = option.MarginPercent || option.marginPercent || null;
              const optionPricingUnit = option.PricingUnit || option.pricingUnit || 'per-user';

              console.log(`[updateOffering] Inserting option ${optionIndex}:`, {
                name: option.Name || option.name,
                monthlyPrice,
                monthlyCost,
                marginPercent: optionMarginPercent,
                pricingUnit: optionPricingUnit
              });

              await executeQuery(
                `INSERT INTO dbo.MspServiceLevelOptions (
                  Id, ServiceLevelId, Name, Description, MonthlyPrice,
                  MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
                )
                VALUES (
                  @id, @serviceLevelId, @name, @description, @monthlyPrice,
                  @monthlyCost, @marginPercent, @pricingUnit, @displayOrder
                )`,
                {
                  id: optionId,
                  serviceLevelId: levelId,
                  name: option.Name || option.name || '',
                  description: option.Description || option.description || null,
                  monthlyPrice: monthlyPrice,
                  monthlyCost: monthlyCost,
                  marginPercent: optionMarginPercent,
                  pricingUnit: optionPricingUnit,
                  displayOrder: (option.DisplayOrder !== undefined ? option.DisplayOrder : option.displayOrder) || optionIndex
                }
              );
            }
          }
        }
      }

      // Populate features for response
      const featuresQueryForResponse = `
        SELECT Feature FROM dbo.MspOfferingFeatures 
        WHERE OfferingId = @offeringId 
        ORDER BY DisplayOrder ASC
      `;
      const featuresResponseData = await executeQuery<any>(featuresQueryForResponse, { offeringId: id });
      updatedOffering.Features = featuresResponseData ? featuresResponseData.map((f: any) => f.Feature) : [];

      // Populate service levels for response
      const levelsQueryForResponse = `
        SELECT 
          Id, OfferingId, Name, BasePrice, BaseCost, MarginPercent,
          LicenseCost, LicenseMargin, ProfessionalServicesPrice,
          ProfessionalServicesCost, ProfessionalServicesMargin,
          PricingUnit, DisplayOrder
        FROM dbo.MspServiceLevels 
        WHERE OfferingId = @offeringId 
        ORDER BY DisplayOrder ASC
      `;
      const levelsForResponse = await executeQuery<any>(levelsQueryForResponse, { offeringId: id });
      
      console.log('[updateOffering] Service levels queried from database:', {
        count: levelsForResponse?.length || 0,
        firstLevel: levelsForResponse?.[0] ? JSON.stringify(levelsForResponse[0], null, 2) : null
      });

      if (Array.isArray(levelsForResponse)) {
        for (let level of levelsForResponse) {
          // Get options for each service level
          const optionsQuery = `
            SELECT 
              Id, ServiceLevelId, Name, Description, MonthlyPrice,
              MonthlyCost, MarginPercent, PricingUnit, DisplayOrder
            FROM dbo.MspServiceLevelOptions 
            WHERE ServiceLevelId = @serviceLevelId 
            ORDER BY DisplayOrder ASC
          `;
          const options = await executeQuery<any>(optionsQuery, { serviceLevelId: level.Id });
          level.options = options || [];
        }
      }
      
      updatedOffering.ServiceLevels = levelsForResponse || [];

      console.log('[updateOffering] FINAL RESULT - Service levels persisted to database:', {
        count: updatedOffering.ServiceLevels?.length || 0,
        firstLevel: updatedOffering.ServiceLevels?.[0] ? {
          name: updatedOffering.ServiceLevels[0].Name,
          basePrice: updatedOffering.ServiceLevels[0].BasePrice,
          licenseCost: updatedOffering.ServiceLevels[0].LicenseCost,
          licenseMargin: updatedOffering.ServiceLevels[0].LicenseMargin,
          professionalServicesPrice: updatedOffering.ServiceLevels[0].ProfessionalServicesPrice,
          pricingUnit: updatedOffering.ServiceLevels[0].PricingUnit
        } : null
      });

      return updatedOffering;
    } catch (error) {
      console.error('Error updating offering:', error);
      throw error;
    }
  }

  /**
   * Delete offering (soft delete - mark as inactive)
   */
  static async deleteOffering(id: string): Promise<boolean> {
    const query = `
      UPDATE dbo.MspOfferings
      SET IsActive = 0, LastModified = @lastModified
      WHERE Id = @id
    `;

    try {
      await executeQuery(query, { id, lastModified: new Date().toISOString().split('T')[0] });
      return true;
    } catch (error) {
      console.error('Error deleting offering:', error);
      throw error;
    }
  }

  /**
   * Toggle offering status
   */
  static async toggleOfferingStatus(id: string): Promise<MSPOffering | null> {
    const offering = await this.getOfferingById(id);
    if (!offering) return null;

    return this.updateOffering(id, { IsActive: !offering.IsActive });
  }

  /**
   * Search offerings
   */
  static async searchOfferings(searchTerm: string): Promise<MSPOffering[]> {
    const query = `
      SELECT 
        Id, Name, Description, ImageUrl, Category, BasePrice, PricingUnit,
        SetupFee, SetupFeeCost, SetupFeeMargin, IsActive, DisplayOrder,
        CreatedDate, LastModified, CreatedAt, UpdatedAt
      FROM dbo.MspOfferings
      WHERE (Name LIKE @searchTerm OR Description LIKE @searchTerm) AND IsActive = 1
      ORDER BY DisplayOrder ASC, Name ASC
    `;

    try {
      const results = await executeQuery<MSPOffering>(query, { searchTerm: `%${searchTerm}%` });
      return results || [];
    } catch (error) {
      console.error('Error searching offerings:', error);
      throw error;
    }
  }
}
