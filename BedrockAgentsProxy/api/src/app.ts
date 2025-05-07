import express from 'express';
import serverless from 'serverless-http';
import routes from './routes';
import { loggingMiddleware, errorHandler, notFoundHandler } from './middleware';

// Create Express app
const app = express();

// Apply middleware
app.use(express.json());
app.use(loggingMiddleware);

// Mount routes with both URL patterns
// Standard routes (for local development)
app.use('/', routes);

// API Gateway routes (with /api prefix)
app.use('/api', routes);

// Handle 404 errors - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be the last middleware
app.use(errorHandler);

// Export the Express app and serverless handler
export { app };
export const handler = serverless(app);
