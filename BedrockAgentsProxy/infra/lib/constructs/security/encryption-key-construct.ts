import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

/**
 * Properties for the EncryptionKeyConstruct
 */
export interface EncryptionKeyConstructProps {
  /**
   * The alias for the KMS key
   */
  keyAlias: string;
  
  /**
   * Description for the KMS key
   */
  description?: string;
}

/**
 * Construct that creates a KMS key for encryption/decryption operations
 */
export class EncryptionKeyConstruct extends Construct {
  /**
   * The KMS key created for encryption/decryption
   */
  public readonly key: kms.Key;
  
  /**
   * The ARN of the KMS key
   */
  public readonly keyArn: string;
  
  /**
   * The ID of the KMS key
   */
  public readonly keyId: string;

  constructor(scope: Construct, id: string, props: EncryptionKeyConstructProps) {
    super(scope, id);

    // Create a KMS key for encryption/decryption
    this.key = new kms.Key(this, 'Key', {
      enableKeyRotation: true,
      description: props.description || `KMS key for ${props.keyAlias}`,
      alias: props.keyAlias,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only, use RETAIN for production
    });
    
    this.keyArn = this.key.keyArn;
    this.keyId = this.key.keyId;
    
    // Output the key ARN and ID
    new cdk.CfnOutput(this, 'KeyArn', {
      value: this.keyArn,
      description: `ARN of the KMS key for ${props.keyAlias}`,
    });
    
    new cdk.CfnOutput(this, 'KeyId', {
      value: this.keyId,
      description: `ID of the KMS key for ${props.keyAlias}`,
    });
  }
}
