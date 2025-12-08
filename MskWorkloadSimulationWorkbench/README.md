# MSK Express Broker Workload Simulation Workbench

A configurable workload simulation platform for learning and preparing MSK Express production deployments, featuring customizable workloads, real-time monitoring, and hands-on experience with MSK Express broker capabilities.

## 🚀 **Quick Start**

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Deploy to AWS
npm run deploy:stack
```

**Dashboard URL**: Check your deployment output for the CloudWatch dashboard link.


## 🎯 **Configurable Workbench Architecture**

![Alt text](/img/ArchitectureDiagram.png "Architecture Diagram")

The workbench allows you to run **multiple concurrent services** with different configurations to test various Kafka performance scenarios. You can customize:

### **Service Configuration Options:**
- **Number of Services**: 1 to N concurrent services
- **Topics per Service**: 1 to multiple topics per service
- **Partitions per Topic**: Configurable partition strategy
- **Instances per Service**: Auto-scaling instance counts
- **Message Size**: 1 byte to 1MB per message (configurable payload size)
- **Resource Allocation**: CPU/memory per service type

### **Example Configuration:**
```typescript
// Customize in cdk/lib/config-types.ts
const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 },   // 1KB messages
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 512 },    // 512B messages
    { topics: 3, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 4096 },   // 4KB messages
    // Add more services as needed for your testing
  ]
};
```

### **Flexible Resource Allocation:**
- **Variable Topics**: 1-10+ topics per service
- **Configurable Partitions**: 1-20+ partitions per topic
- **Scalable Instances**: 1-20+ instances per service
- **Mixed Workloads**: Different configurations running simultaneously

## 📁 **Project Structure**

```
├── README.md                    # This comprehensive guide
├── package.json                 # Workspace configuration
├── app/                        # Configurable workbench application
│   ├── src/
│   │   ├── index.ts           # Application entry point
│   │   ├── services/          # Core services (workbench, health, metrics, config)
│   │   └── kafka/             # Multi-topic Kafka streaming layer
│   ├── Dockerfile             # Multi-platform container
│   └── package.json
└── cdk/                       # AWS infrastructure as code
    ├── bin/cdk.ts            # CDK app with compliance checks
    ├── lib/
    │   ├── app-stack.ts      # Main application stack
    │   └── config-types.ts   # Configuration definitions
    └── constructs/           # Reusable infrastructure components
```

## 🎯 **Key Features**

### **Configurable Workload Simulation**
- **Multi-Service Architecture**: Run 1-N services with different configurations to simulate various scenarios
- **Comparative Analysis**: Real-time performance comparison between different configurations
- **A/B Testing**: Test different topics/partitions/instances combinations for learning
- **Load Simulation**: Configurable throughput and latency simulation scenarios

### **Advanced Kafka Streaming**
- **Dynamic Topic Management**: Automatic topic creation based on configuration
- **Flexible Message Distribution**: Round-robin, partition-specific, or custom strategies
- **Multi-Topic Consumption**: Parallel consumption from configurable topic sets
- **End-to-End Latency Tracking**: Configurable monitoring and measurement

### **Production-Ready Infrastructure**
- **MSK Express**: Cost-optimized Kafka cluster for learning and preparation
- **VPC Architecture**: 3-AZ setup with private subnets
- **Container Platform**: ECS Fargate with configurable scaling
- **Dynamic Dashboard**: Auto-adapts to your service configuration
- **Compliance**: CDK NAG validation with AWS Solutions checks

### **Developer Experience**
- **TypeScript**: Full type safety and modern development
- **Configuration-Driven**: Easy to modify test scenarios
- **One-Command Deployment**: Automated AWS setup
- **Clean Architecture**: Modular, testable workbench codebase
- **Comprehensive Logging**: Structured JSON logs to CloudWatch

## 🛠️ **Prerequisites**

- **Node.js** 20.9+ (22+ recommended)
- **AWS CLI** configured with appropriate credentials
- **AWS CDK CLI** installed globally (`npm install -g aws-cdk`)
- **Docker** (for container builds)

**Supported Platforms**: Windows, macOS, Linux

## ⚡ **Quick Commands**

```bash
# Development
npm run build              # Build all projects
npm run lint              # Code quality checks
npm run format            # Auto-format code

