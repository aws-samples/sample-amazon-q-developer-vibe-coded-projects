/**
 * Workbench Dashboard Construct
 * Creates a CloudWatch dashboard for monitoring MSK Express performance
 */

import { Construct } from 'constructs';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import { Duration } from 'aws-cdk-lib';
import { Config } from '../lib/config';
import { DeploymentConfig } from '../lib/config-types-and-helpers';
import { WorkingClusterWidgets } from './dashboard-widgets/working-cluster-widgets';
import { ApplicationWidgets } from './dashboard-widgets/application-widgets';
import { DashboardLayout } from './dashboard-widgets/dashboard-layout';

export class WorkbenchDashboardConstruct extends Construct {
  public readonly dashboard: Dashboard;

  constructor(scope: Construct, deploymentConfig: DeploymentConfig) {
    super(scope, 'WorkbenchDashboardConstruct');

    const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

    // Create CloudWatch Dashboard (update existing one)
    this.dashboard = new Dashboard(this, 'WorkbenchDashboard', {
      dashboardName: Config.getResourceName('workbench-dashboard'),
      defaultInterval: Duration.minutes(1), // Set auto-refresh to 1 minute
    });

    // Calculate totals for header
    const totalServices = deploymentConfig.services.length;
    const totalInstances = deploymentConfig.services.reduce((sum, service) => sum + service.instances, 0);
    const totalTopics = deploymentConfig.services.reduce((sum, service) => sum + service.topics, 0);

    // 1. DASHBOARD HEADER
    this.dashboard.addWidgets(DashboardLayout.createMainHeader(totalServices, totalInstances, totalTopics, region));

    // 2. WORKING CLUSTER SECTION
    this.dashboard.addWidgets(WorkingClusterWidgets.createSectionHeader());
    
    // Row 1: CpuUser, CpuSystem, CpuIdle
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow1());
    
    // Row 2: MemoryUsed, MemoryFree, MemoryCached
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow2());
    
    // Row 3: BytesInPerSec, BytesOutPerSec
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow3());
    
    // Row 4: MessagesInPerSec
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow4());
    
    // Row 5: NetworkRxDropped, NetworkRxErrors, NetworkRxPackets
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow5());
    
    // Row 6: NetworkTxDropped, NetworkTxErrors, NetworkTxPackets
    this.dashboard.addWidgets(WorkingClusterWidgets.createRow6());

    // 3. CONSUMER LAG MONITORING SECTION (moved to match new organization)
    // This section is now handled in the Application Performance section below

    // 4. APPLICATION PERFORMANCE SECTION
    this.dashboard.addWidgets(ApplicationWidgets.createSectionHeader());
    
    // Performance Summary
    this.dashboard.addWidgets(DashboardLayout.createPerformanceSummary(deploymentConfig));
    
    // Service Throughput Comparison (now returns array of rows with combined layout)
    const throughputRows = ApplicationWidgets.createServiceThroughputComparison(region, deploymentConfig);
    throughputRows.forEach(row => this.dashboard.addWidgets(row));

    // 5. INDIVIDUAL SERVICES SECTION
    this.dashboard.addWidgets(ApplicationWidgets.createIndividualServicesSectionHeader());
    
    // Individual Service Performance (now dynamic for all services)
    const servicePerformanceRows = ApplicationWidgets.createServicePerformanceRow(deploymentConfig);
    servicePerformanceRows.forEach(row => this.dashboard.addWidgets(row));

    // 6. MESSAGE SIZE ANALYSIS SECTION
    this.dashboard.addWidgets(ApplicationWidgets.createMessageSizeAnalysisSectionHeader());
    
    // Message Size Impact Analysis (now returns array of rows)
    const messageSizeRows = ApplicationWidgets.createMessageSizeAnalysis(region, deploymentConfig);
    messageSizeRows.forEach(row => this.dashboard.addWidgets(row));

    // 7. COMPREHENSIVE FOOTER
    this.dashboard.addWidgets(DashboardLayout.createFooter(deploymentConfig));
  }
}
