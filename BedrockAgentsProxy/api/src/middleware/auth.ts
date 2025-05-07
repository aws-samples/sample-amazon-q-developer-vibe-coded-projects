import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logging';
import { ApiError } from './errorHandler';

const logger = createLogger('AuthMiddleware');

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        username?: string;
      };
    }
  }
}

/**
 * Simple middleware to extract user information from JWT token
 * This assumes API Gateway has already verified the token
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('No authorization header provided');
      return next(new ApiError(401, 'No authorization header'));
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Split the token to get the payload part (second part)
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.warn('Invalid token format');
      return next(new ApiError(401, 'Invalid token format'));
    }

    try {
      // Decode the payload (without verification)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Extract user information
      req.user = {
        userId: payload.sub,
        email: payload.email,
        username: payload['cognito:username']
      };

      next();
    } catch (error) {
      logger.error(`Error parsing token payload: ${(error as Error).message}`);
      next(new ApiError(401, 'Invalid token payload'));
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${(error as Error).message}`);
    next(new ApiError(500, 'Authentication error'));
  }
};