# Deployment
npm run deploy:stack      # Build and deploy to AWS
npm run destroy:stack     # Clean up AWS resources

# Configuration
npm run nag-check         # Compliance validation
```

## 🎯 **What You Get**

After deployment, you'll have:

1. **🚀 Configurable Workbench**: N concurrent Kafka workload simulations
2. **📊 Dynamic Dashboard**: Auto-adapts to your service configuration
3. **🔄 Auto-scaling**: ECS tasks scale based on your configuration and load
4. **⏱️ Latency Tracking**: End-to-end performance monitoring per service
5. **💰 Cost Optimization**: MSK Express for 90% cost savings
6. **🛡️ Production Security**: VPC isolation, IAM roles, compliance checks

## 🌟 **Workbench Highlights**

- **Configuration-Driven**: Easy to modify for different test scenarios
- **Performance Comparison**: Side-by-side analysis of different configurations
- **Cost-Optimized Kafka**: MSK Express for development/testing workloads
- **Multi-AZ Resilience**: 3 availability zones for high availability
- **Private Networking**: Isolated subnets with VPC endpoints
- **Adaptive Monitoring**: Dashboard adjusts to your configuration

## 📈 **Dynamic Dashboard**

Your deployment includes a CloudWatch dashboard that automatically adapts to your configuration:

- **Service Throughput Comparison**: Producer vs Consumer rates per configured service
- **Service Performance Summary**: Individual service throughput widgets
- **Latency Comparison**: Average and P95 latency across all configured services
- **Configuration Analysis**: Impact of your topics/partitions/instances choices

## ⚠️ **Important Disclaimer**

The MSK Express Broker Workload Simulation Workbench is designed as an **educational and sizing estimation tool** to help teams prepare for MSK Express production deployments. While it provides valuable insights into performance characteristics, results may vary based on your specific use cases, network conditions, and configurations. 

**Use workbench results as guidance for initial sizing and planning. Always conduct comprehensive performance validation with your actual workloads in production-like environments before final deployment.**

**Recommended Usage:**
- **Production readiness and team training** for MSK Express capabilities
- **Understanding MSK Express advantages**: 3× throughput, 20× faster scaling, 90% faster recovery
- **Architecture validation** leveraging MSK Express simplified operations
- **Capacity planning** using MSK Express enhanced performance characteristics
- **Preparing teams** for production Kafka implementations with MSK Express

# 🏗️ Architecture

## 🎛️ **Configuration System**

### **Service Configuration Interface**
```typescript
interface ServiceConfig {
  topics: number;                    // Number of topics per service
  partitionsPerTopic: number;        // Partitions per topic
  instances: number;                 // Desired instance count
  messageSizeBytes: number;          // Message payload size in bytes (1-1048576)
}

