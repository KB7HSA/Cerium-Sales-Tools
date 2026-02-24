import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/error.middleware';
import { CustomerService } from '../services/customer.service';
import { QuoteService } from '../services/quote.service';
import { LaborItemService } from '../services/labor-item.service';
import { MSPOfferingService } from '../services/msp-offering.service';
import { ExportSchemaService } from '../services/export-schema.service';
import { SOWDocumentService } from '../services/sow-document.service';
import { ReferenceArchitectureService, AssessmentTypeService, GeneratedAssessmentService } from '../services/assessment.service';
import { USACForm470Service } from '../services/usac470.service';
import { USACFRNStatusService } from '../services/usac-frn.service';
import { ERateSettingsService } from '../services/erate-settings.service';
import { AzureOpenAIService } from '../services/openai.service';
import { TechnicalResourcesService } from '../services/technical-resources.service';
import { userService } from '../services/user.service';
import { executeQuery } from '../config/database';

const router = Router();

// ===== HEALTH CHECK =====
router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'API is running', timestamp: new Date() }, 200, 'Health check passed');
});

// ===== DATABASE MIGRATIONS (temporary endpoint) =====
router.post('/run-migration/add-template-filename', async (req: Request, res: Response) => {
  try {
    // Check if column exists
    const checkResult = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AssessmentTypes') AND name = 'TemplateFileName'`,
      {}
    );
    
    if (checkResult[0].cnt > 0) {
      sendSuccess(res, { message: 'TemplateFileName column already exists' }, 200, 'Migration not needed');
      return;
    }
    
    // Add the column
    await executeQuery(`ALTER TABLE dbo.AssessmentTypes ADD TemplateFileName NVARCHAR(255) NULL`, {});
    
    // Update existing rows with default value
    await executeQuery(
      `UPDATE dbo.AssessmentTypes SET TemplateFileName = 'Assessment-Template.docx' WHERE TemplateFileName IS NULL`,
      {}
    );
    
    sendSuccess(res, { message: 'TemplateFileName column added successfully' }, 200, 'Migration completed');
  } catch (error: any) {
    sendError(res, 'Migration failed', 500, error.message);
  }
});

// ===== CUSTOMERS =====

router.get('/customers', async (req: Request, res: Response) => {
  try {
    const customers = await CustomerService.getAllCustomers();
    sendSuccess(res, customers, 200, 'Customers retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve customers', 500, error.message);
  }
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await CustomerService.getCustomerById(req.params.id);
    if (!customer) {
      sendError(res, 'Customer not found', 404);
    } else {
      sendSuccess(res, customer, 200, 'Customer retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve customer', 500, error.message);
  }
});

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const newCustomer = await CustomerService.createCustomer(req.body);
    sendSuccess(res, newCustomer, 201, 'Customer created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create customer', 500, error.message);
  }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const updated = await CustomerService.updateCustomer(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Customer not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Customer updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update customer', 500, error.message);
  }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    await CustomerService.deleteCustomer(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Customer deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete customer', 500, error.message);
  }
});

router.get('/customers/search/:term', async (req: Request, res: Response) => {
  try {
    const results = await CustomerService.searchCustomers(req.params.term);
    sendSuccess(res, results, 200, 'Search completed');
  } catch (error: any) {
    sendError(res, 'Search failed', 500, error.message);
  }
});

// ===== QUOTES =====

router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const quotes = await QuoteService.getAllQuotes(status);
    sendSuccess(res, quotes, 200, 'Quotes retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve quotes', 500, error.message);
  }
});

router.get('/quotes/:id', async (req: Request, res: Response) => {
  try {
    const quote = await QuoteService.getQuoteById(req.params.id);
    if (!quote.quote) {
      sendError(res, 'Quote not found', 404);
    } else {
      sendSuccess(res, quote, 200, 'Quote retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve quote', 500, error.message);
  }
});

router.post('/quotes', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const quoteType = (body.QuoteType || body.type || 'msp').toLowerCase();

    if (quoteType === 'labor' && (body.workItems?.length > 0 || body.laborGroups?.length > 0)) {
      const workItems = body.workItems || [];
      const laborGroups = body.laborGroups || [];
      const newQuote = await QuoteService.createLaborQuote(body, workItems, laborGroups);
      // Attach workItems and laborGroups to response
      const fullQuote = await QuoteService.getQuoteById(newQuote.Id);
      const responseData = {
        ...fullQuote.quote,
        workItems: fullQuote.workItems,
        laborGroups: fullQuote.laborGroups,
        selectedOptions: fullQuote.selectedOptions
      };
      sendSuccess(res, responseData, 201, 'Labor quote created successfully');
    } else {
      const newQuote = await QuoteService.createQuote(body);
      sendSuccess(res, newQuote, 201, 'Quote created successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to create quote', 500, error.message);
  }
});

router.put('/quotes/:id', async (req: Request, res: Response) => {
  try {
    const updated = await QuoteService.updateQuote(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Quote not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Quote updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update quote', 500, error.message);
  }
});

router.delete('/quotes/:id', async (req: Request, res: Response) => {
  try {
    await QuoteService.deleteQuote(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Quote deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete quote', 500, error.message);
  }
});

router.get('/quotes/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const quotes = await QuoteService.getQuotesByCustomer(req.params.customerId);
    sendSuccess(res, quotes, 200, 'Customer quotes retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve customer quotes', 500, error.message);
  }
});

// ===== LABOR ITEMS =====

router.get('/labor-items', async (req: Request, res: Response) => {
  try {
    const section = req.query.section as string | undefined;
    const items = await LaborItemService.getAllLaborItems(section);
    sendSuccess(res, items, 200, 'Labor items retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve labor items', 500, error.message);
  }
});

router.get('/labor-items/section/:section', async (req: Request, res: Response) => {
  try {
    const items = await LaborItemService.getLaborItemsBySection(req.params.section);
    sendSuccess(res, items, 200, 'Labor items retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve labor items', 500, error.message);
  }
});

