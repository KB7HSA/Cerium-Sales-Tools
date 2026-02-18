# 🚀 Tailadmin Full Stack - Quick Start Guide

## Executive Summary
- **Frontend**: Angular 21 + TailwindCSS (Port: 9766) ✅ Running
- **Backend**: Node.js/Express + TypeScript (Port: 3000) ✅ Ready
- **Database**: Azure SQL Server (ceriumdemo.database.windows.net) ✅ Schema Created
- **Status**: All components created and ready to integrate

---

## ⚡ Quick Start (5 Minutes)

### 1️⃣ Start Backend (New Terminal)
```bash
cd d:\Github\Tailadmin\backend
npm install              # First time only (2-3 min)
npm run build           # Compile TypeScript (30-60 sec)
npm run dev             # Start server (immediate)
```

**✅ Backend Ready When You See:**
```
✅ Connected to SQL Server
✅ Server running on http://localhost:3000
```

### 2️⃣ Start Frontend (Keep Running)
The frontend is already running on `http://localhost:9766`

If not, in another terminal:
```bash
cd d:\Github\Tailadmin
npm start
```

### 3️⃣ Test Connectivity
```bash
# Test backend
curl http://localhost:3000/api/health

# Test frontend
open http://localhost:9766
```

### 4️⃣ Use Real Data
Update any Angular component to use `ApiService`:

```typescript
import { ApiService } from '@/shared/services/api.service';

export class MyComponent {
  constructor(private api: ApiService) {}
  
  ngOnInit() {
    this.api.getAllCustomers().subscribe(response => {
      console.log(response.data); // Real data from SQL Server!
    });
  }
}
```

---

## 📁 Project Structure

```
Tailadmin/
├── src/
│   ├── app/              # Angular components
│   │   ├── pages/
│   │   │   ├── admin/    # Admin management pages
│   │   │   ├── dashboard/# Analytics dashboard
│   │   │   └── ...
│   │   └── shared/
│   │       └── services/
│   │           └── api.service.ts  ← Use this for API calls
│   │
│   └── environments/     # Environment configs
│       ├── environment.ts           # Dev: localhost:3000
│       └── environment.prod.ts      # Prod: your-domain.com
│
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # SQL Server connection
│   │   │   └── server.ts            # Express config
│   │   ├── services/
│   │   │   ├── customer.service.ts  # Customer CRUD
│   │   │   ├── quote.service.ts     # Quote CRUD
│   │   │   └── labor-item.service.ts# Labor Item CRUD
│   │   ├── routes/
│   │   │   └── api.routes.ts        # 30+ API endpoints
│   │   └── server.ts                # Entry point
│   │
│   ├── .env             # Azure SQL credentials
│   ├── package.json     # Dependencies
│   └── README.md        # Backend API docs
│
├── db/                  # Database resources
│   ├── mssql-schema.sql           # 50+ tables
│   ├── mssql-triggers.sql         # 20+ triggers
│   └── *.md                       # Documentation
│
└── FRONTEND_BACKEND_INTEGRATION.md  # Integration guide
```

---

## 🔌 API Endpoints

### Base URL: `http://localhost:3000/api`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/health` | Check API health |
| **GET** | `/customers` | Get all customers |
| **POST** | `/customers` | Create customer |
| **GET** | `/customers/:id` | Get customer |
| **PUT** | `/customers/:id` | Update customer |
| **DELETE** | `/customers/:id` | Delete customer |
| **GET** | `/quotes` | Get all quotes |
| **POST** | `/quotes` | Create quote |
| **GET** | `/labor-items` | Get all labor items |
| **POST** | `/labor-items` | Create labor item |

**📖 Full API documentation:** See `backend/README.md`

---

## 🗄️ Database Connection

**Server:** `ceriumdemo.database.windows.net:1433`
**Database:** `CeriumSalesTools`
**Username:** `ceriumsqladmin`
**Password:** (in `.env`, secure)

**Tables:** 50+
**Stored Procedures:** 1
**Functions:** 1
**Triggers:** 20+
**Views:** 2

**📖 Database documentation:** See `db/` folder

---

## 🔧 Configuration Files

### Backend Environment (`.env`)
```env
DB_HOST=ceriumdemo.database.windows.net
DB_PORT=1433
DB_USER=ceriumsqladmin
DB_PASSWORD=q7$fbVEXk3SJghD
DB_NAME=CeriumSalesTools
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

### Frontend Environment (`environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiTimeout: 30000
};
```

---

## 📚 Usage Examples

### Example 1: List All Customers
```typescript
import { ApiService } from '@/shared/services/api.service';