interface DeploymentConfig {
  services: ServiceConfig[];         // Array of service configurations
}
```

### **Configuration Examples**

#### **Single Service Configuration**
```typescript
const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 3, partitionsPerTopic: 8, instances: 1, messageSizeBytes: 2048 }
  ]
};
// Result: 1 service, 3 topics, 24 partitions, 1 instances, 2KB messages
```

#### **Comparative Testing Configuration**
```typescript
const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 1, instances: 1, messageSizeBytes: 1024 },  // Baseline
    { topics: 1, partitionsPerTopic: 10, instances: 1, messageSizeBytes: 1024 }, // Partition impact
    { topics: 1, partitionsPerTopic: 1, instances: 10, messageSizeBytes: 1024 }, // Instance impact
    { topics: 10, partitionsPerTopic: 1, instances: 1, messageSizeBytes: 1024 }, // Topic impact
  ]
};
// Result: 4 services for A/B/C/D testing
```

#### **Message Size Analysis Configuration**
```typescript
const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 256 },    // Small messages
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 },   // Medium messages
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 8192 },   // Large messages
  ]
};
// Result: 3 services with different message sizes for impact analysis
```

#### **Load Testing Configuration**
```typescript
const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 5, partitionsPerTopic: 20, instances: 15, messageSizeBytes: 1024 }, // High load
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 1024 },   // Control group
  ]
};
// Result: High-load vs control comparison
```

## 🏛️ **Application Architecture**

### **Dynamic Service Generation**

```
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Parser                       │
├─────────────────────────────────────────────────────────────┤
│  DeploymentConfig → ServiceConfig[] → ECS Services          │
│  - Reads configuration                                      │
│  - Generates service definitions                            │
│  - Creates infrastructure resources                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  WorkbenchApplicationService  │  Health & Metrics Services  │
│  - Service orchestration      │  - Health monitoring        │
│  - Configuration management   │  - CloudWatch metrics       │
│  - Graceful shutdown         │  - HTTP endpoints           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Kafka Layer                            │
├─────────────────────────────────────────────────────────────┤
│  MultiTopicManager    │  MultiTopicProducer │ MultiTopicConsumer │
│  - Dynamic topic      │  - Configurable     │ - Flexible         │
│    creation           │    round-robin      │    subscription    │
│  - Replication setup  │  - Load balancing   │ - Parallel         │
│  - Health checks      │  - Error handling   │    processing      │
└─────────────────────────────────────────────────────────────┘
```

### **File Structure**
```
app/src/
├── index.ts                           # Application entry point
├── services/
│   ├── workbench-application-service.ts  # Main orchestrator
│   ├── workbench-config-service.ts       # Configuration parser
│   ├── health-service.ts                 # Health monitoring
│   ├── metrics-service.ts                # CloudWatch metrics
│   ├── routes-service.ts                 # HTTP endpoints
│   └── config-service.ts                 # Basic configuration
└── kafka/
    ├── multi-topic-manager.ts            # Dynamic topic management
    ├── multi-topic-producer.ts           # Configurable producer
    ├── multi-topic-consumer.ts           # Flexible consumer
    └── kafka-config.ts                   # MSK connection config
```

## 🏗️ **Infrastructure Architecture**

### **Dynamic AWS Components**

```
┌─────────────────────────────────────────────────────────────┐
│                        VPC (3 AZs)                         │
├─────────────────────────────────────────────────────────────┤
│  Private Subnets  │  MSK Express    │  ECS Fargate         │
│  - 3 AZ coverage  │  - 3 Brokers    │  - N Services        │
│  - NAT Gateways   │  - Auto-scaling │  - Auto-scaling      │
│  - VPC Endpoints  │  - Monitoring   │  - Health checks     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Configuration-Aware Monitoring              │
├─────────────────────────────────────────────────────────────┤
│  CloudWatch       │  CloudWatch     │  CloudWatch          │
│  - Dynamic        │  - Per-service  │  - Adaptive          │
│    metrics        │    logs         │    dashboard         │
│  - Configurable   │  - Structured   │  - Auto-layout       │
│    dimensions     │  - Searchable   │  - Real-time         │
└─────────────────────────────────────────────────────────────┘
```

### **CDK Constructs for Configuration**

```
cdk/constructs/
├── ecs-workbench-construct.ts         # Dynamic multi-service deployment
├── workbench-dashboard-construct.ts   # Configuration-aware dashboard
├── msk-construct.ts                   # MSK Express cluster
├── vpc-construct.ts                   # VPC with 3 AZs
├── vpc-endpoints-construct.ts         # VPC endpoints
└── retention-policy-construct.ts     # Log retention
```
# 🛠️ Development Guide

## 🔧 **Development Setup**

### **Prerequisites**
- **Node.js** 20.9+ (22+ recommended)
- **npm** 9+ (comes with Node.js)
- **AWS CLI** configured with appropriate credentials
- **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
- **Docker** (for container builds)
- **Git** for version control

### **Initial Setup**
```bash
# Clone the repository
git clone <repository-url>
cd MskExpress

# Install dependencies
npm install

# Build all projects
npm run build

# Verify setup
npm run lint
```

## 🎛️ **Configuration Management**

### **Primary Configuration File**
```typescript
// cdk/lib/config-types.ts
export interface ServiceConfig {
  topics: number;                    // Number of topics per service
  partitionsPerTopic: number;        // Partitions per topic
  instances: number;                 // Desired instance count
  messageSizeBytes: number;          // Message payload size in bytes (1-1048576)
}

