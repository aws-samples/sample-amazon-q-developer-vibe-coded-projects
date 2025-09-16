import { Router, Request, Response } from 'express';
import { Logger } from 'pino';
import { HealthService } from './health-service';

export class RoutesService {
  private router: Router;

  constructor(
    private _logger: Logger,
    private _healthService: HealthService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', async (req: Request, res: Response) => {
      try {
        const healthResult = await this._healthService.checkHealth();
        
        if (healthResult.status === 'healthy') {
          res.status(200).json(healthResult);
        } else {
          res.status(503).json(healthResult);
        }
      } catch (error) {
        this._logger.error({
          endpoint: '/health',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }, 'Health check endpoint error');

        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'msk-express-app',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Readiness check endpoint
    this.router.get('/ready', (req: Request, res: Response) => {
      const readinessResult = this._healthService.checkReadiness();
      res.status(200).json(readinessResult);
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
