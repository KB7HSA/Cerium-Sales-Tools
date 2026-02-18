import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/error.middleware';
import { CustomerService } from '../services/customer.service';
import { QuoteService } from '../services/quote.service';
import { LaborItemService } from '../services/labor-item.service';
import { MSPOfferingService } from '../services/msp-offering.service';

const router = Router();

// ===== HEALTH CHECK =====
router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'API is running', timestamp: new Date() }, 200, 'Health check passed');
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

export default router;
