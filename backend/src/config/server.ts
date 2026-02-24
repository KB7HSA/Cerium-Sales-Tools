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

/**
 * Azure OpenAI Configuration
 * 
 * To configure, set these environment variables or update the defaults below:
 *   AZURE_OPENAI_ENDPOINT  - Your Azure OpenAI resource endpoint (e.g., https://your-resource.openai.azure.com)
 *   AZURE_OPENAI_API_KEY   - Your Azure OpenAI API key
 *   AZURE_OPENAI_DEPLOYMENT - Your model deployment name (default: o4-mini)
 *   AZURE_OPENAI_API_VERSION - API version (default: 2025-01-01-preview)
 */
export const azureOpenAIConfig = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'o4-mini',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
};

export const isDevelopment = serverConfig.env === 'development';
export const isProduction = serverConfig.env === 'production';
