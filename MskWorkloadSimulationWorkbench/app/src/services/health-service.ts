import { ConfigService } from './config-service';
import { Logger } from 'pino';

export class HealthService {
  constructor(
    private _logger: Logger,
    private _workbenchApp?: any
  ) {}

  async checkHealth() {
    try {
      let kafkaStatus = null;
      let isHealthy = true;

      // Check workbench application status if available
      if (this._workbenchApp) {
        const workbenchReady = this._workbenchApp.isReady();
        const config = this._workbenchApp.getConfig();
        
        kafkaStatus = {
          workbench: {
            ready: workbenchReady,
            serviceIndex: config.getServiceIndex(),
            serviceName: config.getServiceName(),
            topics: config.getTopics(),
            topicCount: config.getTopicCount(),
            partitionsPerTopic: config.getPartitionsPerTopic(),
          }
        };
        
        isHealthy = workbenchReady;
      }
      
      this._logger.info({
        endpoint: '/health',
        status: isHealthy ? 'healthy' : 'unhealthy',
        kafkaStatus,
        timestamp: new Date().toISOString(),
      }, 'Health check completed');

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: ConfigService.APP_NAME,
        uptime: process.uptime(),
        kafka: kafkaStatus,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this._logger.error({
        endpoint: '/health',
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }, 'Health check failed');

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: ConfigService.APP_NAME,
        kafka: null,
        error: errorMessage,
      };
    }
  }

  checkReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: ConfigService.APP_NAME,
    };
  }

  /**
   * Set workbench application reference for health checks
   */
  setWorkbenchApp(workbenchApp: any): void {
    this._workbenchApp = workbenchApp;
  }
}
