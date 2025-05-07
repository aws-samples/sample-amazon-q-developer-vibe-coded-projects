import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for the LambdaFunctionPermissionsConstruct
 */
export interface LambdaFunctionPermissionsProps {
  /**
   * The Lambda function to add permissions to
   */
  lambdaFunction: lambda.Function;
  
  /**
   * The service principal that can invoke the Lambda function
   */
  servicePrincipal: string;
  
  /**
   * A unique identifier for the permission
   */
  id: string;
  
  /**
   * Optional source ARN to restrict who can invoke the function
   */
  sourceArn?: string;
}

/**
 * Construct that adds permissions to a Lambda function
 */
export class LambdaFunctionPermissionsConstruct extends Construct {
  /**
   * The Lambda permission resource
   */
  public readonly permission: lambda.CfnPermission;

  constructor(scope: Construct, id: string, props: LambdaFunctionPermissionsProps) {
    super(scope, id);

    // Add permission to invoke the Lambda function
    this.permission = new lambda.CfnPermission(this, 'Permission', {
      action: 'lambda:InvokeFunction',
      functionName: props.lambdaFunction.functionName,
      principal: props.servicePrincipal,
      sourceArn: props.sourceArn,
    });
  }
}
