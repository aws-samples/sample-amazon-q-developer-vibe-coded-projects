import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Storage infrastructure construct for the Smart Todo application.
 * Creates a DynamoDB table using single-table design pattern.
 */
export class SmartTodoTableConstruct extends Construct {
  /** The DynamoDB table for storing all application data */
  public readonly table: dynamodb.Table;

  /** The name of the DynamoDB table */
  public readonly tableName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create DynamoDB table with a static name using single-table design
    this.table = new dynamodb.Table(this, 'SmartTodoTable', {
      tableName: 'smart-todo-list-table',
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

    this.tableName = this.table.tableName;
  }
}
