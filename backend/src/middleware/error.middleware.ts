import { Request, Response, NextFunction } from 'express';

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
  statusCode: number;
}

/**
 * Global error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorResponse: ErrorResponse = {
    success: false,
    message,
    statusCode,
  };

  // Handle specific error types
  if (err.message?.includes('Connection pool')) {
    statusCode = 503;
    message = 'Database connection unavailable';
  } else if (err.message?.includes('timeout')) {
    statusCode = 408;
    message = 'Request timeout';
  } else if (err.message?.includes('validation')) {
    statusCode = 400;
    message = 'Validation error';
  }

  errorResponse = {
    success: false,
    message,
    statusCode,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

/**
 * Success response wrapper
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, message: string = 'Success') {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    statusCode,
  });
}

/**
 * Error response wrapper
 */
export function sendError(res: Response, message: string, statusCode: number = 500, error?: any) {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    statusCode,
  });
}
