/**
 * Server Configuration
 */
export const serverConfig = {
  port: parseInt(process.env.SERVER_PORT || '3000', 10),
  host: process.env.SERVER_HOST || 'localhost',
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:4200', 'http://localhost:4201'],
  logLevel: process.env.LOG_LEVEL || 'info',
};

export const isDevelopment = serverConfig.env === 'development';
export const isProduction = serverConfig.env === 'production';