router.get('/labor-items/:id', async (req: Request, res: Response) => {
  try {
    const item = await LaborItemService.getLaborItemById(req.params.id);
    if (!item) {
      sendError(res, 'Labor item not found', 404);
    } else {
      sendSuccess(res, item, 200, 'Labor item retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve labor item', 500, error.message);
  }
});

router.get('/labor-sections', async (req: Request, res: Response) => {
  try {
    const sections = await LaborItemService.getAllSections();
    sendSuccess(res, sections, 200, 'Labor sections retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve labor sections', 500, error.message);
  }
});

router.post('/labor-items', async (req: Request, res: Response) => {
  try {
    const newItem = await LaborItemService.createLaborItem(req.body);
    sendSuccess(res, newItem, 201, 'Labor item created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create labor item', 500, error.message);
  }
});

router.put('/labor-items/:id', async (req: Request, res: Response) => {
  try {
    const updated = await LaborItemService.updateLaborItem(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Labor item not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Labor item updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update labor item', 500, error.message);
  }
});

router.delete('/labor-items/:id', async (req: Request, res: Response) => {
  try {
    await LaborItemService.deleteLaborItem(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Labor item deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete labor item', 500, error.message);
  }
});

router.get('/labor-items/search/:term', async (req: Request, res: Response) => {
  try {
    const results = await LaborItemService.searchLaborItems(req.params.term);
    sendSuccess(res, results, 200, 'Search completed');
  } catch (error: any) {
    sendError(res, 'Search failed', 500, error.message);
  }
});

// ===== MSP OFFERINGS =====

router.get('/msp-offerings', async (req: Request, res: Response) => {
  try {
    const offerings = await MSPOfferingService.getAllOfferings(true);
    sendSuccess(res, offerings, 200, 'MSP offerings retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve MSP offerings', 500, error.message);
  }
});

router.get('/msp-offerings/:id', async (req: Request, res: Response) => {
  try {
    const offering = await MSPOfferingService.getOfferingById(req.params.id);
    if (!offering) {
      sendError(res, 'MSP offering not found', 404);
    } else {
      sendSuccess(res, offering, 200, 'MSP offering retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve MSP offering', 500, error.message);
  }
});

router.post('/msp-offerings', async (req: Request, res: Response) => {
  try {
    console.log('[POST /msp-offerings] Received request body:', JSON.stringify(req.body, null, 2));
    const newOffering = await MSPOfferingService.createOffering(req.body);
    console.log('[POST /msp-offerings] Successfully created offering:', newOffering.Id);
    sendSuccess(res, newOffering, 201, 'MSP offering created successfully');
  } catch (error: any) {
    console.error('[POST /msp-offerings] Error creating offering:', error);
    sendError(res, 'Failed to create MSP offering', 500, error.message);
  }
});

router.put('/msp-offerings/:id', async (req: Request, res: Response) => {
  try {
    const updated = await MSPOfferingService.updateOffering(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'MSP offering not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'MSP offering updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update MSP offering', 500, error.message);
  }
});

router.delete('/msp-offerings/:id', async (req: Request, res: Response) => {
  try {
    await MSPOfferingService.deleteOffering(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'MSP offering deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete MSP offering', 500, error.message);
  }
});

router.get('/msp-offerings/category/:category', async (req: Request, res: Response) => {
  try {
    const offerings = await MSPOfferingService.getOfferingsByCategory(req.params.category);
    sendSuccess(res, offerings, 200, 'MSP offerings retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve MSP offerings by category', 500, error.message);
  }
});

router.get('/msp-offerings/search/:term', async (req: Request, res: Response) => {
  try {
    const offerings = await MSPOfferingService.searchOfferings(req.params.term);
    sendSuccess(res, offerings, 200, 'Search completed');
  } catch (error: any) {
    sendError(res, 'Search failed', 500, error.message);
  }
});

router.post('/msp-offerings/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const updated = await MSPOfferingService.toggleOfferingStatus(req.params.id);
    if (!updated) {
      sendError(res, 'MSP offering not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'MSP offering status toggled successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to toggle MSP offering status', 500, error.message);
  }
});

// ===== EXPORT SCHEMAS =====

router.get('/export-schemas', async (req: Request, res: Response) => {
  try {
    const schemas = await ExportSchemaService.getAllSchemas();
    sendSuccess(res, schemas, 200, 'Export schemas retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve export schemas', 500, error.message);
  }
});

router.get('/export-schemas/quote-types', (req: Request, res: Response) => {
  try {
    const quoteTypes = ExportSchemaService.getQuoteTypes();
    sendSuccess(res, quoteTypes, 200, 'Quote types retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve quote types', 500, error.message);
  }
});

router.get('/export-schemas/available-fields', (req: Request, res: Response) => {
  try {
    const fields = ExportSchemaService.getAvailableFields();
    sendSuccess(res, fields, 200, 'Available fields retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve available fields', 500, error.message);
  }
});

router.get('/export-schemas/by-type/:quoteType', async (req: Request, res: Response) => {
  try {
    const schemas = await ExportSchemaService.getSchemasByQuoteType(req.params.quoteType);
    sendSuccess(res, schemas, 200, 'Export schemas retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve export schemas', 500, error.message);
  }
});

router.get('/export-schemas/default/:quoteType', async (req: Request, res: Response) => {
  try {
    const schema = await ExportSchemaService.getDefaultSchema(req.params.quoteType);
    if (!schema) {
      sendError(res, 'No default schema found for this quote type', 404);
    } else {
      sendSuccess(res, schema, 200, 'Default export schema retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve default export schema', 500, error.message);
  }
});

router.get('/export-schemas/:id', async (req: Request, res: Response) => {
  try {
    const schema = await ExportSchemaService.getSchemaById(req.params.id);
    if (!schema) {
      sendError(res, 'Export schema not found', 404);
    } else {
      sendSuccess(res, schema, 200, 'Export schema retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve export schema', 500, error.message);
  }
});

router.post('/export-schemas', async (req: Request, res: Response) => {
  try {
    const newSchema = await ExportSchemaService.createSchema(req.body);
    sendSuccess(res, newSchema, 201, 'Export schema created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create export schema', 500, error.message);
  }
});

router.put('/export-schemas/:id', async (req: Request, res: Response) => {
  try {
    const updated = await ExportSchemaService.updateSchema(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Export schema not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Export schema updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update export schema', 500, error.message);
  }
});

router.delete('/export-schemas/:id', async (req: Request, res: Response) => {
  try {
    await ExportSchemaService.deleteSchema(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Export schema deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete export schema', 500, error.message);
  }
});

// ===== SOW DOCUMENTS =====

router.get('/sow-documents', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const documents = await SOWDocumentService.getAllSOWDocuments(status);
    sendSuccess(res, documents, 200, 'SOW documents retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve SOW documents', 500, error.message);
  }
});

router.get('/sow-documents/:id', async (req: Request, res: Response) => {
  try {
    const doc = await SOWDocumentService.getSOWDocumentById(req.params.id);
    if (!doc) {
      sendError(res, 'SOW document not found', 404);
    } else {
      sendSuccess(res, doc, 200, 'SOW document retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve SOW document', 500, error.message);
  }
});

router.get('/sow-documents/:id/download', async (req: Request, res: Response) => {
  try {
    const file = await SOWDocumentService.getSOWDocumentFile(req.params.id);
    if (!file) {
      sendError(res, 'SOW document not found', 404);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.send(file.fileData);
    }
  } catch (error: any) {
    sendError(res, 'Failed to download SOW document', 500, error.message);
  }
});

router.get('/sow-documents/quote/:quoteId', async (req: Request, res: Response) => {
  try {
    const documents = await SOWDocumentService.getSOWDocumentsByQuoteId(req.params.quoteId);
    sendSuccess(res, documents, 200, 'SOW documents for quote retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve SOW documents for quote', 500, error.message);
  }
});

router.post('/sow-documents', async (req: Request, res: Response) => {
  try {
    // Expect base64 encoded file data
    const { QuoteId, CustomerName, ServiceName, FileName, FileDataBase64, TotalValue, MonthlyValue, DurationMonths, GeneratedBy, Notes } = req.body;
    
    if (!QuoteId || !CustomerName || !ServiceName || !FileName || !FileDataBase64) {
      sendError(res, 'Missing required fields: QuoteId, CustomerName, ServiceName, FileName, FileDataBase64', 400);
      return;
    }

    const fileData = Buffer.from(FileDataBase64, 'base64');
    
    const newDoc = await SOWDocumentService.createSOWDocument({
      QuoteId,
      CustomerName,
      ServiceName,
      FileName,
      FileData: fileData,
      TotalValue,
      MonthlyValue,
      DurationMonths,
      GeneratedBy,
      Notes
    });
    sendSuccess(res, newDoc, 201, 'SOW document created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create SOW document', 500, error.message);
  }
});

router.put('/sow-documents/:id', async (req: Request, res: Response) => {
  try {
    const updated = await SOWDocumentService.updateSOWDocument(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'SOW document not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'SOW document updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update SOW document', 500, error.message);
  }
});

router.put('/sow-documents/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      sendError(res, 'Status is required', 400);
      return;
    }
    await SOWDocumentService.updateSOWDocumentStatus(req.params.id, status);
    sendSuccess(res, { id: req.params.id, status }, 200, 'SOW document status updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update SOW document status', 500, error.message);
  }
});

router.delete('/sow-documents/:id', async (req: Request, res: Response) => {
  try {
    await SOWDocumentService.deleteSOWDocument(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'SOW document deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete SOW document', 500, error.message);
  }
});

// ===== REFERENCE ARCHITECTURES =====

router.get('/reference-architectures', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const architectures = await ReferenceArchitectureService.getAll(activeOnly);
    sendSuccess(res, architectures, 200, 'Reference architectures retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve reference architectures', 500, error.message);
  }
});

router.get('/reference-architectures/:id', async (req: Request, res: Response) => {
  try {
    const architecture = await ReferenceArchitectureService.getById(req.params.id);
    if (!architecture) {
      sendError(res, 'Reference architecture not found', 404);
    } else {
      sendSuccess(res, architecture, 200, 'Reference architecture retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve reference architecture', 500, error.message);
  }
});

router.post('/reference-architectures', async (req: Request, res: Response) => {
  try {
    const newArchitecture = await ReferenceArchitectureService.create(req.body);
    sendSuccess(res, newArchitecture, 201, 'Reference architecture created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create reference architecture', 500, error.message);
  }
});

router.put('/reference-architectures/:id', async (req: Request, res: Response) => {
  try {
    const updated = await ReferenceArchitectureService.update(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Reference architecture not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Reference architecture updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update reference architecture', 500, error.message);
  }
});

router.delete('/reference-architectures/:id', async (req: Request, res: Response) => {
  try {
    await ReferenceArchitectureService.delete(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Reference architecture deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete reference architecture', 500, error.message);
  }
});

// ===== ASSESSMENT TYPES =====

router.get('/assessment-types', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const assessmentTypes = await AssessmentTypeService.getAll(activeOnly);
    sendSuccess(res, assessmentTypes, 200, 'Assessment types retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve assessment types', 500, error.message);
  }
});

router.get('/assessment-types/:id', async (req: Request, res: Response) => {
  try {
    const assessmentType = await AssessmentTypeService.getById(req.params.id);
    if (!assessmentType) {
      sendError(res, 'Assessment type not found', 404);
    } else {
      sendSuccess(res, assessmentType, 200, 'Assessment type retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve assessment type', 500, error.message);
  }
});

router.post('/assessment-types', async (req: Request, res: Response) => {
  try {
    const newAssessmentType = await AssessmentTypeService.create(req.body);
    sendSuccess(res, newAssessmentType, 201, 'Assessment type created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create assessment type', 500, error.message);
  }
});

router.put('/assessment-types/:id', async (req: Request, res: Response) => {
  try {
    const updated = await AssessmentTypeService.update(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Assessment type not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Assessment type updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update assessment type', 500, error.message);
  }
});

router.delete('/assessment-types/:id', async (req: Request, res: Response) => {
  try {
    await AssessmentTypeService.delete(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Assessment type deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete assessment type', 500, error.message);
  }
});

// ===== GENERATED ASSESSMENTS =====

router.get('/generated-assessments', async (req: Request, res: Response) => {
  try {
    const assessments = await GeneratedAssessmentService.getAll();
    sendSuccess(res, assessments, 200, 'Generated assessments retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve generated assessments', 500, error.message);
  }
});

router.get('/generated-assessments/:id', async (req: Request, res: Response) => {
  try {
    const assessment = await GeneratedAssessmentService.getById(req.params.id);
    if (!assessment) {
      sendError(res, 'Generated assessment not found', 404);
    } else {
      sendSuccess(res, assessment, 200, 'Generated assessment retrieved successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve generated assessment', 500, error.message);
  }
});

router.get('/generated-assessments/:id/download', async (req: Request, res: Response) => {
  try {
    const file = await GeneratedAssessmentService.getFile(req.params.id);
    if (!file) {
      sendError(res, 'Assessment document not found', 404);
      return;
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${file.FileName}"`);
    res.send(file.FileData);
  } catch (error: any) {
    sendError(res, 'Failed to download assessment document', 500, error.message);
  }
});

router.post('/generated-assessments', async (req: Request, res: Response) => {
  try {
    const { AssessmentTypeId, ReferenceArchitectureId, CustomerName, Title } = req.body;
    
    if (!AssessmentTypeId || !ReferenceArchitectureId || !CustomerName || !Title) {
      sendError(res, 'Missing required fields: AssessmentTypeId, ReferenceArchitectureId, CustomerName, Title', 400);
      return;
    }

    // Handle base64 file data if provided
    if (req.body.FileDataBase64) {
      req.body.FileData = Buffer.from(req.body.FileDataBase64, 'base64');
      req.body.FileSizeBytes = req.body.FileData.length;
    }

    const newAssessment = await GeneratedAssessmentService.create(req.body);
    sendSuccess(res, newAssessment, 201, 'Generated assessment created successfully');
  } catch (error: any) {
    sendError(res, 'Failed to create generated assessment', 500, error.message);
  }
});

router.put('/generated-assessments/:id', async (req: Request, res: Response) => {
  try {
    const updated = await GeneratedAssessmentService.update(req.params.id, req.body);
    if (!updated) {
      sendError(res, 'Generated assessment not found', 404);
    } else {
      sendSuccess(res, updated, 200, 'Generated assessment updated successfully');
    }
  } catch (error: any) {
    sendError(res, 'Failed to update generated assessment', 500, error.message);
  }
});

router.put('/generated-assessments/:id/document', async (req: Request, res: Response) => {
  try {
    const { FileName, FileDataBase64 } = req.body;
    if (!FileName || !FileDataBase64) {
      sendError(res, 'FileName and FileDataBase64 are required', 400);
      return;
    }
    
    const fileData = Buffer.from(FileDataBase64, 'base64');
    await GeneratedAssessmentService.updateDocument(req.params.id, FileName, fileData, fileData.length);
    sendSuccess(res, { id: req.params.id }, 200, 'Assessment document updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update assessment document', 500, error.message);
  }
});

router.put('/generated-assessments/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      sendError(res, 'Status is required', 400);
      return;
    }
    await GeneratedAssessmentService.updateStatus(req.params.id, status);
    sendSuccess(res, { id: req.params.id, status }, 200, 'Assessment status updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update assessment status', 500, error.message);
  }
});

router.delete('/generated-assessments/:id', async (req: Request, res: Response) => {
  try {
    await GeneratedAssessmentService.delete(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Generated assessment deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete generated assessment', 500, error.message);
  }
});

// ===== E-RATE FORM 470 =====

// Clear all Form 470 data (for fresh start)
router.delete('/erate/form470/clear', async (req: Request, res: Response) => {
  try {
    console.log('[API] Clearing all E-Rate Form 470 data...');
    await executeQuery('DELETE FROM dbo.ERateForm470', {});
    await executeQuery('DELETE FROM dbo.ERateRefreshHistory', {});
    console.log('[API] E-Rate data cleared successfully');
    sendSuccess(res, { cleared: true }, 200, 'All E-Rate data cleared successfully');
  } catch (error: any) {
    console.error('[API] Failed to clear E-Rate data:', error);
    sendError(res, 'Failed to clear E-Rate data', 500, error.message);
  }
});

// Get all Form 470 records
router.get('/erate/form470', async (req: Request, res: Response) => {
  try {
    const lastRefreshId = req.query.lastRefreshId as string | undefined;
    const records = await USACForm470Service.getAll(lastRefreshId);
    sendSuccess(res, records, 200, 'Form 470 records retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve Form 470 records', 500, error.message);
  }
});

// Download updates from USAC SODA API
router.post('/erate/form470/download', async (req: Request, res: Response) => {
  try {
    console.log('[API] Starting E-Rate Form 470 download...');
    const result = await USACForm470Service.downloadUpdates();
    
    if (result.error) {
      sendError(res, 'Download completed with errors', 500, result.error);
      return;
    }
    
    sendSuccess(res, result, 200, `Downloaded ${result.totalFetched} records (${result.totalNew} new, ${result.totalUpdated} updated)`);
  } catch (error: any) {
    console.error('[API] E-Rate download failed:', error);
    sendError(res, 'Failed to download Form 470 data', 500, error.message);
  }
});

// Get latest refresh info
router.get('/erate/form470/refresh/latest', async (req: Request, res: Response) => {
  try {
    const refresh = await USACForm470Service.getLatestRefresh();
    sendSuccess(res, refresh, 200, refresh ? 'Latest refresh retrieved successfully' : 'No refresh history found');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve refresh info', 500, error.message);
  }
});

// Get refresh history
router.get('/erate/form470/refresh/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const history = await USACForm470Service.getRefreshHistory(limit);
    sendSuccess(res, history, 200, 'Refresh history retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve refresh history', 500, error.message);
  }
});

// Update user status on a Form 470 record
router.patch('/erate/form470/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userStatus } = req.body;
    
    // Validate status value
    const validStatuses = ['', 'Bypassed', 'Responded', 'In Process', 'Reviewing', 'Not Interested'];
    if (userStatus && !validStatuses.includes(userStatus)) {
      sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      return;
    }
    
    await USACForm470Service.updateUserStatus(id, userStatus || null);
    sendSuccess(res, { id, userStatus }, 200, 'Status updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update status', 500, error.message);
  }
});

// Run E-Rate database migration
router.post('/erate/run-migration', async (req: Request, res: Response) => {
  try {
    // Check if tables exist
    const form470Exists = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ERateForm470'`,
      {}
    );
    
    const historyExists = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ERateRefreshHistory'`,
      {}
    );
    
    const results: string[] = [];
    
    // Create ERateForm470 table if not exists
    if (form470Exists[0].cnt === 0) {
      await executeQuery(`
        CREATE TABLE dbo.ERateForm470 (
          Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
          PrimaryKey NVARCHAR(200) NOT NULL,
          FirstSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          LastRefreshId UNIQUEIDENTIFIER NULL,
          ApplicationNumber NVARCHAR(50) NULL,
          FormNickname NVARCHAR(500) NULL,
          FormPdf NVARCHAR(MAX) NULL,
          ServiceRequestId NVARCHAR(50) NULL,
          ServiceRequestRfpAttachment NVARCHAR(MAX) NULL,
          RfpDocuments NVARCHAR(MAX) NULL,
          RfpUploadDate NVARCHAR(50) NULL,
          FormVersion NVARCHAR(20) NULL,
          FundingYear NVARCHAR(10) NULL,
          Fcc470Status NVARCHAR(100) NULL,
          AllowableContractDate NVARCHAR(50) NULL,
          CertifiedDateTime NVARCHAR(50) NULL,
          LastModifiedDateTime NVARCHAR(50) NULL,
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
          TechnicalContactName NVARCHAR(500) NULL,
          TechnicalContactTitle NVARCHAR(200) NULL,
          TechnicalContactPhone NVARCHAR(50) NULL,
          TechnicalContactPhoneExt NVARCHAR(20) NULL,
          TechnicalContactEmail NVARCHAR(500) NULL,
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
          OtherManufacturer NVARCHAR(500) NULL
        )
      `, {});
      
      // Create indexes
      await executeQuery(`CREATE UNIQUE NONCLUSTERED INDEX IX_ERateForm470_PrimaryKey ON dbo.ERateForm470 (PrimaryKey)`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateForm470_BilledEntityState ON dbo.ERateForm470 (BilledEntityState)`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateForm470_FundingYear ON dbo.ERateForm470 (FundingYear)`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateForm470_AllowableContractDate ON dbo.ERateForm470 (AllowableContractDate)`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateForm470_LastRefreshId ON dbo.ERateForm470 (LastRefreshId)`, {});
      
      results.push('Created ERateForm470 table with indexes');
    } else {
      results.push('ERateForm470 table already exists');
    }
    
    // Create ERateRefreshHistory table if not exists
    if (historyExists[0].cnt === 0) {
      await executeQuery(`
        CREATE TABLE dbo.ERateRefreshHistory (
          Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
          RefreshStartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          RefreshCompletedAt DATETIME2 NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT 'InProgress',
          TotalFetched INT NULL,
          TotalNew INT NULL,
          TotalUpdated INT NULL,
          ErrorMessage NVARCHAR(MAX) NULL
        )
      `, {});
      
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateRefreshHistory_Status ON dbo.ERateRefreshHistory (Status)`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateRefreshHistory_RefreshStartedAt ON dbo.ERateRefreshHistory (RefreshStartedAt DESC)`, {});
      
      results.push('Created ERateRefreshHistory table with indexes');
    } else {
      results.push('ERateRefreshHistory table already exists');
    }
    
    // Add UserStatus column if not exists
    const userStatusExists = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ERateForm470') AND name = 'UserStatus'`,
      {}
    );
    
    if (userStatusExists[0].cnt === 0) {
      await executeQuery(`ALTER TABLE dbo.ERateForm470 ADD UserStatus NVARCHAR(50) NULL`, {});
      await executeQuery(`CREATE NONCLUSTERED INDEX IX_ERateForm470_UserStatus ON dbo.ERateForm470 (UserStatus)`, {});
      results.push('Added UserStatus column with index');
    } else {
      results.push('UserStatus column already exists');
    }
    
    // Clean up duplicate records (keep most recent by LastSeenAt)
    const duplicateCheck = await executeQuery<{ DuplicateCount: number }>(
      `SELECT COUNT(*) - COUNT(DISTINCT PrimaryKey) as DuplicateCount FROM dbo.ERateForm470`,
      {}
    );
    
    if (duplicateCheck[0].DuplicateCount > 0) {
      await executeQuery(`
        WITH DuplicateCTE AS (
          SELECT Id, ROW_NUMBER() OVER (PARTITION BY PrimaryKey ORDER BY LastSeenAt DESC, Id) as RowNum
          FROM dbo.ERateForm470
        )
        DELETE FROM dbo.ERateForm470 WHERE Id IN (SELECT Id FROM DuplicateCTE WHERE RowNum > 1)
      `, {});
      results.push(`Removed ${duplicateCheck[0].DuplicateCount} duplicate records`);
    } else {
      results.push('No duplicate records found');
    }
    
    sendSuccess(res, { results }, 200, 'E-Rate migration completed');
  } catch (error: any) {
    sendError(res, 'E-Rate migration failed', 500, error.message);
  }
});

