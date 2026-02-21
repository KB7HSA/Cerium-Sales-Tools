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
import { ERateSettingsService } from '../services/erate-settings.service';
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
    const newQuote = await QuoteService.createQuote(req.body);
    sendSuccess(res, newQuote, 201, 'Quote created successfully');
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

export default router;
