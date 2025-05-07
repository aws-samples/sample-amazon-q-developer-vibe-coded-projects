import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logging';
import { ApiError } from './errorHandler';
import { verifyToken, extractUserFromToken } from '../utils/tokenValidator';
import { UserContext } from '../types';

const logger = createLogger('AuthMiddleware');

// Extend Express Request to include user information for backward compatibility
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

/**
 * Middleware to authenticate requests using Cognito JWT tokens
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use the context logger if available, otherwise fall back to the default logger
    const contextLogger = req.context?.logger || logger;
    
    // Note: Health check routes are mounted before this middleware in app.ts
    // All routes that reach this middleware require authentication
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      contextLogger.warn('No authorization header provided');
      return next(new ApiError(401, 'No authorization header'));
    }
    
    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Verify and decode the token
      const decodedToken = await verifyToken(token);
      
      // Extract user information from the token
      const userInfo = extractUserFromToken(decodedToken);
      
      // Add user to both context and req.user for backward compatibility
      if (req.context) {
        req.context.user = userInfo;
        
        // Add userId to the logger for all subsequent logs
        req.context.logger = req.context.logger.child({ 
          userId: userInfo.userId 
        });
        
        contextLogger.debug(`User authenticated:`);
      }
      req.user = userInfo;
      
      next();
    } catch (error) {
      contextLogger.error(`Token verification failed: ${(error as Error).message}`);
      next(new ApiError(401, 'Invalid token'));
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${(error as Error).message}`);
    next(new ApiError(500, 'Authentication error'));
  }
};

/**
 * Middleware to require specific scopes
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    
    // Check if the user has the required scopes
    const userScopes = req.user.scope?.split(' ') || [];
    const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope));
    
    if (!hasRequiredScopes) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Middleware to require specific Cognito groups
 */
export const requireGroups = (requiredGroups: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    
    // Check if the user is in the required groups
    const userGroups = req.user.groups || [];
    const hasRequiredGroups = requiredGroups.some(group => userGroups.includes(group));
    
    if (!hasRequiredGroups) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    
    next();
  };
};