// ===== E-RATE SETTINGS =====

// Initialize E-Rate settings tables
router.post('/erate/settings/init', async (req: Request, res: Response) => {
  try {
    const results = await ERateSettingsService.ensureTablesExist();
    sendSuccess(res, { results }, 200, 'E-Rate settings tables initialized');
  } catch (error: any) {
    sendError(res, 'Failed to initialize E-Rate settings', 500, error.message);
  }
});

// Get all settings
router.get('/erate/settings', async (req: Request, res: Response) => {
  try {
    const settings = await ERateSettingsService.getAllSettings();
    sendSuccess(res, settings, 200, 'Settings retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve settings', 500, error.message);
  }
});

// Update a setting
router.put('/erate/settings/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (!value) {
      sendError(res, 'Setting value is required', 400);
      return;
    }
    
    const setting = await ERateSettingsService.upsertSetting(key, value, description);
    sendSuccess(res, setting, 200, 'Setting updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update setting', 500, error.message);
  }
});

// Get all status codes
router.get('/erate/status-codes', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const statusCodes = activeOnly 
      ? await ERateSettingsService.getActiveStatusCodes()
      : await ERateSettingsService.getAllStatusCodes();
    sendSuccess(res, statusCodes, 200, 'Status codes retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve status codes', 500, error.message);
  }
});

