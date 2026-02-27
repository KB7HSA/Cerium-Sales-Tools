import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Zod-based request body validation middleware factory.
 * Returns Express middleware that validates req.body against the provided schema.
 * Invalid requests are rejected with a 400 status and detailed error messages.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }
    // Replace req.body with the validated & stripped data (removes unknown keys)
    req.body = result.data;
    next();
  };
}

// ===== CUSTOMER SCHEMAS =====

export const createCustomerSchema = z.object({
  Name: z.string().min(1, 'Name is required').max(255),
  Company: z.string().max(255).optional(),
  Email: z.string().email('Invalid email format').max(255).optional(),
  Phone: z.string().max(50).optional(),
  Status: z.enum(['active', 'inactive', 'prospect', 'lead']).optional().default('active'),
  Industry: z.string().max(255).optional(),
  Website: z.string().url('Invalid URL').max(500).or(z.literal('')).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ===== LABOR ITEM SCHEMAS =====

export const createLaborItemSchema = z.object({
  Name: z.string().min(1, 'Name is required').max(255),
  HoursPerUnit: z.number().min(0).max(100000),
  RatePerHour: z.number().min(0).max(10000),
  UnitPrice: z.number().min(0).max(10000000),
  UnitOfMeasure: z.string().max(100).optional(),
  Section: z.string().max(255).optional(),
  ReferenceArchitecture: z.string().max(255).optional(),
  Description: z.string().max(4000).optional(),
  IsActive: z.boolean().optional().default(true),
});

export const updateLaborItemSchema = createLaborItemSchema.partial();

// ===== QUOTE SCHEMAS =====

export const createQuoteSchema = z.object({
  QuoteType: z.string().max(100).optional(),
  CustomerId: z.string().max(100).optional(),
  CustomerName: z.string().max(255).optional(),
  Notes: z.string().max(10000).optional(),
  ServiceName: z.string().max(255).optional(),
  ServiceLevelName: z.string().max(255).optional(),
  PricingUnitLabel: z.string().max(255).optional(),
  BasePricePerUnit: z.number().min(0).optional(),
  ProfessionalServicesPrice: z.number().min(0).optional(),
  ProfessionalServicesTotal: z.number().min(0).optional(),
  PerUnitTotal: z.number().min(0).optional(),
  AddOnMonthlyTotal: z.number().min(0).optional(),
  AddOnOneTimeTotal: z.number().min(0).optional(),
  AddOnPerUnitTotal: z.number().min(0).optional(),
  NumberOfUsers: z.number().int().min(0).optional(),
  DurationMonths: z.number().int().min(0).optional(),
  MonthlyPrice: z.number().min(0).optional(),
  TotalPrice: z.number().min(0).optional(),
  SetupFee: z.number().min(0).optional(),
  DiscountAmount: z.number().min(0).optional(),
  AnnualDiscountApplied: z.boolean().optional(),
  TotalHours: z.number().min(0).optional(),
  Status: z.string().max(50).optional(),
  selectedOptions: z.array(z.any()).optional(),
}).passthrough(); // Allow additional fields like CreatedBy etc.

export const updateQuoteSchema = createQuoteSchema.partial();

// ===== MSP OFFERING SCHEMAS =====

export const createMSPOfferingSchema = z.object({
  Name: z.string().min(1, 'Name is required').max(255),
  Description: z.string().max(4000).optional(),
  IsActive: z.boolean().optional(),
}).passthrough(); // MSP offerings have many dynamic fields

// ===== AI GENERATION SCHEMAS =====

export const aiRenewalsAnalysisSchema = z.object({
  customerName: z.string().min(1, 'customerName is required').max(255),
  hardwareItems: z.array(z.any()).optional(),
  softwareItems: z.array(z.any()).optional(),
  hwSummary: z.any().optional(),
  swSummary: z.any().optional(),
  hwByArchitecture: z.any().optional(),
  swByArchitecture: z.any().optional(),
  hwEolTimeline: z.any().optional(),
  swEndingSoon: z.any().optional(),
});

export const renewalsPromptSchema = z.object({
  promptText: z.string().min(1, 'promptText is required').max(50000),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(100).max(128000).optional().default(4000),
  updatedBy: z.string().max(255).optional(),
});

// ===== USER ROLE SCHEMA =====

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user', 'readonly'] as const, {
    error: 'Role must be one of: admin, manager, user, readonly',
  }),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.string().max(100)),
});