export interface DeploymentConfig {
  services: ServiceConfig[];         // Array of service configurations
}

// 🎯 CUSTOMIZE THIS FOR YOUR TESTING NEEDS
export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 }, // Service 0
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 512 },  // Service 1
    { topics: 3, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 4096 }, // Service 2
    // Add more services as needed for your tests
  ]
};
```

### **Configuration Examples for Different Test Scenarios**

#### **Single Service Testing**
```typescript
export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 3, partitionsPerTopic: 8, instances: 4, messageSizeBytes: 2048 }
  ]
};
// Use case: Simple performance baseline
```

#### **Partition Impact Testing**
```typescript
export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 1, instances: 2, messageSizeBytes: 1024 },  // Low partitions
    { topics: 1, partitionsPerTopic: 10, instances: 2, messageSizeBytes: 1024 }, // High partitions
    { topics: 1, partitionsPerTopic: 20, instances: 2, messageSizeBytes: 1024 }, // Very high partitions
  ]
};
// Use case: Analyze partition count impact on performance
```

#### **Instance Scaling Testing**
```typescript
export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 1, messageSizeBytes: 1024 },  // Minimal instances
    { topics: 2, partitionsPerTopic: 6, instances: 5, messageSizeBytes: 1024 },  // Medium instances
    { topics: 2, partitionsPerTopic: 6, instances: 10, messageSizeBytes: 1024 }, // High instances
  ]
};
// Use case: Analyze instance scaling impact
```

## 🔄 **Development Workflow**

### **Configuration-First Development**
```bash
# 1. Modify configuration for your test scenario
vim cdk/lib/config-types.ts

# 2. Validate configuration
npm run build
npm run lint

# 3. Deploy with new configuration
npm run deploy:stack

# 4. Monitor results
# Check dashboard, logs, and metrics

# 5. Iterate
# Modify configuration and repeat
```

### **Testing Different Configurations**
```bash
# Save current configuration
cp cdk/lib/config-types.ts cdk/lib/config-types.ts.backup

# Test configuration A
cat > cdk/lib/config-types.ts << 'EOF'
export const deploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 1024 }
  ]
};
EOF
npm run deploy:stack
# Monitor and record results

# Test configuration B
cat > cdk/lib/config-types.ts << 'EOF'
export const deploymentConfig = {
  services: [
    { topics: 10, partitionsPerTopic: 1, instances: 5, messageSizeBytes: 1024 }
  ]
};
EOF
npm run deploy:stack
# Monitor and record results

