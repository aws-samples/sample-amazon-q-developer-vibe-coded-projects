import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface SmartTodoAuthConstructProps {
  /**
   * The application name to use in Cognito resources
   */
  appName?: string;
  
  /**
   * CloudFront distribution domain name (optional)
   */
  cloudfrontDomain?: string;
}

/**
 * Authentication infrastructure construct for the Smart Todo application.
 * Creates a Cognito User Pool and Client for user authentication.
 */
export class SmartTodoAuthConstruct extends Construct {
  /** The Cognito User Pool */
  public readonly userPool: cognito.UserPool;
  
  /** The Cognito User Pool Client */
  public readonly userPoolClient: cognito.UserPoolClient;
  
  /** The Cognito User Pool ID */
  public readonly userPoolId: string;
  
  /** The Cognito User Pool Client ID */
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props: SmartTodoAuthConstructProps = {}) {
    super(scope, id);
    
    const appName = props.appName || 'SmartTodoApp';
    
    // Create Cognito User Pool with enhanced security settings
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${appName}-UserPool`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true, 
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo only
    });
    
    // Determine callback URLs based on CloudFront domain
    const callbackUrls = props.cloudfrontDomain 
      ? [`https://${props.cloudfrontDomain}`]
      : ['http://localhost:3000'];
    
    const logoutUrls = props.cloudfrontDomain
      ? [`https://${props.cloudfrontDomain}`]
      : ['http://localhost:3000'];
    
    // Create Cognito User Pool Client
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `${appName}-WebClient`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls,
        logoutUrls,
      },
    });
    
    // Store IDs for output
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
  }
}
