# Dashboard Widgets Module

This directory contains modular dashboard widget components for the MSK Express Kafka Performance Workbench monitoring dashboard.

## 📁 File Structure

```
dashboard-widgets/
├── README.md                      # This documentation
├── index.ts                       # Module exports
├── msk-cluster-widgets.ts         # MSK Express cluster infrastructure widgets
├── application-widgets.ts         # Application performance monitoring widgets
├── advanced-metrics-widgets.ts    # Consumer lag and advanced Kafka metrics
└── dashboard-layout.ts           # Headers, footers, and layout components
```

## 🏗️ Architecture

### **Modular Design Benefits**
- **Maintainability**: Each widget type is in its own file
- **Reusability**: Widgets can be reused across different dashboards
- **Testability**: Individual widget modules can be tested independently
- **Scalability**: Easy to add new widget types without affecting existing ones

### **Widget Categories**

#### 1. **MSK Cluster Widgets** (`msk-cluster-widgets.ts`)
Infrastructure monitoring for MSK Express cluster:
- **Cluster Overview**: Throughput, message rates, cluster status
- **Broker Resources**: CPU usage (user/system), memory usage (used/free)
- **Broker Details**: Partition distribution, leader balance, client connections
- **Network I/O**: Packet rates, network errors, dropped packets

#### 2. **Application Widgets** (`application-widgets.ts`)
Workbench application performance monitoring:
- **Service Throughput**: Producer/consumer rates comparison
- **Individual Performance**: Per-service detailed metrics
- **Latency Analysis**: Average and P95 latency across services
- **Message Size Impact**: Performance analysis by payload size
- **Consumer Health**: Lag monitoring and processing efficiency

#### 3. **Advanced Metrics Widgets** (`advanced-metrics-widgets.ts`)
Deep Kafka metrics and consumer health:
- **Consumer Lag**: Offset lag and time lag monitoring
- **Broker Performance**: Request handlers, network processors, queue sizes
- **Replication Metrics**: Inter-broker replication throughput
- **Connection Management**: Connection creation/close rates, TCP connections
- **Storage Monitoring**: Disk usage and partition health

#### 4. **Dashboard Layout** (`dashboard-layout.ts`)
Layout and informational components:
- **Headers**: Main dashboard header with summary statistics
- **Footers**: Comprehensive documentation and configuration details
- **Section Dividers**: Visual separation between dashboard sections
- **Performance Summary**: Configuration overview and expected performance

## 🎯 **Dashboard Structure**

The complete dashboard is organized into these sections:

### **1. Header Section**
- Dashboard title and last updated timestamp
- Service count, instance count, topic count summary
- Region and refresh interval information

### **2. MSK Express Cluster Infrastructure**
- **Row 1**: Cluster throughput, message rates, cluster status
- **Row 2**: Per-broker CPU and memory usage
- **Row 3**: Partition distribution, leader balance, client connections
- **Row 4**: Network I/O monitoring and error tracking

### **3. Application Performance Metrics**
- **Performance Summary**: Configuration overview
- **Row 1**: Service throughput comparison (all services)
- **Row 2**: Individual service performance widgets
- **Row 3**: Service latency comparison (average and P95)
- **Row 4**: Message size impact analysis

### **4. Advanced Kafka Metrics**
- **Row 1**: Consumer lag monitoring per service
- **Row 2**: Time lag analysis per service
- **Row 3**: Broker performance (handlers, processors, queues)
- **Row 4**: Replication and connection management
- **Row 5**: Storage usage and partition health

### **5. Footer Section**
- Comprehensive configuration summary
- Performance targets and thresholds
- Monitoring and alerting information
- Architecture and technology stack details

## 🔧 **Usage Examples**