# Restore original
mv cdk/lib/config-types.ts.backup cdk/lib/config-types.ts
```
# 🚀 Deployment Guide

## 🎛️ **Configuration-First Deployment**

### **Step 1: Define Your Test Configuration**
```typescript
// Edit: cdk/lib/config-types.ts
export const deploymentConfig: DeploymentConfig = {
  services: [
    // Customize these for your testing needs:
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 }, // High-throughput test
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 512 },  // Latency test
    { topics: 3, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 4096 }, // Multi-topic test
    // Add more services as needed
  ]
};
```

### **Step 2: Validate Configuration**
```bash
# Validate your configuration before deployment
npm run build
node -e "
const { ConfigurationHelper } = require('./cdk/dist/lib/config-helpers');
const { deploymentConfig } = require('./cdk/dist/lib/config-types');
const result = ConfigurationHelper.validateConfiguration(deploymentConfig);
if (!result.valid) {
  console.error('❌ Configuration errors:');
  result.errors.forEach(error => console.error('  -', error));
  process.exit(1);
}
console.log('✅ Configuration is valid');
console.log('📊 Deployment Summary:');
console.log('  Services:', deploymentConfig.services.length);
console.log('  Total Instances:', ConfigurationHelper.getTotalInstances(deploymentConfig));
console.log('  Total Topics:', ConfigurationHelper.getTotalTopics(deploymentConfig));
console.log('  Total Partitions:', ConfigurationHelper.getTotalPartitions(deploymentConfig));
"
```

### **Step 3: Deploy**
```bash
# Deploy your configuration
npm run deploy:stack
```

## 📋 **Configuration Examples and Deployment Scenarios**

### **Single Service Testing**
```typescript
// Simple baseline testing
export const deploymentConfig = {
  services: [
    { topics: 3, partitionsPerTopic: 8, instances: 4, messageSizeBytes: 2048 }
  ]
};
// Deploys: 1 service, 3 topics, 24 partitions, 4 instances, 2KB messages
// Use case: Establish performance baseline
```

### **A/B Testing Configuration**
```typescript
// Compare different approaches
export const deploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 12, instances: 3, messageSizeBytes: 1024 }, // Single topic approach
    { topics: 4, partitionsPerTopic: 3, instances: 3, messageSizeBytes: 1024 },  // Multi-topic approach
    { topics: 12, partitionsPerTopic: 1, instances: 3, messageSizeBytes: 1024 }, // Many topics approach
  ]
};
// Deploys: 3 services for comparative analysis
// Use case: Topic distribution strategy testing
```

### **Message Size Analysis Configuration**
```typescript
// Test message size impact
export const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 256 },    // Small messages
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 },   // Medium messages
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 8192 },   // Large messages
  ]
};
// Deploys: 3 services with different message sizes
// Use case: Message size impact analysis
```

### **Scaling Analysis Configuration**
```typescript
// Test scaling impact
export const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 1, messageSizeBytes: 1024 },  // Minimal scaling
    { topics: 2, partitionsPerTopic: 6, instances: 5, messageSizeBytes: 1024 },  // Medium scaling
    { topics: 2, partitionsPerTopic: 6, instances: 10, messageSizeBytes: 1024 }, // High scaling
  ]
};
// Deploys: 3 services with different instance counts
// Use case: Instance scaling impact analysis
```

### **Load Testing Configuration**
```typescript
// Maximum load testing
export const deploymentConfig = {
  services: [
    { topics: 10, partitionsPerTopic: 20, instances: 15, messageSizeBytes: 1024 }, // High load
    { topics: 1, partitionsPerTopic: 1, instances: 1, messageSizeBytes: 1024 },    // Control
  ]
};
// Deploys: High-load service + control group
// Use case: Stress testing and limits discovery
```

## 🔄 **Configuration Updates and Scaling**

### **Updating Your Configuration**
```bash
# 1. Modify configuration
vim cdk/lib/config-types.ts

# 2. Validate new configuration
npm run build
node -e "/* validation script from above */"

# 3. Deploy changes
npm run deploy:stack

# 4. Monitor transition
watch -n 30 'aws ecs describe-services --cluster dev-mske-cluster --services $(aws ecs list-services --cluster dev-mske-cluster --query "serviceArns[]" --output text) --query "services[].{name:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount}"'
```

## 💰 **Cost Management by Configuration**

### **Cost Estimation**
```bash
# Estimate costs based on your configuration
node -e "
const { ConfigurationHelper } = require('./cdk/dist/lib/config-helpers');
const { deploymentConfig } = require('./cdk/dist/lib/config-types');

const totalInstances = ConfigurationHelper.getTotalInstances(deploymentConfig);
const fargateHourlyCost = totalInstances * 0.04048; // 1 vCPU + 2GB memory
const mskHourlyCost = 0.75; // MSK Express
const totalHourly = fargateHourlyCost + mskHourlyCost;