// Create a status code
router.post('/erate/status-codes', async (req: Request, res: Response) => {
  try {
    const { statusCode, displayName, colorClass, sortOrder } = req.body;
    
    if (!statusCode || !displayName) {
      sendError(res, 'Status code and display name are required', 400);
      return;
    }
    
    const created = await ERateSettingsService.createStatusCode(statusCode, displayName, colorClass, sortOrder);
    sendSuccess(res, created, 201, 'Status code created successfully');
  } catch (error: any) {
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      sendError(res, 'Status code already exists', 400);
    } else {
      sendError(res, 'Failed to create status code', 500, error.message);
    }
  }
});

// Update a status code
router.put('/erate/status-codes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updated = await ERateSettingsService.updateStatusCode(id, updates);
    if (!updated) {
      sendError(res, 'Status code not found', 404);
      return;
    }
    sendSuccess(res, updated, 200, 'Status code updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update status code', 500, error.message);
  }
});

// Delete a status code
router.delete('/erate/status-codes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ERateSettingsService.deleteStatusCode(id);
    sendSuccess(res, null, 200, 'Status code deleted successfully');
  } catch (error: any) {
    sendError(res, 'Failed to delete status code', 500, error.message);
  }
});

// ===== E-RATE FRN STATUS =====

// Get all FRN Status records
router.get('/erate/frn', async (req: Request, res: Response) => {
  try {
    const lastRefreshId = req.query.lastRefreshId as string | undefined;
    const records = await USACFRNStatusService.getAll(lastRefreshId);
    sendSuccess(res, records, 200, 'FRN Status records retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve FRN Status records', 500, error.message);
  }
});

