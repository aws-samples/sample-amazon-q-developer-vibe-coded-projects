/**
 * Configuration Types and Helper Functions
 * Consolidated types, interfaces, and utility functions for the MSK Express project
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ServiceConfig {
  topics: number;           // Number of topics this service will create
  partitionsPerTopic: number;  // Number of partitions per topic
  instances: number;        // Number of ECS task instances
  messageSizeBytes: number; // Message payload size in bytes (1-1048576)
  cpu?: number;            // CPU units (256, 512, 1024, 2048, 4096) - defaults to 256
  memoryMiB?: number;      // Memory in MiB (512, 1024, 2048, 4096, 8192, etc.) - defaults to 512
}

export interface DeploymentConfig {
  services: ServiceConfig[];
}

export interface MskBrokerConfig {
  numberOfBrokers: number;  // Number of brokers per AZ (total = numberOfBrokers × 3 AZs)
  instanceType: string;     // MSK Express instance type
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Utility functions to generate consistent resource names
 */
export const getStackName = (envPrefix: string, appPrefix: string): string => {
  return `${envPrefix}-${appPrefix}-stack`;
};

export const getResourceName = (envPrefix: string, appPrefix: string, resourceType: string): string => {
  return `${envPrefix}-${appPrefix}-${resourceType}`;
};

export const getResourceId = (appName: string, resourceType: string): string => {
  return `${appName}${resourceType}`;
};

/**
 * Validation helper for task resources
 */
export class TaskResourceValidator {
  /**
   * Validate CPU and memory configuration for Fargate compatibility
   */
  static validateTaskResources(serviceConfig: ServiceConfig, serviceIndex: number): void {
    const cpu = serviceConfig.cpu || 256;
    const memory = serviceConfig.memoryMiB || 512;

    // Valid Fargate CPU values
    const validCpuValues = [256, 512, 1024, 2048, 4096];
    if (!validCpuValues.includes(cpu)) {
      throw new Error(`Service ${serviceIndex}: Invalid CPU value ${cpu}. Valid values: ${validCpuValues.join(', ')}`);
    }

    // Valid memory ranges based on CPU
    const memoryRanges: { [key: number]: number[] } = {
      256: [512, 1024, 2048],
      512: [1024, 2048, 3072, 4096],
      1024: [2048, 3072, 4096, 5120, 6144, 7168, 8192],
      2048: [4096, 5120, 6144, 7168, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384],
      4096: [8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 17408, 18432, 19456, 20480, 21504, 22528, 23552, 24576, 25600, 26624, 27648, 28672, 29696, 30720]
    };

    const validMemoryValues = memoryRanges[cpu];
    if (!validMemoryValues.includes(memory)) {
      throw new Error(`Service ${serviceIndex}: Invalid memory ${memory} MiB for CPU ${cpu}. Valid values: ${validMemoryValues.join(', ')}`);
    }
  }

  /**
   * Get default memory for CPU if not specified
   */
  static getDefaultMemory(cpu: number): number {
    const defaultMemory: { [key: number]: number } = {
      256: 512,
      512: 1024,
      1024: 2048,
      2048: 4096,
      4096: 8192
    };
    return defaultMemory[cpu] || 512;
  }
}

/**
 * Generate broker IDs dynamically based on broker count
 * Note: MSK Express may create more brokers than configured due to AZ distribution
 */
export const getBrokerIds = (mskBrokerConfig: MskBrokerConfig): string[] => {
  // For MSK Express with 3 AZs, we expect:
  // numberOfBrokers: 1 → 3 total brokers (1 per AZ) → IDs: 1, 2, 3
  // numberOfBrokers: 2 → 6 total brokers (2 per AZ) → IDs: 1, 2, 3, 4, 5, 6
  // numberOfBrokers: 3 → 9 total brokers (3 per AZ) → IDs: 1, 2, 3, 4, 5, 6, 7, 8, 9
  const expectedTotal = mskBrokerConfig.numberOfBrokers * 3; // 3 AZs
  return Array.from({ length: expectedTotal }, (_, i) => (i + 1).toString());
};

// ============================================================================
// NAMING HELPER CLASS
// ============================================================================

export class NamingHelper {
  private envPrefix: string;
  private appPrefix: string;

  constructor(envPrefix: string, appPrefix: string) {
    this.envPrefix = envPrefix;
    this.appPrefix = appPrefix;
  }

  /**
   * Generate service name: dev-mske-service-0, dev-mske-service-1, etc.
   */
  getServiceName(serviceIndex: number): string {
    return getResourceName(this.envPrefix, this.appPrefix, `service-${serviceIndex}`);
  }
  
  /**
   * Generate topic names: dev-mske-service-0-topic-0, dev-mske-service-0-topic-1, etc.
   */
  getTopicName(serviceIndex: number, topicIndex: number): string {
    return getResourceName(this.envPrefix, this.appPrefix, `service-${serviceIndex}-topic-${topicIndex}`);
  }
  
  /**
   * Get all topic names for a service
   */
  getServiceTopics(serviceIndex: number, topicCount: number): string[] {
    const topics: string[] = [];
    for (let i = 0; i < topicCount; i++) {
      topics.push(this.getTopicName(serviceIndex, i));
    }
    return topics;
  }
  
  /**
   * Get total number of topics across all services
   */
  static getTotalTopics(config: DeploymentConfig): number {
    return config.services.reduce((total, service) => total + service.topics, 0);
  }
  
  /**
   * Get total number of instances across all services
   */
  static getTotalInstances(config: DeploymentConfig): number {
    return config.services.reduce((total, service) => total + service.instances, 0);
  }

  /**
   * Get total number of partitions across all services
   */
  static getTotalPartitions(config: DeploymentConfig): number {
    return config.services.reduce((total, service) => 
      total + (service.topics * service.partitionsPerTopic), 0
    );
  }

  /**
   * Format message size for display
   */
  static formatMessageSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
  }

  /**
   * Validate configuration
   */
  static validateConfiguration(config: DeploymentConfig): ValidationResult {
    const errors: string[] = [];

    // Check service count limits
    if (config.services.length === 0) {
      errors.push('At least one service must be configured');
    }
    if (config.services.length > 20) {
      errors.push('Maximum 20 services allowed');
    }

    // Check resource limits
    const totalInstances = this.getTotalInstances(config);
    if (totalInstances > 100) {
      errors.push(`Total instances (${totalInstances}) exceeds limit (100)`);
    }

    // Check individual service limits
    config.services.forEach((service, index) => {
      if (service.topics < 1 || service.topics > 50) {
        errors.push(`Service ${index}: topics must be between 1 and 50`);
      }
      if (service.partitionsPerTopic < 1 || service.partitionsPerTopic > 100) {
        errors.push(`Service ${index}: partitions per topic must be between 1 and 100`);
      }
      if (service.instances < 1 || service.instances > 50) {
        errors.push(`Service ${index}: instances must be between 1 and 50`);
      }
      if (service.messageSizeBytes < 1 || service.messageSizeBytes > 1048576) {
        errors.push(`Service ${index}: message size must be between 1 and 1,048,576 bytes (1MB)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