console.log('💰 Cost Estimation:');
console.log(\`  ECS Fargate: \${totalInstances} instances × $0.04048/hour = $\${fargateHourlyCost.toFixed(2)}/hour\`);
console.log(\`  MSK Express: $\${mskHourlyCost.toFixed(2)}/hour\`);
console.log(\`  Total: $\${totalHourly.toFixed(2)}/hour\`);
console.log(\`  Daily: $\${(totalHourly * 24).toFixed(2)}\`);
console.log(\`  Monthly: $\${(totalHourly * 24 * 30).toFixed(2)}\`);
"
```

## 🧹 **Cleanup and Resource Management**

### **Complete Cleanup**
```bash
# Destroy all resources
npm run destroy:stack

# Or manually
cd cdk
npx cdk destroy --force
```
# 📊 Monitoring Guide

## 🎯 **Dashboard Overview**

The workbench includes a dynamic CloudWatch dashboard that automatically adapts to your configuration:
```typescript
// From config.ts
export const deploymentConfig: DeploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 },   // 1KB messages
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 512 },    // 512B messages
    { topics: 3, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 4096 },   // 4KB messages
  ],
};
```

## ⚡ **Critical Metrics Understanding**

### **Application Metrics (What the App Sends):**
The application calculates and sends **rate metrics** every 5 seconds:

```typescript
// From metrics-service.ts
const messagesSentPerSecond = this.messagesSentCount / intervalSeconds;
const messagesReceivedPerSecond = this.messagesReceivedCount / intervalSeconds;

// Sent to CloudWatch as:
{
  MetricName: 'MessagesSentPerSecond',
  Value: messagesSentPerSecond,        // Already calculated as per-second
  Unit: 'Count/Second',
  Dimensions: [
    { Name: 'Service', Value: 'dev-mske-service-0' },
    { Name: 'Environment', Value: process.env.NODE_ENV || 'development' }
  ]
}
```

### **Dashboard Display (Environment-Agnostic):**
- **Statistic**: `AVERAGE` (not SUM) - because values are already rates
- **Period**: 1 minute aggregation
- **Units**: Messages/Second, Milliseconds
- **Environment**: **REMOVED** - works with any environment (dev/prod/test)

## 📈 **Dashboard Sections**

### **1. MSK Express Cluster Health**
- **Broker Status**: Per-broker health metrics
- **Network Throughput**: Bytes in/out per broker (MSK native metrics)
- **CPU & Memory**: Resource utilization per broker
- **Connection Count**: Active connections per broker

### **2. Service Performance (Application Metrics)**
- **Throughput Comparison**: Side-by-side service performance
- **Message Rates**: Producer and consumer rates (Messages/Second)
- **Latency Analysis**: End-to-end message delivery times (Milliseconds)
- **Message Size Impact**: Performance by payload size

### **3. Topic & Partition Metrics**
- **Topic Throughput**: Messages per topic
- **Partition Balance**: Load distribution
- **Consumer Group Lag**: Message backlog tracking

### **4. Resource Utilization**
- **ECS Task Metrics**: CPU, memory, network
- **Container Insights**: Task-level performance
- **Network Metrics**: VPC endpoint usage

## 🔍 **Available Metrics**

### **MSK Express Metrics (AWS Native):**
```plaintext
BytesInPerSec          - Incoming bytes rate (per broker)
BytesOutPerSec         - Outgoing bytes rate (per broker)
MessagesInPerSec       - Message ingestion rate (per broker)
CpuUser               - CPU utilization (user) (per broker)
CpuSystem            - CPU utilization (system) (per broker)
CpuIdle              - CPU idle percentage (per broker)
MemoryUsed           - Memory consumption (per broker)
NetworkRxPackets     - Network packets received (per broker)
NetworkTxPackets     - Network packets sent (per broker)
```

### **Application Metrics (Custom):**
```plaintext
MessagesSentPerSecond     - Producer rate (per service) - Unit: Count/Second
MessagesReceivedPerSecond - Consumer rate (per service) - Unit: Count/Second
MessageLatencyAverage     - Average latency (per service) - Unit: Milliseconds
MessageLatencyP95         - P95 latency (per service) - Unit: Milliseconds
MessageLatencyP99         - P99 latency (per service) - Unit: Milliseconds
TotalMessagesSent         - Cumulative count (per service) - Unit: Count
TotalMessagesReceived     - Cumulative count (per service) - Unit: Count
```

### **ECS Service Metrics (AWS Native):**
```plaintext
CPUUtilization       - Task CPU usage (per service)
MemoryUtilization    - Task memory usage (per service)
NetworkRxBytes       - Network bytes received (per service)
NetworkTxBytes       - Network bytes transmitted (per service)
RunningTaskCount     - Active tasks (per service)
PendingTaskCount     - Tasks waiting to start (per service)
```

## ⚡ **Real-time Monitoring**

### **1. Service Health Check:**
```bash
# Check ECS service status
aws ecs describe-services \
  --cluster dev-mske-cluster \
  --services dev-mske-service-0 dev-mske-service-1 dev-mske-service-2
```

### **2. Broker Health Check:**
```bash
# Check MSK broker status
aws kafka list-nodes \
  --cluster-arn "arn:aws:kafka:us-east-1:878004393455:cluster/dev-mske-express-cluster/*"
```

### **3. CloudWatch Logs:**
```plaintext
/aws/ecs/workbench/dev-mske-service-0  - Service 0 logs
/aws/ecs/workbench/dev-mske-service-1  - Service 1 logs
/aws/ecs/workbench/dev-mske-service-2  - Service 2 logs
```

### **4. Live Metrics Query:**
```bash
# Get current throughput metrics
aws cloudwatch get-metric-statistics \
  --namespace "MSKExpress/Kafka" \
  --metric-name "MessagesSentPerSecond" \
  --dimensions Name=Service,Value=dev-mske-service-0 Name=Environment,Value=development \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

## 📊 **Performance Analysis**

### **1. Throughput Analysis:**
- **Expected Range**: 100-10,000 messages/second per service
- **Factors**: Message size, partition count, instance count
- **Optimization**: Increase partitions for higher throughput

### **2. Latency Analysis:**
- **Expected Range**: 1-50ms end-to-end latency
- **Factors**: Message size, network conditions, processing time
- **Optimization**: Reduce message size, increase instances

### **3. Resource Analysis:**
- **CPU**: Should be < 70% average
- **Memory**: Should be < 80% average
- **Network**: Monitor for bottlenecks

## 🚨 **Alerting**

### **Recommended Alarms:**
1. **High Latency**: MessageLatencyAverage > 100ms
2. **Low Throughput**: MessagesSentPerSecond < expected baseline
3. **High CPU**: ECS CPU > 80%
4. **Task Failures**: RunningTaskCount < DesiredCount
# 📏 Message Size Configuration Guide

## 🎯 **Message Size Configuration Overview**

The workbench supports configurable message sizes from **1 byte to 1MB** per message, allowing you to:

- **Test throughput impact** of different message sizes
- **Analyze latency variations** across payload sizes
- **Compare network efficiency** of small vs large messages
- **Optimize for your use case** based on real performance data

## 📊 **Message Size Testing Scenarios**

### **1. Message Size Impact Analysis**
Test how message size affects performance with identical configurations:

```typescript
export const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 100 },    // 100B - Tiny
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1024 },   // 1KB - Small
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 10240 },  // 10KB - Medium
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 102400 }, // 100KB - Large
  ]
};
```

**Expected Results:**
- **Tiny messages (100B)**: Highest throughput (msg/sec), lowest latency
- **Small messages (1KB)**: Balanced throughput and latency
- **Medium messages (10KB)**: Moderate throughput, increased latency
- **Large messages (100KB)**: Lowest throughput, highest latency

### **2. Throughput vs Message Size**
Find the optimal message size for maximum throughput:

```typescript
export const deploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 64 },     // 64B
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 256 },    // 256B
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 1024 },   // 1KB
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 4096 },   // 4KB
    { topics: 1, partitionsPerTopic: 10, instances: 5, messageSizeBytes: 16384 },  // 16KB
  ]
};
```

### **3. Network Efficiency Testing**
Compare network utilization of different message size strategies:

```typescript
export const deploymentConfig = {
  services: [
    { topics: 10, partitionsPerTopic: 2, instances: 3, messageSizeBytes: 512 },   // Many small messages
    { topics: 2, partitionsPerTopic: 2, instances: 3, messageSizeBytes: 2560 },   // Few large messages (same total data)
  ]
};
```

### **4. Latency Optimization**
Find the message size that minimizes end-to-end latency:

```typescript
export const deploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 32 },     // Ultra-small
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 128 },    // Very small
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 512 },    // Small
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 2048 },   // Medium
  ]
};
```

### **5. Real-World Payload Testing**
Test with message sizes that match your actual use case:

```typescript
export const deploymentConfig = {
  services: [
    { topics: 3, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 256 },    // IoT sensor data
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 2048 },   // User events
    { topics: 1, partitionsPerTopic: 8, instances: 4, messageSizeBytes: 8192 },   // Log entries
    { topics: 1, partitionsPerTopic: 4, instances: 2, messageSizeBytes: 32768 },  // File chunks
  ]
};
```

## 🎯 **Message Size Limits and Validation**

### **Supported Range**
- **Minimum**: 1 byte
- **Maximum**: 1,048,576 bytes (1MB)
- **Recommended**: 1KB - 64KB for most use cases

### **Validation Rules**
The system validates message size configuration:

```typescript
// Automatic validation during deployment
if (messageSizeBytes < 1 || messageSizeBytes > 1048576) {
  throw new Error('Message size must be between 1 and 1,048,576 bytes (1MB)');
}
```

## 📈 **Performance Characteristics by Message Size**

### **Expected Performance Patterns**

#### **Small Messages (< 1KB)**
- **Throughput**: Very high (messages/second)
- **Latency**: Very low (< 10ms)
- **Network**: High packet overhead
- **CPU**: Higher serialization overhead per byte
- **Use Cases**: IoT sensors, simple events, counters

#### **Medium Messages (1KB - 10KB)**
- **Throughput**: High (balanced)
- **Latency**: Low (10-50ms)
- **Network**: Balanced efficiency
- **CPU**: Optimal serialization efficiency
- **Use Cases**: User events, API payloads, structured data

#### **Large Messages (10KB - 100KB)**
- **Throughput**: Moderate (fewer messages/second)
- **Latency**: Moderate (50-200ms)
- **Network**: High efficiency per message
- **CPU**: Lower overhead per byte
- **Use Cases**: Document processing, batch data, file transfers

#### **Very Large Messages (100KB - 1MB)**
- **Throughput**: Low (limited by network/disk)
- **Latency**: High (200ms+)
- **Network**: Maximum efficiency per message
- **CPU**: Minimal overhead per byte
- **Use Cases**: File chunks, images, large documents

## 🎯 **Best Practices**

### **Message Size Selection**
1. **Start with 1KB**: Good baseline for most applications
2. **Test your actual payloads**: Use realistic message sizes
3. **Consider network constraints**: Smaller messages for high-latency networks
4. **Balance throughput vs latency**: Optimize for your primary metric

### **Testing Strategy**
1. **Baseline testing**: Single message size across all services
2. **Comparative analysis**: Multiple sizes with identical configurations
3. **Real-world simulation**: Mix of sizes matching your use case
4. **Edge case testing**: Very small and very large messages

### **Configuration Tips**
```typescript
// Good: Clear message size progression
const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 512 },   // 0.5KB
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 2048 },  // 2KB
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 8192 },  // 8KB
  ]
};