// Download FRN updates from USAC SODA API (SSE progress stream)
router.post('/erate/frn/download', async (req: Request, res: Response) => {
  try {
    console.log('[API] Starting E-Rate FRN Status download with SSE progress...');

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Register progress callback
    USACFRNStatusService.progressCallback = (event) => {
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (e) {
        // Client disconnected
      }
    };

    const result = await USACFRNStatusService.downloadUpdates();

    // Send final result
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ phase: 'done', result })}\n\n`);
      res.end();
    }

    // Clean up callback
    USACFRNStatusService.progressCallback = null;

  } catch (error: any) {
    console.error('[API] E-Rate FRN download failed:', error);
    USACFRNStatusService.progressCallback = null;
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ phase: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Get latest FRN refresh info
router.get('/erate/frn/refresh/latest', async (req: Request, res: Response) => {
  try {
    const refresh = await USACFRNStatusService.getLatestRefresh();
    sendSuccess(res, refresh, 200, refresh ? 'Latest FRN refresh retrieved' : 'No FRN refresh history found');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve FRN refresh info', 500, error.message);
  }
});

// Get FRN refresh history
router.get('/erate/frn/refresh/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const history = await USACFRNStatusService.getRefreshHistory(limit);
    sendSuccess(res, history, 200, 'FRN refresh history retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve FRN refresh history', 500, error.message);
  }
});

// Update user status on a FRN record
router.patch('/erate/frn/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userStatus } = req.body;

    const validStatuses = ['', 'Bypassed', 'Responded', 'In Process', 'Reviewing', 'Not Interested'];
    if (userStatus && !validStatuses.includes(userStatus)) {
      sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      return;
    }

    await USACFRNStatusService.updateUserStatus(id, userStatus || null);
    sendSuccess(res, { id, userStatus }, 200, 'FRN status updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update FRN status', 500, error.message);
  }
});

// Clear all FRN data (for fresh start)
router.delete('/erate/frn/clear', async (req: Request, res: Response) => {
  try {
    console.log('[API] Clearing all E-Rate FRN data...');
    await executeQuery('DELETE FROM dbo.ERateFRNStatus', {});
    await executeQuery('DELETE FROM dbo.ERateFRNRefreshHistory', {});
    sendSuccess(res, { cleared: true }, 200, 'All FRN data cleared successfully');
  } catch (error: any) {
    sendError(res, 'Failed to clear FRN data', 500, error.message);
  }
});

// ===== USER TABLE PREFERENCES =====

// Get table preferences for a user
router.get('/user-preferences/table/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const userEmail = req.query.userEmail as string;
    
    if (!userEmail) {
      sendError(res, 'userEmail query parameter is required', 400);
      return;
    }
    
    const results = await executeQuery<{ Preferences: string }>(
      `SELECT Preferences FROM dbo.UserTablePreferences WHERE UserEmail = @userEmail AND TableName = @tableName`,
      { userEmail, tableName }
    );
    
    if (results.length > 0) {
      const preferences = JSON.parse(results[0].Preferences);
      sendSuccess(res, preferences, 200, 'Table preferences retrieved');
    } else {
      sendSuccess(res, null, 200, 'No saved preferences found');
    }
  } catch (error: any) {
    sendError(res, 'Failed to retrieve table preferences', 500, error.message);
  }
});

// Save/update table preferences for a user
router.put('/user-preferences/table/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { userEmail, preferences } = req.body;
    
    if (!userEmail || !preferences) {
      sendError(res, 'userEmail and preferences are required', 400);
      return;
    }
    
    const preferencesJson = JSON.stringify(preferences);
    
    // Upsert: insert or update
    await executeQuery(
      `MERGE dbo.UserTablePreferences AS target
       USING (SELECT @userEmail AS UserEmail, @tableName AS TableName) AS source
       ON target.UserEmail = source.UserEmail AND target.TableName = source.TableName
       WHEN MATCHED THEN
         UPDATE SET Preferences = @preferences, UpdatedAt = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (UserEmail, TableName, Preferences)
         VALUES (@userEmail, @tableName, @preferences);`,
      { userEmail, tableName, preferences: preferencesJson }
    );
    
    sendSuccess(res, { userEmail, tableName, preferences }, 200, 'Table preferences saved');
  } catch (error: any) {
    sendError(res, 'Failed to save table preferences', 500, error.message);
  }
});

// ===== USER AUTHENTICATION =====

// Sync Microsoft 365 user - called after successful M365 login
router.post('/auth/microsoft/sync', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    
    if (!profile || (!profile.mail && !profile.userPrincipalName)) {
      sendError(res, 'Invalid profile data - email is required', 400);
      return;
    }

    const result = await userService.syncMicrosoftUser(profile);
    sendSuccess(res, {
      user: {
        id: result.adminUser.Id,
        name: result.adminUser.Name,
        email: result.adminUser.Email,
        role: result.adminUser.RoleName,
        status: result.adminUser.Status,
        department: result.adminUser.Department,
        roleAssignments: result.roleAssignments
      },
      profile: {
        firstName: result.userProfile.FirstName,
        lastName: result.userProfile.LastName,
        jobTitle: result.userProfile.RoleName,
        location: result.userProfile.Location,
        email: result.userProfile.Email,
        phone: result.userProfile.Phone
      },
      isNewUser: result.isNewUser
    }, 200, result.isNewUser ? 'User created successfully' : 'User synced successfully');
  } catch (error: any) {
    console.error('Microsoft sync error:', error);
    sendError(res, 'Failed to sync Microsoft user', 500, error.message);
  }
});

// Get current user by email
router.get('/auth/user/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const profile = await userService.getUserProfile(user.Id);
    
    sendSuccess(res, {
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        role: user.RoleName,
        status: user.Status,
        department: user.Department,
        lastLogin: user.LastLogin
      },
      profile: profile ? {
        firstName: profile.FirstName,
        lastName: profile.LastName,
        jobTitle: profile.RoleName,
        location: profile.Location,
        phone: profile.Phone
      } : null
    }, 200, 'User retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to get user', 500, error.message);
  }
});

// Get all users (admin only)
router.get('/auth/users', async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    sendSuccess(res, users, 200, 'Users retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to get users', 500, error.message);
  }
});

// Get user role assignments
router.get('/auth/users/:userId/roles', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const roleAssignments = await userService.getUserRoleAssignments(userId);
    sendSuccess(res, roleAssignments, 200, 'Role assignments retrieved successfully');
  } catch (error: any) {
    sendError(res, 'Failed to get role assignments', 500, error.message);
  }
});

// Update module permissions for a user
router.put('/auth/users/:userId/modules/:moduleName/permissions', async (req: Request, res: Response) => {
  try {
    const { userId, moduleName } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      sendError(res, 'Permissions must be an array', 400);
      return;
    }

    const validPermissions = ['view', 'create', 'edit', 'delete', 'admin'];
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      sendError(res, `Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
      return;
    }

    await userService.setModulePermissions(userId, moduleName, permissions);
    sendSuccess(res, null, 200, 'Permissions updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update permissions', 500, error.message);
  }
});

