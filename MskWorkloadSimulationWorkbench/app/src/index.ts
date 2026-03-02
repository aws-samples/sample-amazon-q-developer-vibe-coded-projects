/**
 * MSK Express Workbench Application - Main Entry Point
 * Routes to orchestrator or workload based on ROLE env var
 */

const role = process.env.ROLE || 'workload';

if (role === 'orchestrator') {
  import('./services/orchestrator-service').then(({ OrchestratorService }) => {
    new OrchestratorService().start().catch((error) => {
      process.stderr.write(`Failed to start orchestrator: ${error}\n`);
      process.exit(1);
    });
  });
} else {
  import('./services/workbench-application-service').then(({ WorkbenchApplicationService }) => {
    const app = new WorkbenchApplicationService();
    app.start().catch((error) => {
      process.stderr.write(`Failed to start workbench application: ${error}\n`);
      process.exit(1);
    });
  });
}
