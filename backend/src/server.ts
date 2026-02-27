import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { serverConfig } from './config/server';
import { getConnectionPool, closeConnectionPool } from './config/database';
import apiRoutes from './routes/api.routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

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

// Global rate limiter — 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// Strict rate limiter for AI generation endpoints — 10 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI generation rate limit exceeded. Please wait before trying again.' },
});
app.use('/api/ai/', aiLimiter);

// Strict rate limiter for auth endpoints — 20 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Authentication rate limit exceeded. Please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Body parsing — reduced limit from 50mb to 10mb
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    console.warn('⚠️  Server will start without database connection. DB-dependent routes will return 503.');
  }
}

/**
 * Routes
 */
// All API routes - auth middleware is applied inside api.routes.ts per-route
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