// Avoid: Random message sizes without clear testing purpose
const deploymentConfig = {
  services: [
    { topics: 2, partitionsPerTopic: 6, instances: 3, messageSizeBytes: 1337 },  // Unclear purpose
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 9999 },  // Random size
  ]
};
```

## 🚀 **Getting Started**

### **1. Define Your Test Scenario**
```typescript
// Example: Test message size impact on latency
export const deploymentConfig = {
  services: [
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 256 },   // Small
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 1024 },  // Medium
    { topics: 1, partitionsPerTopic: 3, instances: 1, messageSizeBytes: 4096 },  // Large
  ]
};
```

### **2. Deploy and Monitor**
```bash
# Deploy your configuration
npm run deploy:stack

# Monitor results in dashboard
# Compare latency metrics across services
```

### **3. Analyze Results**
- Compare throughput (messages/second) across services
- Analyze latency patterns (average, P95, P99)
- Monitor resource utilization (CPU, memory, network)
- Document findings for your use case

### **4. Iterate and Optimize**
- Adjust message sizes based on results
- Test edge cases and boundary conditions
- Validate with production-like workloads
- Document optimal configurations for your use case

---

The message size configuration feature enables comprehensive testing of how payload size impacts Kafka performance, helping you optimize your streaming applications for your specific requirements.
