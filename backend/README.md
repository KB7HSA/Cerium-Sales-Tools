# Backend API Server - Node.js/Express

## Overview

Node.js/Express backend server for Cerium Sales Tools. Connects to Azure SQL Server at `ceriumdemo.database.windows.net` and provides RESTful API endpoints for the Angular frontend.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

The `.env` file is already configured with your SQL Server credentials:

```env
DB_HOST=ceriumdemo.database.windows.net
DB_PORT=1433
DB_USER=ceriumsqladmin
DB_PASSWORD=q7$fbVEXk3SJghD
DB_NAME=free-sql-db-6589364
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:4200
```

**Security Note**: Keep `.env` secure. Add to `.gitignore` before committing.

### 3. Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 4. Start the Server

**Development (with ts-node):**
```bash
npm run dev
```

**Production (compiled):**
```bash
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | Get all customers |
| GET | `/api/customers/:id` | Get customer by ID |
| POST | `/api/customers` | Create new customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |
| GET | `/api/customers/search/:term` | Search customers |

**Example - Create Customer:**
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Acme Corp",
    "Company": "Acme",
    "Email": "contact@acme.com",
    "Status": "active"
  }'
```

### Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | Get all quotes |
| GET | `/api/quotes?status=pending` | Get quotes by status |
| GET | `/api/quotes/:id` | Get quote by ID |
| POST | `/api/quotes` | Create new quote |
| PUT | `/api/quotes/:id` | Update quote |
| DELETE | `/api/quotes/:id` | Delete quote |
| GET | `/api/quotes/customer/:customerId` | Get customer's quotes |

**Example - Create Quote:**
```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "QuoteType": "labor",
    "CustomerName": "Acme Corp",
    "Status": "draft",
    "NumberOfUsers": 50,
    "DurationMonths": 12
  }'
```

### Labor Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labor-items` | Get all labor items |
| GET | `/api/labor-items/:id` | Get labor item by ID |
| GET | `/api/labor-sections` | Get all sections |
| GET | `/api/labor-items/section/:section` | Get items by section |
| POST | `/api/labor-items` | Create labor item |
| PUT | `/api/labor-items/:id` | Update labor item |
| DELETE | `/api/labor-items/:id` | Delete labor item |
| GET | `/api/labor-items/search/:term` | Search labor items |

**Example - Get Labor Sections:**
```bash
curl http://localhost:3000/api/labor-sections
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 500,
  "error": "Detailed error (development only)"
}
```

## Database Connection

The backend uses the `mssql` npm package to connect to Azure SQL Server.

**Connection Details:**
- **Server**: ceriumdemo.database.windows.net
- **Port**: 1433
- **Database**: CeriumSalesTools
- **Authentication**: SQL Server (ceriumsqladmin)
- **Encryption**: Enabled (required for Azure)

**Connection Pool:**
- Minimum connections: 2
- Maximum connections: 10
- Connection timeout: 30 seconds

## Services

### CustomerService
Located in `src/services/customer.service.ts`

Methods:
- `getAllCustomers(status?)` - Get all customers, optionally filtered by status
- `getCustomerById(id)` - Get specific customer
- `createCustomer(customer)` - Create new customer
- `updateCustomer(id, updates)` - Update customer
- `deleteCustomer(id)` - Delete customer
- `searchCustomers(term)` - Search by name/company
- `getCustomerQuoteSummary(customerId)` - Get customer's quote stats

### QuoteService
Located in `src/services/quote.service.ts`

Methods:
- `getAllQuotes(status?)` - Get all quotes
- `getQuoteById(id)` - Get quote with related items
- `createQuote(quote)` - Create new quote
- `updateQuote(id, updates)` - Update quote
- `deleteQuote(id)` - Delete quote
- `getQuotesByCustomer(customerId)` - Get customer's quotes
- `getQuotesByStatus(status)` - Get quotes by status
- `addWorkItem(quoteId, item)` - Add line item to quote
- `calculateQuoteTotal()` - Use SQL Server function for calculations

### LaborItemService
Located in `src/services/labor-item.service.ts`

