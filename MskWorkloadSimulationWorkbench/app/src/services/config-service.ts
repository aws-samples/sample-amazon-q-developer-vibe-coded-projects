import { MskConfig } from '../kafka/kafka-config';

export class ConfigService {
  // Essential application constants
  static readonly APP_NAME = 'msk-express-app';
  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_REGION = 'us-east-1';
  static readonly DEFAULT_TOPIC_NAME = 'testTopic';

  static getPort(): number {
    return parseInt(process.env.PORT || String(ConfigService.DEFAULT_PORT), 10);
  }

  static getRegion(): string {
    return process.env.AWS_REGION || ConfigService.DEFAULT_REGION;
  }

  static getMskConfig(): MskConfig | null {
    const clusterArn = process.env.MSK_CLUSTER_ARN;
    const clusterName = process.env.MSK_CLUSTER_NAME;

    if (!clusterArn || !clusterName) {
      return null;
    }

    return {
      clusterArn,
      clusterName,
      region: ConfigService.getRegion(),
      topicName: process.env.MSK_TOPIC_NAME || ConfigService.DEFAULT_TOPIC_NAME,
      clientId: `${ConfigService.APP_NAME}-client`,
    };
  }

  static getRequiredMskEnvVars(): string[] {
    return ['MSK_CLUSTER_ARN', 'MSK_CLUSTER_NAME'];
  }
}
