/**
 * Request context type definitions
 */
import { Logger } from 'pino';

/**
 * User information extracted from authentication
 */
export interface UserContext {
  userId: string;
  email?: string;
  username?: string;
  groups?: string[];
  scope?: string;
  claims?: Record<string, any>;
}

/**
 * Complete request context containing all request-specific information
 */
export interface RequestContext {
  logger: Logger;
  requestId: string;
  user?: UserContext;
  // Additional context properties can be added here
}

/**
 * Options for creating a service with context
 */
export interface ServiceOptions {
  logger?: Logger;
  user?: UserContext;
}
