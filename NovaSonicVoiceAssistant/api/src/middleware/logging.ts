import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../types';

/**
 * Sanitizes log data to prevent log injection attacks (CWE-117)
 * Handles circular references to prevent stack overflow
 * 
 * @param obj The object to sanitize
 * @param seen Set of already processed objects to detect circular references
 * @returns Sanitized object safe for logging
 */
function sanitizeLogData(obj: any, seen: WeakSet<object> = new WeakSet()): any {
  // Handle null/undefined
  if (obj === null || obj === undefined) return obj;
  
  // Handle primitives
  if (typeof obj !== 'object') {
    // Handle string values - most important for security
    if (typeof obj === 'string') {
      return obj
        .replace(/[\n\r\t]/g, ' ')       // Replace newlines and tabs with spaces
        .replace(/\p{C}/gu, '')          // Remove control characters
        .replace(/[^\x20-\x7E]/g, '');   // Keep only printable ASCII
    }
    
    // Return other primitives as-is (numbers, booleans, etc.)
    return obj;
  }
  
  // Detect circular references
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  
  // Add current object to seen set
  seen.add(obj);
  
  // Handle Error objects specially
  if (obj instanceof Error) {
    const sanitizedError = {
      message: sanitizeLogData(obj.message, seen),
      name: sanitizeLogData(obj.name, seen),
      stack: obj.stack ? sanitizeLogData(obj.stack, seen) : undefined
    };
    
    // Copy any additional properties
    for (const [key, value] of Object.entries(obj)) {
      if (!['message', 'name', 'stack'].includes(key)) {
        (sanitizedError as any)[key] = sanitizeLogData(value, seen);
      }
    }
    
    return sanitizedError;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, seen));
  }
  
  // Handle objects recursively
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeLogData(value, seen);
  }
  return result;
}

// Configure base logger with colors using pino's built-in pretty print
const loggerOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      // Sanitize all log objects before they're written
      return sanitizeLogData(object);
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use pino-pretty directly in development
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{context} - {msg}',
        customColors: 'error:red,warn:yellow,info:green,debug:blue,trace:gray'
      }
    }
  })
};

// Configure base logger
export const logger = pino(loggerOptions);

// Create a child logger with context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

// Configure HTTP request logger middleware
export const loggingMiddleware = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] as string || uuidv4(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with status ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with status ${res.statusCode}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'responseTimeMs'
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      // Don't log user IDs, tokens, or request bodies
    }),
    res: (res) => {
      // Handle 304 Not Modified responses which might have null statusCode in some Express versions
      return {
        statusCode: res.statusCode || (res.statusMessage === 'Not Modified' ? 304 : 200)
      };
    },
    err: pino.stdSerializers.err,
  },
  // Don't overwrite the req/res objects with the logger
  wrapSerializers: true,
});

/**
 * Additional middleware to initialize the request context
 * This should be used immediately after the pinoHttp middleware
 */
export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Create a request-specific logger with the request ID
  const requestId = (req.id || uuidv4()) as string;
  const requestLogger = createLogger('Request');
  
  // Initialize the context object
  req.context = {
    logger: requestLogger,
    requestId
  };
  
  // Add request ID to all logs from this request
  req.context.logger = req.context.logger.child({ requestId });
  
  next();
};