### **Adding a New Widget**
```typescript
// In your widget file (e.g., custom-widgets.ts)
export class CustomWidgets {
  static createMyCustomWidget(): GraphWidget {
    return new GraphWidget({
      title: 'My Custom Metric',
      // ... widget configuration
    });
  }
}

// In the main dashboard construct
import { CustomWidgets } from './dashboard-widgets/custom-widgets';

// Add to dashboard
this.dashboard.addWidgets(CustomWidgets.createMyCustomWidget());
```

### **Modifying Existing Widgets**
```typescript
// Edit the appropriate widget file
// For MSK metrics: msk-cluster-widgets.ts
// For app metrics: application-widgets.ts
// For advanced metrics: advanced-metrics-widgets.ts
// For layout: dashboard-layout.ts
```

### **Creating Widget Variations**
```typescript
// Example: Create a simplified cluster overview
static createSimplifiedClusterOverview(): Row {
  return new Row(
    // Simplified widgets with fewer metrics
  );
}
```

## 📊 **Metrics Coverage**

### **MSK Express Cluster Metrics**
- **Throughput**: `BytesInPerSec`, `BytesOutPerSec`, `MessagesInPerSec`
- **Resource Usage**: `CpuUser`, `CpuSystem`, `MemoryUsed`, `MemoryFree`
- **Cluster Health**: `GlobalTopicCount`, `GlobalPartitionCount`, `ActiveControllerCount`
- **Broker Details**: `PartitionCount`, `LeaderCount`, `ClientConnectionCount`
- **Network**: `NetworkRxPackets`, `NetworkTxPackets`, `NetworkRxErrors`, `NetworkTxErrors`

### **Application Metrics**
- **Throughput**: `MessagesSentPerSecond`, `MessagesReceivedPerSecond`
- **Latency**: `MessageLatencyAverage`, `MessageLatencyP95`
- **Custom Metrics**: Service-specific performance indicators

### **Advanced Kafka Metrics**
- **Consumer Lag**: `MaxOffsetLag`, `SumOffsetLag`, `EstimatedMaxTimeLag`
- **Broker Performance**: `RequestHandlerAvgIdlePercent`, `NetworkProcessorAvgIdlePercent`
- **Queue Sizes**: `RequestThrottleQueueSize`, `ProduceThrottleQueueSize`, `FetchThrottleQueueSize`
- **Replication**: `ReplicationBytesInPerSec`, `ReplicationBytesOutPerSec`
- **Storage**: `StorageUsed`, `UserPartitionExists`

## 🚀 **Best Practices**

### **Widget Development**
1. **Single Responsibility**: Each widget should focus on one specific metric or related group
2. **Consistent Styling**: Use consistent colors and formatting across widgets
3. **Meaningful Labels**: Provide clear, descriptive labels for all metrics
4. **Appropriate Aggregation**: Choose the right statistic (SUM, AVERAGE, MAX) for each metric

### **Performance Considerations**
1. **Metric Periods**: Use appropriate time periods (1 min for real-time, 5 min for trends)
2. **Widget Sizing**: Balance information density with readability
3. **Color Coding**: Use consistent color schemes for related metrics
4. **Update Frequency**: Set reasonable refresh intervals to balance freshness with cost

### **Maintenance**
1. **Documentation**: Keep widget documentation up to date
2. **Testing**: Test widgets with different data scenarios
3. **Monitoring**: Monitor dashboard performance and loading times
4. **Feedback**: Collect user feedback for continuous improvement

## 🔍 **Troubleshooting**

### **Common Issues**
1. **Missing Metrics**: Ensure MSK Enhanced Monitoring is enabled
2. **No Data**: Check that services are running and producing metrics
3. **Permission Errors**: Verify CloudWatch permissions for metric access
4. **Widget Errors**: Check metric names and dimension mappings

### **Debug Steps**
1. Check CloudWatch Logs for application errors
2. Verify metric availability in CloudWatch console
3. Test individual widgets in isolation
4. Review IAM permissions for CloudWatch access

---

**Built with AWS CDK, CloudWatch, and TypeScript for the MSK Express Kafka Performance Workbench**