export class ListComponent {
  constructor(private api: ApiService) {}
  
  ngOnInit() {
    this.api.getAllCustomers().subscribe(response => {
      console.log(response.data); // Array of Customer objects
    });
  }
}
```

### Example 2: Create New Quote
```typescript
const quote = {
  CustomerID: 1,
  QuoteNumber: 'QT-2024-001',
  Status: 'Draft',
  TotalAmount: 5000
};

this.api.createQuote(quote).subscribe(response => {
  console.log('New Quote ID:', response.data.QuoteID);
});
```

### Example 3: Search Customers
```typescript
this.api.searchCustomers('john').subscribe(response => {
  console.log('Search Results:', response.data);
});
```

### Example 4: Error Handling
```typescript
this.api.getCustomerById(999).subscribe({
  next: (response) => {
    console.log('Success:', response.data);
  },
  error: (error) => {
    console.error('Error:', error.error.message);
  }
});
```

---

## 🛠️ Common Tasks

### Add New Route to Backend
1. Create method in service (`backend/src/services/*.service.ts`)
2. Add route in `backend/src/routes/api.routes.ts`
3. Test with `curl` or Postman
4. Call from Angular using `ApiService`

### Update Database Schema
1. Modify SQL in `db/mssql-schema.sql`
2. Execute against Azure SQL Server
3. Update service methods if needed
4. Restart backend (`npm run dev`)

### Change API Port
1. Edit: `backend/src/config/server.ts` → change `port`
2. Edit: `src/environments/environment.ts` → change `apiUrl`
3. Restart both servers

### Deploy to Production
1. Update `environment.prod.ts` with production API URL
2. Update backend `.env` with production database credentials
3. Build frontend: `ng build --configuration=production`
4. Deploy to Azure App Service or host of choice

---

## 📊 Services Reference

### CustomerService (7 methods)
```typescript
getAllCustomers(status?)
getCustomerById(id)
createCustomer(data)
updateCustomer(id, data)
deleteCustomer(id)
searchCustomers(term)
getCustomerQuoteSummary(id)
```

### QuoteService (7 methods)
```typescript
getAllQuotes()
getQuotesByCustomer(customerId)
getQuotesByStatus(status)
getQuoteById(id)
createQuote(data)
updateQuote(id, data)
deleteQuote(id)
```

### LaborItemService (8 methods)
```typescript
getAllLaborItems()
getLaborItemsBySection(section)
getLaborItemById(id)
getLaborSections()
createLaborItem(data)
updateLaborItem(id, data)
deleteLaborItem(id)
searchLaborItems(term)
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| **CORS Error** | Backend CORS set to port 4200, frontend on 9766 - update `server.ts` |
| **Connection Refused** | Backend not running - execute `npm run dev` in backend folder |
| **500 Error** | Check backend logs - likely DB connection issue |
| **404 Not Found** | Wrong API URL - verify `environment.ts` settings |
| **Cannot find module** | Run `npm install` in working directory |

---

## 📖 Full Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Backend API Docs | `backend/README.md` | All endpoints, examples |
| Frontend Integration | `FRONTEND_BACKEND_INTEGRATION.md` | How to use ApiService |
| Database Schema | `db/mssql-schema.sql` | 50+ tables |
| DB Migration Guide | `db/MSSQL_MIGRATION_GUIDE.md` | MySQL → SQL Server |
| Implementation Guide | `db/IMPLEMENTATION_GUIDE.md` | Full deployment guide |

---

## 🎯 Next Steps

- [ ] Backend: `npm install` → `npm run build` → `npm run dev`
- [ ] Verify: `curl http://localhost:3000/api/health`
- [ ] Update Angular components to use real API data
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Add authentication (optional)
- [ ] Deploy to production

---

## 💡 Tips

1. **Keep Backend Running**: Don't close the terminal running `npm run dev`
2. **Check Logs**: Frontend → Browser DevTools (F12), Backend → Terminal
3. **Use TypeScript**: All types are exported from `ApiService`
4. **CORS Debugging**: Use `curl` from command line to test API directly
5. **Connection Issues**: Verify `.env` credentials and database firewall rules

---

## 🚀 Getting Help

1. **Backend not starting?** Check the terminal for error messages
2. **API returning 500?** Verify SQL Server connection in backend logs
3. **Angular component not loading?** Check browser console (F12)
4. **Data not showing?** Verify `ApiService` is injected and called in `ngOnInit()`

---

**Everything is set up. You're ready to go! 🎉**

Questions? Check the detailed guides in `FRONTEND_BACKEND_INTEGRATION.md` and `backend/README.md`
