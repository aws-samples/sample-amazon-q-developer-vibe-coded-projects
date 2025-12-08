#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { AppStack } from '../lib/app-stack';
import { Config } from '../lib/config';

const app = new cdk.App();

// Create the main application stack
new AppStack(app, Config.stackName, {
  /* Environment configuration - uses AWS CLI detected account and region */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  
  /* Alternative static configuration (uncomment if needed):
   * env: { account: '123456789012', region: 'us-east-1' },
   */
  
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// Apply AWS Solutions compliance checks to the entire app
// This will check all stacks in the app for compliance violations
Aspects.of(app).add(new AwsSolutionsChecks({ 
  verbose: true,
  logIgnores: false 
}));
