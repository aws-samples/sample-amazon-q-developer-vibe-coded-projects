import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

/**
 * Storage infrastructure construct for the Smart Todo application.
 * Creates a DynamoDB table using single-table design pattern.
 */
export class SmartTodoTableConstruct extends Construct {
  /** The DynamoDB table for storing all application data */
  public readonly table: dynamodb.Table;

  /** The name of the DynamoDB table */
  public readonly tableName: string;

  constructor(scope: Construct, id: string, config?: StackConfig) {
    super(scope, id);
    
    // Extract resource prefix from parent stack or use default
    const resourcePrefix = config?.resourcePrefix || 
      (scope instanceof cdk.Stack && (scope as any).resourcePrefix) || '';
    
    // Create DynamoDB table with a prefixed name using single-table design
    this.table = new dynamodb.Table(this, 'TodoTable', {
      tableName: `${resourcePrefix}todo-list-table`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo application for easy cleanup.
      pointInTimeRecoverySpecification:
      {
        pointInTimeRecoveryEnabled:true, 
        recoveryPeriodInDays:1
      },
      timeToLiveAttribute: 'expiresAt',
    });

    // Store the table name with the prefix for reference
    this.tableName = this.table.tableName;
  }
}
