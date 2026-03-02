/**
 * MSK Express Configuration
 * All configuration values for the MSK Express Kafka Performance Workbench
 * 
 * 🎯 EDIT THIS FILE TO CUSTOMIZE YOUR DEPLOYMENT
 */

import { 
  DeploymentConfig, 
  MskBrokerConfig, 
  NamingHelper,
  getStackName,
  getResourceName,
  getResourceId,
  getBrokerIds
} from './config-types-and-helpers';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const AppName = 'MskExpressApp';
export const AppPrefix = 'mske';
export const EnvPrefix = 'test'; // dev, staging, prod

// ============================================================================
// MSK BROKER CONFIGURATION
// ============================================================================

export const mskBrokerConfig: MskBrokerConfig = {
  numberOfBrokers: 2,  // 2 per AZ = 6 total brokers
  instanceType: 'express.m7g.large',  // MSK Express instance type
};

// ============================================================================
// DEPLOYMENT CONFIGURATION
// ============================================================================

export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 100, instances: 5, messageSizeBytes: 1024 ,cpu: 512, memoryMiB: 1024 },
    { topics: 1, partitionsPerTopic: 100, instances: 5, messageSizeBytes: 512 },
    { topics: 3, partitionsPerTopic: 100, instances: 5, messageSizeBytes: 4096, cpu: 1024, memoryMiB: 2048 },
    { topics: 1, partitionsPerTopic: 200, instances: 10, messageSizeBytes: 2048, cpu: 1024, memoryMiB: 2048 },
    { topics: 1, partitionsPerTopic: 100, instances: 25, messageSizeBytes: 512, cpu: 2048, memoryMiB: 4096 },
  ],
};

// ============================================================================
// COMPUTED CONFIGURATION (DO NOT EDIT)
// ============================================================================

/**
 * Main configuration object with all computed values
 * This provides a single point of access for all configuration
 */
export const Config = {
  // Environment
  appName: AppName,
  appPrefix: AppPrefix,
  envPrefix: EnvPrefix,
  stackName: getStackName(EnvPrefix, AppPrefix),
  
  // Helper functions
  getResourceName: (resourceType: string) => getResourceName(EnvPrefix, AppPrefix, resourceType),
  getResourceId: (resourceType: string) => getResourceId(AppName, resourceType),
  
  // MSK Configuration
  mskBroker: mskBrokerConfig,
  getBrokerIds: () => getBrokerIds(mskBrokerConfig),
  
  // Deployment Configuration
  deployment: deploymentConfig,
  
  // Naming Helper
  naming: new NamingHelper(EnvPrefix, AppPrefix),
} as const;

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

// Validate configuration on import
const validation = NamingHelper.validateConfiguration(deploymentConfig);

if (!validation.valid) {
  throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
}

// ============================================================================
// CONFIGURATION SUMMARY
// ============================================================================

// Configuration is valid - summary available in deployment logs