// Update user role (admin, manager, user, readonly)
router.put('/auth/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'manager', 'user', 'readonly'];
    if (!validRoles.includes(role)) {
      sendError(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
      return;
    }

    await userService.updateUserRole(userId, role);
    sendSuccess(res, null, 200, 'User role updated successfully');
  } catch (error: any) {
    sendError(res, 'Failed to update user role', 500, error.message);
  }
});

// Remove module access for a user
router.delete('/auth/users/:userId/modules/:moduleName', async (req: Request, res: Response) => {
  try {
    const { userId, moduleName } = req.params;
    await userService.removeModuleAccess(userId, moduleName);
    sendSuccess(res, null, 200, 'Module access removed successfully');
  } catch (error: any) {
    sendError(res, 'Failed to remove module access', 500, error.message);
  }
});

// ===== TECHNICAL RESOURCES =====

// List available resource folders
router.get('/technical-resources/folders', (req: Request, res: Response) => {
  try {
    const folders = TechnicalResourcesService.listAvailableFolders();
    sendSuccess(res, folders, 200, 'Resource folders retrieved');
  } catch (error: any) {
    sendError(res, 'Failed to list resource folders', 500, error.message);
  }
});

// List files in a resource folder
router.get('/technical-resources/files', async (req: Request, res: Response) => {
  try {
    const folder = req.query.folder as string;
    if (!folder) {
      sendError(res, 'folder query parameter is required', 400);
      return;
    }
    const files = await TechnicalResourcesService.listFiles(folder);
    sendSuccess(res, files, 200, 'Resource files listed');
  } catch (error: any) {
    sendError(res, 'Failed to list resource files', 500, error.message);
  }
});

// Get extracted text content from all files in a resource folder
router.get('/technical-resources/content', async (req: Request, res: Response) => {
  try {
    const folder = req.query.folder as string;
    if (!folder) {
      sendError(res, 'folder query parameter is required', 400);
      return;
    }
    const result = await TechnicalResourcesService.getResourceContent(folder);
    sendSuccess(res, result, 200, `Extracted content from ${result.files.length} files`);
  } catch (error: any) {
    sendError(res, 'Failed to extract resource content', 500, error.message);
  }
});

// ===== AI CONTENT GENERATION (Azure OpenAI) =====

// Check if Azure OpenAI is configured
router.get('/ai/status', (req: Request, res: Response) => {
  const configured = AzureOpenAIService.isConfigured();
  sendSuccess(res, {
    configured,
    message: configured
      ? 'Azure OpenAI is configured and ready'
      : 'Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY environment variables.',
  }, 200, 'AI status retrieved');
});

// Debug: Preview the prompt that would be sent to Azure OpenAI
router.post('/ai/debug-prompt', (req: Request, res: Response) => {
  try {
    const { customerName, companyName, customerEmail, assessmentType, referenceArchitecture,
            assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext,
            prompt, additionalNotes, systemPromptOverride } = req.body;

    const preview = AzureOpenAIService.buildPromptPreview({
      prompt: prompt || '',
      customerName: customerName || '',
      companyName: companyName || customerName || '',
      customerEmail,
      assessmentType: assessmentType || '',
      assessmentTypeDescription,
      assessmentTypeCategory,
      referenceArchitecture: referenceArchitecture || '',
      scopeContext,
      methodologyContext,
      additionalNotes,
    }, systemPromptOverride);

    sendSuccess(res, preview, 200, 'Prompt preview generated');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to build prompt preview', 500, error.message);
  }
});

// Generate AI content (executive summary / overview)
router.post('/ai/generate', async (req: Request, res: Response) => {
  try {
    const { customerName, companyName, customerEmail, assessmentType, referenceArchitecture,
            assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext,
            prompt, additionalNotes, technicalResources, maxTokens, temperature } = req.body;

    if (!assessmentType || !referenceArchitecture) {
      sendError(res, 'assessmentType and referenceArchitecture are required', 400);
      return;
    }

    const result = await AzureOpenAIService.generateExecutiveSummary(
      customerName || '',
      companyName || customerName || '',
      assessmentType,
      referenceArchitecture,
      prompt,
      additionalNotes,
      { customerEmail, assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext, technicalResources }
    );

    sendSuccess(res, result, 200, 'AI content generated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate AI content', 500, error.message);
  }
});

// Generate AI findings
router.post('/ai/generate/findings', async (req: Request, res: Response) => {
  try {
    const { customerName, companyName, customerEmail, assessmentType, referenceArchitecture,
            assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext,
            prompt, additionalNotes, technicalResources } = req.body;

    if (!assessmentType || !referenceArchitecture) {
      sendError(res, 'assessmentType and referenceArchitecture are required', 400);
      return;
    }

    const result = await AzureOpenAIService.generateFindings(
      customerName || '',
      companyName || customerName || '',
      assessmentType,
      referenceArchitecture,
      prompt,
      additionalNotes,
      { customerEmail, assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext, technicalResources }
    );

    sendSuccess(res, result, 200, 'AI findings generated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate AI findings', 500, error.message);
  }
});

// Generate AI recommendations
router.post('/ai/generate/recommendations', async (req: Request, res: Response) => {
  try {
    const { customerName, companyName, customerEmail, assessmentType, referenceArchitecture,
            assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext,
            prompt, additionalNotes, technicalResources } = req.body;

    if (!assessmentType || !referenceArchitecture) {
      sendError(res, 'assessmentType and referenceArchitecture are required', 400);
      return;
    }

    const result = await AzureOpenAIService.generateRecommendations(
      customerName || '',
      companyName || customerName || '',
      assessmentType,
      referenceArchitecture,
      prompt,
      additionalNotes,
      { customerEmail, assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext, technicalResources }
    );

    sendSuccess(res, result, 200, 'AI recommendations generated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate AI recommendations', 500, error.message);
  }
});

