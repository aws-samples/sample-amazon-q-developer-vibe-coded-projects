#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SmartTodoStack } from '../lib/smart-todo-stack';
import { AwsSolutionsChecks } from 'cdk-nag';
import { defaultConfig, StackConfig } from '../lib/config';
import * as os from 'os';

const app = new cdk.App();

// Get account and region from context or environment variables
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Auto-detect architecture if not provided
function detectArchitecture(): 'X86_64' | 'ARM64' {
  const arch = os.arch();
  return arch === 'arm64' ? 'ARM64' : 'X86_64';
}

// Get CPU architecture from context or auto-detect
const cpuArchitecture = app.node.tryGetContext('cpuArchitecture') || detectArchitecture();

// Use default configuration with context values
const stackConfig: StackConfig = {
  ...defaultConfig,
  region: region,
  account: account,
  ecsConfig: {
    cpuArchitecture: cpuArchitecture as 'X86_64' | 'ARM64',
    dockerfileMap: {
      'X86_64': 'Dockerfile.amd64',
      'ARM64': 'Dockerfile.arm64'
    }
  }
};

// Log configuration for visibility
console.log('Stack configuration:');
console.log(`  Stack name: ${stackConfig.stackName}`);
console.log(`  Resource prefix: ${stackConfig.resourcePrefix}`);
if (stackConfig.ecsConfig) {
  console.log(`  CPU Architecture: ${stackConfig.ecsConfig.cpuArchitecture}`);
  console.log(`  Using Dockerfile: ${stackConfig.ecsConfig.dockerfileMap[stackConfig.ecsConfig.cpuArchitecture]}`);
}

// Instantiate the stack with the configuration
const smartTodoStack = new SmartTodoStack(app, stackConfig.stackName, stackConfig, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { 
    account: stackConfig.account, 
    region: stackConfig.region 
  }

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// Add CDK Nag to the app but disable it for this deployment
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
