/**
 * Configuration for the Smart Todo application infrastructure.
 * This file centralizes configuration parameters that can be modified
 * to customize deployments across different environments.
 */
import * as os from 'os';

export interface StackConfig {
  /**
   * The name of the stack to be deployed.
   * This will be used as the CloudFormation stack name.
   */
  stackName: string;
  
  /**
   * A prefix to be added to all resource names.
   * This helps identify resources belonging to a specific deployment.
   * For example: 'dev-', 'prod-', 'test-', etc.
   */
  resourcePrefix: string;
  
  /**
   * AWS region for deployment
   */
  region?: string;
  
  /**
   * AWS account ID for deployment
   */
  account?: string;

  /**
   * ECS configuration including CPU architecture and Dockerfile mapping
   * Optional to maintain backward compatibility
   */
  ecsConfig?: {
    /**
     * CPU architecture for ECS tasks
     * X86_64 for Intel/AMD processors
     * ARM64 for ARM processors (AWS Graviton, Apple Silicon)
     */
    cpuArchitecture: 'X86_64' | 'ARM64';
    
    /**
     * Mapping of architecture to Dockerfile name
     */
    dockerfileMap: {
      'X86_64': string;
      'ARM64': string;
    };
  };
}

/**
 * Auto-detect the current architecture
 * @returns The detected CPU architecture (X86_64 or ARM64)
 */
function detectArchitecture(): 'X86_64' | 'ARM64' {
  const arch = os.arch();
  return arch === 'arm64' ? 'ARM64' : 'X86_64';
}

/**
 * Default configuration for the Smart Todo application.
 * These values can be overridden when instantiating the stack.
 */
export const defaultConfig: StackConfig = {
  stackName: 'SmartTodoNovaStack',
  resourcePrefix: 'nova-',
  ecsConfig: {
    // Auto-detect architecture by default
    cpuArchitecture: detectArchitecture(),
    dockerfileMap: {
      'X86_64': 'Dockerfile.amd64',
      'ARM64': 'Dockerfile.arm64'
    }
  }
};

/**
 * Helper function to generate a resource name with the configured prefix
 * @param config The stack configuration
 * @param baseName The base name of the resource
 * @returns The prefixed resource name
 */
export function prefixResourceName(config: StackConfig, baseName: string): string {
  return `${config.resourcePrefix}${baseName}`;
}