// Generate AI scope
router.post('/ai/generate/scope', async (req: Request, res: Response) => {
  try {
    const { customerName, companyName, customerEmail, assessmentType, referenceArchitecture,
            assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext,
            prompt, additionalNotes, technicalResources } = req.body;

    if (!assessmentType || !referenceArchitecture) {
      sendError(res, 'assessmentType and referenceArchitecture are required', 400);
      return;
    }

    const result = await AzureOpenAIService.generateScope(
      customerName || '',
      companyName || customerName || '',
      assessmentType,
      referenceArchitecture,
      prompt,
      additionalNotes,
      { customerEmail, assessmentTypeDescription, assessmentTypeCategory, scopeContext, methodologyContext, technicalResources }
    );

    sendSuccess(res, result, 200, 'AI scope generated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate AI scope', 500, error.message);
  }
});

// Professional review of completed document
router.post('/ai/review', async (req: Request, res: Response) => {
  try {
    const { documentContent, assessmentType, customerName } = req.body;

    if (!documentContent) {
      sendError(res, 'documentContent is required', 400);
      return;
    }

    const result = await AzureOpenAIService.reviewDocument(
      documentContent,
      assessmentType || 'Assessment',
      customerName || 'Client'
    );

    sendSuccess(res, result, 200, 'Document review completed successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to review document', 500, error.message);
  }
});

// ===== DASHBOARD STATS =====

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    // Counts
    const customerCount = await executeQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM dbo.Customers', {});
    const quoteCount = await executeQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM dbo.Quotes', {});

    let sowCount = [{ cnt: 0 }];
    try {
      sowCount = await executeQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM dbo.SOWDocuments', {});
    } catch { /* table may not exist */ }

    // Quotes by day (last 30 days)
    const quotesByDay = await executeQuery<{ day: string; count: number }>(
      `SELECT FORMAT(CreatedAt, 'yyyy-MM-dd') as day, COUNT(*) as count
       FROM dbo.Quotes
       WHERE CreatedAt >= DATEADD(day, -30, GETUTCDATE())
       GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
       ORDER BY day`,
      {}
    );

    // Assessments by day (last 30 days)
    let assessmentsByDay: { day: string; count: number }[] = [];
    try {
      assessmentsByDay = await executeQuery<{ day: string; count: number }>(
        `SELECT FORMAT(CreatedAt, 'yyyy-MM-dd') as day, COUNT(*) as count
         FROM dbo.GeneratedAssessments
         WHERE CreatedAt >= DATEADD(day, -30, GETUTCDATE())
         GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
         ORDER BY day`,
        {}
      );
    } catch { /* table may not exist */ }

    // Quotes by month (current year) – count + total cost
    const quotesByMonth = await executeQuery<{ month: number; count: number; totalCost: number }>(
      `SELECT MONTH(CreatedAt) as month, COUNT(*) as count, ISNULL(SUM(TotalPrice), 0) as totalCost
       FROM dbo.Quotes
       WHERE YEAR(CreatedAt) = YEAR(GETUTCDATE())
       GROUP BY MONTH(CreatedAt)
       ORDER BY month`,
      {}
    );

    // Assessments by month (current year)
    let assessmentsByMonth: { month: number; count: number }[] = [];
    try {
      assessmentsByMonth = await executeQuery<{ month: number; count: number }>(
        `SELECT MONTH(CreatedAt) as month, COUNT(*) as count
         FROM dbo.GeneratedAssessments
         WHERE YEAR(CreatedAt) = YEAR(GETUTCDATE())
         GROUP BY MONTH(CreatedAt)
         ORDER BY month`,
        {}
      );
    } catch { /* table may not exist */ }

    sendSuccess(res, {
      customers: customerCount[0]?.cnt || 0,
      quotes: quoteCount[0]?.cnt || 0,
      sowDocuments: sowCount[0]?.cnt || 0,
      quotesByDay,
      assessmentsByDay,
      quotesByMonth,
      assessmentsByMonth
    }, 200, 'Dashboard stats retrieved');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve dashboard stats', 500, error.message);
  }
});

// ===== MENU CONFIGURATION =====

// Run menu configuration migration (create table & seed data)
router.post('/menu-config/migrate', async (req: Request, res: Response) => {
  try {
    // Check if table exists
    const tableCheck = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'MenuConfiguration'`
    );

    if (tableCheck[0]?.cnt === 0) {
      // Create table
      await executeQuery(`
        CREATE TABLE dbo.MenuConfiguration (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          MenuItemKey NVARCHAR(100) NOT NULL UNIQUE,
          DisplayName NVARCHAR(200) NOT NULL,
          ParentKey NVARCHAR(100) NULL,
          IsVisible BIT NOT NULL DEFAULT 1,
          IsProtected BIT NOT NULL DEFAULT 0,
          SortOrder INT NOT NULL DEFAULT 0,
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          UpdatedBy NVARCHAR(200) NULL
        )
      `);

      // Seed data
      await executeQuery(`
        INSERT INTO dbo.MenuConfiguration (MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder) VALUES
        ('dashboard', 'Dashboard', NULL, 1, 0, 1),
        ('dashboard-tech-sales', 'Tech Sales', 'dashboard', 1, 0, 1),
        ('dashboard-analytics', 'Analytics', 'dashboard', 1, 0, 2),
        ('dashboard-marketing', 'Marketing', 'dashboard', 1, 0, 3),
        ('dashboard-crm', 'CRM', 'dashboard', 1, 0, 4),
        ('dashboard-stocks', 'Stocks', 'dashboard', 1, 0, 5),
        ('dashboard-saas', 'SaaS', 'dashboard', 1, 0, 6),
        ('dashboard-logistics', 'Logistics', 'dashboard', 1, 0, 7),
        ('msp-services', 'MSP Services', NULL, 1, 0, 2),
        ('msp-services-dashboard', 'Dashboard', 'msp-services', 1, 0, 1),
        ('msp-services-overview', 'Services Overview', 'msp-services', 1, 0, 2),
        ('labor-budget', 'Labor Budget', NULL, 1, 0, 3),
        ('labor-budget-calculator', 'Calculator', 'labor-budget', 1, 0, 1),
        ('labor-budget-wizard', 'Wizard', 'labor-budget', 1, 0, 2),
        ('quote-management', 'Quote Management', NULL, 1, 0, 4),
        ('sow-documents', 'SOW Documents', NULL, 1, 0, 5),
        ('assessments', 'Assessments', NULL, 1, 0, 6),
        ('e-rate', 'E-Rate', NULL, 1, 0, 7),
        ('e-rate-dashboard', 'Dashboard', 'e-rate', 1, 0, 1),
        ('e-rate-opportunities', 'Opportunities', 'e-rate', 1, 0, 2),
        ('e-rate-frn-dashboard', 'FRN Dashboard', 'e-rate', 1, 0, 3),
        ('e-rate-frn-status', 'FRN Status', 'e-rate', 1, 0, 4),
        ('admin', 'Admin', NULL, 1, 1, 8),
        ('admin-users', 'Users', 'admin', 1, 1, 1),
        ('admin-customers', 'Customers', 'admin', 1, 0, 2),
        ('admin-create-user', 'Create User', 'admin', 1, 1, 3),
        ('admin-msp-offerings', 'MSP Offerings', 'admin', 1, 0, 4),
        ('admin-assessment-types', 'Assessment Types', 'admin', 1, 0, 5),
        ('admin-labor-budget', 'Labor Budget Admin', 'admin', 1, 0, 6),
        ('admin-export-schemas', 'Export Schemas', 'admin', 1, 0, 7),
        ('admin-erate-settings', 'E-Rate Settings', 'admin', 1, 0, 8),
        ('admin-settings', 'Settings', 'admin', 1, 0, 9),
        ('admin-menu-admin', 'Menu Admin', 'admin', 1, 1, 10),
        ('user-profile', 'User Profile', NULL, 1, 0, 9)
      `);

      sendSuccess(res, { created: true }, 200, 'MenuConfiguration table created and seeded');
    } else {
      // Table exists - ensure Menu Admin entry exists
      const menuAdminCheck = await executeQuery<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM dbo.MenuConfiguration WHERE MenuItemKey = 'admin-menu-admin'`
      );
      if (menuAdminCheck[0]?.cnt === 0) {
        await executeQuery(
          `INSERT INTO dbo.MenuConfiguration (MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder)
           VALUES ('admin-menu-admin', 'Menu Admin', 'admin', 1, 1, 10)`
        );
      }
      sendSuccess(res, { created: false }, 200, 'MenuConfiguration table already exists');
    }
  } catch (error: any) {
    sendError(res, 'Failed to run menu configuration migration', 500, error.message);
  }
});

