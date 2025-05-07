import express from 'express';
import serverless from 'serverless-http';
import http from 'http';
import routes from './routes/index';
import healthRoutes from './routes/health/index';
import { loggingMiddleware, contextMiddleware, errorHandler, notFoundHandler, authMiddleware } from './middleware';
import { websocketService } from './services/websocket-service';
import { registerAllTools } from './tools';
import { NovaSonicClient } from './services/nova-sonic';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// Create Express app
const app = express();
const server = http.createServer(app);

// Apply middleware
app.use(express.json());
app.use(loggingMiddleware);
app.use(contextMiddleware); // Initialize request context after logging middleware

// Mount health routes before authentication
// This ensures health checks work without authentication
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Apply authentication middleware after context is initialized
// All routes below this will require authentication
app.use(authMiddleware);

// Mount authenticated routes
app.use('/', routes);
app.use('/api', routes);

// Handle 404 errors - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be the last middleware
app.use(errorHandler);

// Initialize WebSocket server
websocketService.initialize(server, '/novasonic');

// Register all tools with the NovaSonic client
registerAllTools(websocketService['novaSonicClient']);

// Export the Express app, server, and serverless handler
export { app, server };
export const handler = serverless(app);