Methods:
- `getAllLaborItems(section?)` - Get all active labor items
- `getLaborItemsBySection(section)` - Get items in a section
- `getLaborItemById(id)` - Get specific item
- `getAllSections()` - Get all section names
- `createLaborItem(item)` - Create new labor item
- `updateLaborItem(id, updates)` - Update labor item
- `deleteLaborItem(id)` - Soft delete (set IsActive = 0)
- `searchLaborItems(term)` - Search by name/description

## Middleware

### CORS
Configured to allow requests from `http://localhost:4200` (Angular frontend)

Change CORS_ORIGIN in `.env` for different domains.

### Error Handling
Global error handler catches all errors and returns formatted responses.

### Request Logging
Morgan logs all HTTP requests in combined format.

## Database Schema

The backend connects to the SQL Server schema with:
- 50+ tables
- 2 reporting views
- 1 stored procedure (analytics)
- 1 function (quote calculations)
- 20+ update triggers (automatic timestamps)

For schema details, see `../db/MSSQL_MIGRATION_GUIDE.md`

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # SQL Server connection
│   │   └── server.ts         # Server configuration
│   ├── services/
│   │   ├── customer.service.ts
│   │   ├── quote.service.ts
│   │   └── labor-item.service.ts
│   ├── routes/
│   │   └── api.routes.ts     # API endpoints
│   ├── middleware/
│   │   └── error.middleware.ts # Error handling
│   └── server.ts             # Main entry point
├── dist/                     # Compiled JavaScript (auto-generated)
├── package.json
├── tsconfig.json
├── .env                      # Environment variables (KEEP SECURE)
├── .env.example              # Template for .env
└── README.md                 # This file
```

### Adding New Services

1. Create file in `src/services/newservice.service.ts`
2. Export class with static methods
3. Import and use in routes

Example:
```typescript
import { executeQuery } from '../config/database';

export class MyService {
  static async getAll() {
    const query = `SELECT * FROM dbo.MyTable`;
    return await executeQuery(query);
  }
}
```

### Adding New Routes

1. Add endpoint to `src/routes/api.routes.ts`
2. Use service methods
3. Use `sendSuccess()` or `sendError()` for responses

Example:
```typescript
router.get('/myendpoint', async (req, res) => {
  try {
    const data = await MyService.getAll();
    sendSuccess(res, data);
  } catch (error: any) {
    sendError(res, 'Failed to get data', 500, error.message);
  }
});
```

## Testing

Run tests:
```bash
npm test
```

## Deployment

### To Azure App Service

1. Build the project:
   ```bash
   npm run build
   ```

2. Create `.deployment` file:
   ```
   [config]
   command = npm install && npm run build
   ```

3. Deploy using Azure CLI:
   ```bash
   az webapp deployment source config-zip \
     --resource-group <group> \
     --name <app-name> \
     --src dist.zip
   ```

### Environment Variables in Azure

Set in Azure Portal → App Service → Configuration:
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- NODE_ENV (set to `production`)
- CORS_ORIGIN (set to your frontend URL)

## Performance Tips

1. **Connection Pool**: Reuses connections, improves performance
2. **Query Optimization**: Indexes are set up on frequently queried columns
3. **Caching**: Consider caching static labor items
4. **Pagination**: Implement for large result sets

## Security

1. **Environment Variables**: Never commit `.env` file
2. **CORS**: Restrict to your frontend domain
3. **Helmet**: Adds HTTP security headers
4. **SQL Injection**: Using parameterized queries (mssql package handles this)
5. **Error Messages**: Limited error details in production

## Troubleshooting

### Connection Failed
```
Error: Failed to connect to SQL Server
```
- Verify credentials in `.env`
- Check network connectivity to Azure
- Ensure firewall allows port 1433
- Run firewall rule test in Azure Portal

### CORS Error
```
Access to XMLHttpRequest has been blocked by CORS policy
```
- Update CORS_ORIGIN in `.env` to match your frontend URL
- Restart server after changing

### Timeout Error
```
RequestError: Timeout: Request timeout
```
- Increase `REQUEST_TIMEOUT` in database config
- Check database performance
- Optimize slow queries

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
- Change SERVER_PORT in `.env`
- Or kill process using port: `netstat -ano | findstr :3000`

## Support

For database-related questions, see `../db/MSSQL_MIGRATION_GUIDE.md`

For Angular frontend setup, see `../README.md`

## License

MIT