// Get all menu configuration items
router.get('/menu-config', async (req: Request, res: Response) => {
  try {
    const items = await executeQuery(
      `SELECT Id, MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder, UpdatedAt, UpdatedBy
       FROM dbo.MenuConfiguration
       ORDER BY SortOrder, DisplayName`
    );
    sendSuccess(res, items, 200, 'Menu configuration retrieved');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve menu configuration', 500, error.message);
  }
});

// Get only visible menu items (for non-admin sidebar filtering)
router.get('/menu-config/visible', async (req: Request, res: Response) => {
  try {
    const items = await executeQuery(
      `SELECT MenuItemKey, DisplayName, ParentKey, IsProtected, SortOrder
       FROM dbo.MenuConfiguration
       WHERE IsVisible = 1
       ORDER BY SortOrder, DisplayName`
    );
    sendSuccess(res, items, 200, 'Visible menu items retrieved');
  } catch (error: any) {
    sendError(res, 'Failed to retrieve visible menu items', 500, error.message);
  }
});

// Reorder menu items - swap sort order between two sibling items
router.put('/menu-config/reorder', async (req: Request, res: Response) => {
  try {
    const { menuItemKey, direction } = req.body;

    if (!menuItemKey || !direction || !['up', 'down'].includes(direction)) {
      return sendError(res, 'menuItemKey and direction (up/down) are required', 400);
    }

    // Get the item to move
    const itemResult = await executeQuery(
      `SELECT * FROM dbo.MenuConfiguration WHERE MenuItemKey = @key`,
      { key: menuItemKey }
    );

    if (itemResult.length === 0) {
      return sendError(res, 'Menu item not found', 404);
    }

    const item = itemResult[0];

    // Find the sibling to swap with (same parent level)
    let siblingQuery: string;
    if (direction === 'up') {
      if (item.ParentKey) {
        siblingQuery = `SELECT TOP 1 * FROM dbo.MenuConfiguration 
                        WHERE ParentKey = @parent AND SortOrder < @sortOrder 
                        ORDER BY SortOrder DESC`;
      } else {
        siblingQuery = `SELECT TOP 1 * FROM dbo.MenuConfiguration 
                        WHERE ParentKey IS NULL AND SortOrder < @sortOrder 
                        ORDER BY SortOrder DESC`;
      }
    } else {
      if (item.ParentKey) {
        siblingQuery = `SELECT TOP 1 * FROM dbo.MenuConfiguration 
                        WHERE ParentKey = @parent AND SortOrder > @sortOrder 
                        ORDER BY SortOrder ASC`;
      } else {
        siblingQuery = `SELECT TOP 1 * FROM dbo.MenuConfiguration 
                        WHERE ParentKey IS NULL AND SortOrder > @sortOrder 
                        ORDER BY SortOrder ASC`;
      }
    }

    const siblingResult = await executeQuery(siblingQuery, {
      parent: item.ParentKey,
      sortOrder: item.SortOrder
    });

    if (siblingResult.length === 0) {
      return sendError(res, `Cannot move ${direction} — already at the ${direction === 'up' ? 'top' : 'bottom'}`, 400);
    }

    const sibling = siblingResult[0];

    // Swap sort orders
    await executeQuery(
      `UPDATE dbo.MenuConfiguration SET SortOrder = @newSort, UpdatedAt = GETUTCDATE() WHERE MenuItemKey = @key`,
      { key: item.MenuItemKey, newSort: sibling.SortOrder }
    );
    await executeQuery(
      `UPDATE dbo.MenuConfiguration SET SortOrder = @newSort, UpdatedAt = GETUTCDATE() WHERE MenuItemKey = @key`,
      { key: sibling.MenuItemKey, newSort: item.SortOrder }
    );

    // Return all items after reorder
    const allItems = await executeQuery(
      `SELECT Id, MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder, UpdatedAt, UpdatedBy
       FROM dbo.MenuConfiguration
       ORDER BY SortOrder, DisplayName`
    );

    sendSuccess(res, allItems, 200, 'Menu item reordered');
  } catch (error: any) {
    sendError(res, 'Failed to reorder menu item', 500, error.message);
  }
});

// Update menu item visibility
router.put('/menu-config/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { IsVisible, UpdatedBy } = req.body;

    if (IsVisible === undefined) {
      return sendError(res, 'IsVisible is required', 400);
    }

    // Check if item exists
    const existing = await executeQuery(
      `SELECT * FROM dbo.MenuConfiguration WHERE MenuItemKey = @key`,
      { key }
    );

    if (existing.length === 0) {
      return sendError(res, 'Menu item not found', 404);
    }

    // Update visibility
    await executeQuery(
      `UPDATE dbo.MenuConfiguration 
       SET IsVisible = @isVisible, UpdatedAt = GETUTCDATE(), UpdatedBy = @updatedBy
       WHERE MenuItemKey = @key`,
      { key, isVisible: IsVisible ? 1 : 0, updatedBy: UpdatedBy || null }
    );

    // If this is a parent item being hidden, also update children
    if (!IsVisible) {
      await executeQuery(
        `UPDATE dbo.MenuConfiguration 
         SET IsVisible = 0, UpdatedAt = GETUTCDATE(), UpdatedBy = @updatedBy
         WHERE ParentKey = @key AND IsProtected = 0`,
        { key, updatedBy: UpdatedBy || null }
      );
    }

    // Get the updated item
    const updated = await executeQuery(
      `SELECT * FROM dbo.MenuConfiguration WHERE MenuItemKey = @key`,
      { key }
    );

    sendSuccess(res, updated[0], 200, 'Menu item updated');
  } catch (error: any) {
    sendError(res, 'Failed to update menu item', 500, error.message);
  }
});

// Bulk update menu item visibility
router.put('/menu-config/bulk/update', async (req: Request, res: Response) => {

  try {
    const { items, UpdatedBy } = req.body;

    if (!items || !Array.isArray(items)) {
      return sendError(res, 'items array is required', 400);
    }

    for (const item of items) {
      if (item.MenuItemKey && item.IsVisible !== undefined) {
        await executeQuery(
          `UPDATE dbo.MenuConfiguration 
           SET IsVisible = @isVisible, UpdatedAt = GETUTCDATE(), UpdatedBy = @updatedBy
           WHERE MenuItemKey = @key AND IsProtected = 0`,
          { key: item.MenuItemKey, isVisible: item.IsVisible ? 1 : 0, updatedBy: UpdatedBy || null }
        );
      }
    }

    // Return all items after update
    const allItems = await executeQuery(
      `SELECT Id, MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder, UpdatedAt, UpdatedBy
       FROM dbo.MenuConfiguration
       ORDER BY SortOrder, DisplayName`
    );

    sendSuccess(res, allItems, 200, 'Menu items updated');
  } catch (error: any) {
    sendError(res, 'Failed to bulk update menu items', 500, error.message);
  }
});

export default router;
