import * as cdk from 'aws-cdk-lib';
import { SmartTodoUiProps } from './smart-todo-ui-props';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * UI infrastructure construct for the Smart Todo application.
 * Sets up S3 static website hosting with CloudFront distribution.
 * CloudFront routes /api/* to HTTP API Gateway and everything else to S3.
 */
export class SmartTodoUiConstruct extends Construct {
  /** The S3 bucket that stores the website files */
  public readonly bucket: s3.Bucket;

  /** The CloudFront distribution that serves the website */
  public readonly distribution: cloudfront.Distribution;

  /** The CloudFront distribution domain name */
  public readonly distributionDomain: string;

  /** The CloudFront distribution URL */
  public readonly distributionUrl: string;

  /** The API Gateway URL */
  private apiGatewayUrl: string;

  constructor(scope: Construct, id: string, props: SmartTodoUiProps) {
    super(scope, id);

    // Create S3 bucket for website hosting
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL:true
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod:cloudfront.SSLMethod.SNI,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

      },
    });

    // Store the distribution domain name
    this.distributionDomain = this.distribution.distributionDomainName;
    this.distributionUrl = `https://${this.distributionDomain}`;

    // Store the API Gateway URL
    this.apiGatewayUrl = props.apiGateway?.url || '';

    // Deploy website files to S3
    if (fs.existsSync(path.join(__dirname, '../../../../ui/dist'))) {
      new s3deploy.BucketDeployment(this, 'DeployWebsite', {
        sources: [s3deploy.Source.asset(path.join(__dirname, '../../../../ui/dist'))],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ['/*'],
      });
    } else {
      console.warn('UI build files not found. Skipping website deployment.');
    }
  }

  /**
   * Add API Gateway behavior to the CloudFront distribution
   * @param apiUrl The API Gateway URL
   */
  public addApiGateway(apiUrl: string): void {
    // Store the API Gateway URL
    this.apiGatewayUrl = apiUrl;

    // Extract the domain name from the API URL
    const apiDomain = apiUrl.replace(/^https?:\/\//, '').split('/')[0];

    // Add API Gateway origin
    const apiOrigin = new origins.HttpOrigin(apiDomain, {
      originPath: '/prod',
    });

    // Add behavior for /api/* paths
    this.distribution.addBehavior('/api/*', apiOrigin, {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });
  }
}
