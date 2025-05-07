import { Logger } from 'pino';
import { createLogger } from '../middleware';
import { RequestContext, UserContext, ServiceOptions } from '../types/context.types';

/**
 * Base service class that all services can extend
 * Provides common functionality for logging and context handling
 */
export abstract class BaseService {
  protected logger: Logger;
  protected user?: UserContext;
  
  constructor(options: ServiceOptions = {}) {
    this.logger = options.logger || createLogger(this.constructor.name);
    this.user = options.user;
  }
  
  /**
   * Creates a new instance of the service with the provided context
   * This allows for request-specific logging and user information
   */
  withContext(context: RequestContext): this {
    // Create a new instance with the same prototype
    const clone = Object.create(Object.getPrototypeOf(this));
    
    // Copy all properties from this instance to the clone
    Object.assign(clone, this);
    
    // Set the context-specific logger and user
    clone.logger = context.logger.child({ 
      service: this.constructor.name,
      requestId: context.requestId
    });
    clone.user = context.user;
    
    return clone as this;
  }
  
  /**
   * Creates a new instance of the service with just a logger
   * Useful when a full context isn't available
   */
  withLogger(logger: Logger): this {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone.logger = logger.child({ service: this.constructor.name });
    return clone as this;
  }
}
