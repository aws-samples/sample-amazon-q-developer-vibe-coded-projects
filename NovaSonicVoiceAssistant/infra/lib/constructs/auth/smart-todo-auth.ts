import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface SmartTodoAuthConstructProps {
  /**
   * The application name to use in Cognito resources
   */
  appName?: string;
  
  /**
   * CloudFront distribution domain name (optional)
   */
  cloudfrontDomain?: string;

  /**
   * Custom domain for Cognito hosted UI (optional)
   */
  cognitoDomain?: string;
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

  /** The Cognito Domain URL */
  public readonly cognitoDomainUrl: string;

  /** The Cognito User Pool Domain */
  public readonly userPoolDomain: cognito.UserPoolDomain;

  /** The Cognito Logout URL */
  public readonly userPoolLogoutUrl: string;

  constructor(scope: Construct, id: string, props: SmartTodoAuthConstructProps = {}, config?: StackConfig) {
    super(scope, id);
    
    const appName = props.appName || 'SmartTodoApp';
    const resourcePrefix = config?.resourcePrefix || '';
    
    // Create Cognito User Pool with enhanced security settings
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'UserPool'),
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      // Enhanced password policy to address AwsSolutions-COG1
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
    });
    
    // Optional: Add an auto-confirm function to automatically confirm users without email verification
    // This is just for demo purposes and should not be used in production
    const autoConfirmFunction = new lambda.Function(this, 'AutoConfirmFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Auto confirm the user
          event.response.autoConfirmUser = true;
          
          // Auto verify email
          if (event.request.userAttributes.hasOwnProperty("email")) {
            event.response.autoVerifyEmail = true;
          }
          
          return event;
        };
      `),
    });
    
    // Add the trigger to the user pool
    this.userPool.addTrigger(
      cognito.UserPoolOperation.PRE_SIGN_UP,
      autoConfirmFunction
    );
    
    // Generate a unique domain prefix for Cognito hosted UI
    const domainPrefix = props.cognitoDomain || 
      `${resourcePrefix}${appName.toLowerCase()}-${cdk.Names.uniqueId(this.userPool).substring(0, 8).toLowerCase()}`;
    
    // Add domain to the user pool
    this.userPoolDomain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: domainPrefix.toLowerCase(),
      },
    });
    
    this.cognitoDomainUrl = this.userPoolDomain.baseUrl();
    
    // Determine callback URLs based on CloudFront domain
    const callbackUrls = [];
    const logoutUrls = [];
    
    // If CloudFront domain is provided, use it as the primary callback URL
    if (props.cloudfrontDomain) {
      // Add CloudFront URL for OAuth callbacks
      callbackUrls.push(`https://${props.cloudfrontDomain}`);
      callbackUrls.push(`https://${props.cloudfrontDomain}/oauth2/idpresponse`);
      callbackUrls.push(`https://${props.cloudfrontDomain}/api/oauth2/idpresponse`);
      
      // Add CloudFront URL for logout redirects
      logoutUrls.push(`https://${props.cloudfrontDomain}`);
      logoutUrls.push(`https://${props.cloudfrontDomain}/login`);
    }
    
    // Add localhost for development
    callbackUrls.push('http://localhost:3000');
    callbackUrls.push('http://localhost:5173');
    callbackUrls.push('http://localhost:3000/oauth2/idpresponse');
    callbackUrls.push('http://localhost:5173/oauth2/idpresponse');
    logoutUrls.push('http://localhost:3000');
    logoutUrls.push('http://localhost:5173');
    
    // Create Cognito User Pool Client
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'WebClient'),
      generateSecret: false, // Set to false to fix the SECRET_HASH error with UI-based auth
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL, 
          cognito.OAuthScope.OPENID, 
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      preventUserExistenceErrors: true,
    });
    
    // Store IDs for output
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
    
    // Create the logout URL - prefer CloudFront if available
    const redirectUri = props.cloudfrontDomain ? 
      encodeURIComponent(`https://${props.cloudfrontDomain}`) : 
      encodeURIComponent('http://localhost:3000');
    
    this.userPoolLogoutUrl = `${this.cognitoDomainUrl}/logout?client_id=${this.userPoolClientId}&logout_uri=${redirectUri}`;
    
    // Output the Cognito domain URL
    new cdk.CfnOutput(this, 'CognitoDomainUrl', {
      value: this.cognitoDomainUrl,
      description: 'Cognito Hosted UI URL',
    });
    
    // Output the Cognito logout URL
    new cdk.CfnOutput(this, 'CognitoLogoutUrl', {
      value: this.userPoolLogoutUrl,
      description: 'Cognito Logout URL',
    });
  }
}
