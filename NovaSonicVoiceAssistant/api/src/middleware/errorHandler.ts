import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Resource not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
  // Create error logger with request ID context if available
  const errorLogger = req.context?.logger || 
    (req.id ? logger.child({ requestId: req.id }) : logger);

  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let stack: string | undefined = undefined;
  const errorDetails: Record<string, any> = {};

  // Check if this is our ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    
    // Only include stack trace for non-operational errors
    if (!err.isOperational) {
      stack = err.stack;
    }
  }

  // Log the error with appropriate level
  if (statusCode >= 500) {
    errorLogger.error(`Unhandled error: ${err.message}, Status: ${statusCode}, Path: ${req.path}, Method: ${req.method}, Stack: ${err.stack}`);
  } else {
    // For 4xx errors, log as warnings
    errorLogger.warn(`Client error: ${err.message}, Status: ${statusCode}, Path: ${req.path}, Method: ${req.method}`);
  }

  // Include stack trace in development environment
  if (process.env.NODE_ENV === 'development' && err.stack) {
    stack = err.stack;
  }

  // Prepare error response
  const errorResponse: Record<string, any> = {
    status: 'error',
    statusCode,
    message
  };

  // Add stack trace if available (only in development)
  if (stack && process.env.NODE_ENV === 'development') {
    errorResponse.stack = stack;
  }

  // Add error details if available
  if (Object.keys(errorDetails).length > 0) {
    errorResponse.details = errorDetails;
  }

  // Ensure status code is set on the response
  if (!res.statusCode || res.statusCode === 200) {
    res.status(statusCode);
  }

  // Send error response
  res.json(errorResponse);
};

/**
 * Utility function to wrap async route handlers and catch errors
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
