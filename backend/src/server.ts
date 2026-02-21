import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { serverConfig } from './config/server';
import { getConnectionPool, closeConnectionPool } from './config/database';
import apiRoutes from './routes/api.routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error.middleware';

const app: Express = express();

/**
 * Middleware Setup
 */

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: serverConfig.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

/**
 * Database Connection
 */
async function initializeDatabase() {
  try {
    await getConnectionPool();
    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

/**
 * Routes
 */
app.use('/api', apiRoutes);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Server Startup
 */
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start server
    app.listen(serverConfig.port, serverConfig.host, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🎯 Cerium Sales Tools Backend Server       ║
╠════════════════════════════════════════════╣
║  ✅ Server running on:                     ║
║     http://${serverConfig.host}:${serverConfig.port}                      ║
║  ✅ Environment: ${serverConfig.env}                    ║
║  ✅ Database: CeriumSalesTools              ║
║  ✅ CORS Origin: ${serverConfig.corsOrigin} ║
╚════════════════════════════════════════════╝

Available Endpoints:
  GET    /api/health              - Health check
  
  GET    /api/customers           - Get all customers
  GET    /api/customers/:id       - Get customer by ID
  POST   /api/customers           - Create customer
  PUT    /api/customers/:id       - Update customer
  DELETE /api/customers/:id       - Delete customer
  GET    /api/customers/search/:term - Search customers
  
  GET    /api/quotes              - Get all quotes
  GET    /api/quotes/:id          - Get quote by ID
  POST   /api/quotes              - Create quote
  PUT    /api/quotes/:id          - Update quote
  DELETE /api/quotes/:id          - Delete quote
  GET    /api/quotes/customer/:customerId - Get customer quotes
  
  GET    /api/labor-items         - Get all labor items
  GET    /api/labor-items/:id     - Get labor item by ID
  GET    /api/labor-items/section/:section - Get items by section
  GET    /api/labor-sections      - Get all sections
  POST   /api/labor-items         - Create labor item
  PUT    /api/labor-items/:id     - Update labor item
  DELETE /api/labor-items/:id     - Delete labor item
  GET    /api/labor-items/search/:term - Search labor items
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  console.log('\n📛 SIGTERM received, shutting down gracefully...');
  await closeConnectionPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📛 SIGINT received, shutting down gracefully...');
  await closeConnectionPool();
  process.exit(0);
});

// Start the server
startServer();

export default app;
