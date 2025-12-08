/**
 * MSK Express Workbench Application - Main Entry Point
 * Multi-topic Kafka performance testing workbench
 */

import { WorkbenchApplicationService } from './services/workbench-application-service';

// Initialize and start the workbench application
const app = new WorkbenchApplicationService();

// Start the application
app.start().catch((error) => {
  process.stderr.write(`Failed to start workbench application: ${error}\n`);
  process.exit(1);
});

// Export the Express app for testing purposes
export default app.getApp();
