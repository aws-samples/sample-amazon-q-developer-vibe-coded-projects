/**
 * ECR Construct
 * Creates ECR repository with automatic Docker image building and pushing
 */

import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Repository, TagStatus } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Config } from '../lib/config';
import * as path from 'path';

export interface EcrConstructProps {
  /**
   * Path to the directory containing the Dockerfile
   * @default '../app' (relative to CDK project)
   */
  dockerfilePath?: string;
}

export class EcrConstruct extends Construct {
  public readonly repository: Repository;
  public readonly dockerImageAsset: DockerImageAsset;

  constructor(scope: Construct, id: string, props?: EcrConstructProps) {
    super(scope, id);

    const dockerfilePath = props?.dockerfilePath || path.resolve(__dirname, '../../app');

    // Create ECR repository
    this.repository = new Repository(this, 'Repository', {
      repositoryName: Config.getResourceName('app-repo'),
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        // Delete untagged images after 1 day
        {
          rulePriority: 1,
          description: 'Delete untagged images after 1 day',
          tagStatus: TagStatus.UNTAGGED,
          maxImageAge: Duration.days(1),
        },
        // Keep only the latest 10 images (ANY rule must have highest priority)
        {
          rulePriority: 2,
          description: 'Keep only latest 10 images',
          tagStatus: TagStatus.ANY,
          maxImageCount: 10,
        },
      ],
    });

    // Create Docker image asset with automatic building and pushing
    this.dockerImageAsset = new DockerImageAsset(this, 'DockerImageAsset', {
      directory: dockerfilePath,
      platform: Platform.LINUX_AMD64, // Target AWS Fargate platform
      buildArgs: {
        BUILDPLATFORM: 'linux/amd64',
        TARGETPLATFORM: 'linux/amd64',
      },
      exclude: [
        'node_modules',
        '*.log',
        '.git',
        '.gitignore',
        'README.md',
        'src',
        'tsconfig.json',
        '.eslintrc*',
        '.prettierrc*',
      ],
    });
  }

  /**
   * Get the ECR repository
   */
  public getRepository(): Repository {
    return this.repository;
  }

  /**
   * Get the Docker image asset
   */
  public getDockerImageAsset(): DockerImageAsset {
    return this.dockerImageAsset;
  }

  /**
   * Get the image URI for use in ECS task definitions
   */
  public getImageUri(): string {
    return this.dockerImageAsset.imageUri;
  }

  /**
   * Get the repository URI
   */
  public getRepositoryUri(): string {
    return this.repository.repositoryUri;
  }
}
